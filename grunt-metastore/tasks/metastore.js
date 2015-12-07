var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var Promise = require('es6-promise').Promise;

var MetaStore = require('metastore').MetaStore;

var numCPUs = require('os').cpus().length;

/**
 * Wraps promise generators in a queuing function
 * @param  {Function} fn
 * @param  {number}   maxSimultaneous
 * @return {Promise}
 */
var enqueuePromiseGenerator = function (fn, maxSimultaneous) {
    var runQueue = [];
    var numRunning = 0;

    /**
     * Runs the next promise generator in the queue
     */
    var runNext = function() {
        if (numRunning >= maxSimultaneous) {
            return;
        }

        if (runQueue.length === 0) {
            return;
        }
        process.stdout.write('.');

        // run the next in the queue
        numRunning++;
        var next = runQueue.shift();
        var fnPromise = fn.apply(next.scope, next.args);
        fnPromise.then(function () {
            numRunning--;
            process.nextTick(runNext);
        });

        fnPromise.then(function (data){
            next.resolve(data);
        }, function(err) {
            next.reject(data);
        });
    };

    /**
     * Creates a proxied promise generator function around the original promise
     * generator
     * @param {...*} var_args
     * @return {Promise}
     */
    return function(var_args) {
        var queuedItem = {
            scope: this,
            args: arguments,
            promise: null,
            resolve: null,
            reject: null
        };

        queuedItem.promise = new Promise(function (resolve, reject) {
            queuedItem.resolve = resolve;
            queuedItem.reject = reject;
        });
        runQueue.push(queuedItem);

        runNext();

        return queuedItem.promise;
    };
};

module.exports = function(grunt) {
    grunt.task.registerMultiTask('extract_metadata', 'Extracts metadata from source code', function() {
        var done = this.async();
        var taskName = this.target;

        var relativeRoot = this.data.relativeRoot || process.cwd();
        var command = this.data.command;
        var strCommand = command.join(' ');
        var commandFile = command[1];

        /**
         * Get a filename relative to the root of the extraction task
         * @param  {string} filename
         * @return {string}
         */
        var getRelativeFilename = function (filename) {
            return path.relative(relativeRoot, filename);
        };

        var relativeCommandFile = getRelativeFilename(commandFile);
        var extractorPromises = [];

        this.files.forEach(function (file) {
            // iterate through each file glob, extract metadata, and write to
            // output store
            var currentMTimePromises = {};
            var currentMTimes = {};
            var previousMTimes = {};

            /**
             * Gets the mtime for a file
             * @param  {String} filename
             * @return {Promise.<number>}
             */
            var getFileMTime = function (filename) {
                if (!currentMTimePromises[filename]) {
                    currentMTimePromises[filename] = new Promise(function (resolve, reject) {
                        fs.stat(filename, function (err, data) {
                            if (err) {
                                reject(err);
                            } else {
                                var relativeFilename = path.relative(relativeRoot, filename);
                                currentMTimes[relativeFilename] = data.mtime.getTime();
                                resolve(currentMTimes[relativeFilename]);
                            }
                        });
                    });
                }
                return currentMTimePromises[filename];
            };

            /**
             * Runs the current extractor against a given filename
             * @param  {string} filename
             * @return {Object} free-form extractor data
             */
            var runExtractor = function (filename, relativeFilename) {
                var mTimePromise = Promise.all([getFileMTime(commandFile), getFileMTime(filename)]);
                return mTimePromise.then(function (mtimes) {

                    if (previousMTimes[relativeFilename] && currentMTimes[relativeFilename] === previousMTimes[relativeFilename] &&
                            previousMTimes[relativeCommandFile] && currentMTimes[relativeCommandFile] === previousMTimes[relativeCommandFile]) {
                        // use a cached version of the extracted data
                        return new Promise(function (resolve, reject) {
                            resolve(store.getData(taskName, relativeFilename));
                        });
                    } else {
                        // re-extract the data
                        return new Promise(function (resolve, reject) {
                            exec(strCommand.replace(/\{\{\s*filename\s*\}\}/g, filename), function (err, stdout, stderr) {
                                // use stderr as a way of outputting debugging data from extractor
                                if (stderr) {
                                    console.log(stderr);
                                } else if (err) {
                                    reject(err);
                                } else {
                                    process.stdout.write(".");
                                    resolve(JSON.parse(stdout));
                                }
                            });
                        });
                    }
                });
            };

            // initialize and import the store if it exists
            var store = new MetaStore();
            try {
                store.import(fs.readFileSync(file.dest, 'utf8'));
                var caches = store.query('MTimeCache{cache}');
                if (caches && caches.length) {
                    previousMTimes = caches[0].cache || {};
                }
            } catch (e) {
                console.warn(e.message);
            }

            // wrap the extractors in a queuing function to make the computer happy
            var numExtractors = Math.max(numCPUs - 1, 1);
            var runExtractorEnqueued = enqueuePromiseGenerator(runExtractor, numExtractors);

            // generate a promise for each source file in this extractor
            var filePromises = file.src.map(function (srcFile) {
                var relativeFilename = getRelativeFilename(srcFile);
                return runExtractorEnqueued(srcFile, relativeFilename).then(function (data) {
                    store.addData(taskName, relativeFilename, data);
                });
            });

            // generate a promise for writing to the dest file
            extractorPromises.push(Promise.all(filePromises).then(function () {
                // remove unused data
                for (var key in previousMTimes) {
                    if (!currentMTimes[key]) {
                        var relativeFilename = getRelativeFilename(key);
                        store.removeFile(key);
                    }
                }

                // add mtime cache data
                var mtimeCache = {};
                store.addData(taskName, '__metadata', [{
                    type: 'MTimeCache',
                    id: taskName,
                    cache: currentMTimes
                }]);

                fs.writeFileSync(file.dest, store.export());
            }));
        });

        // wait for all dest file writing promises to complete
        Promise.all(extractorPromises).then(function (data) {
            done();
        }, function (err) {
            grunt.log.error(err);
        });
    });
};
