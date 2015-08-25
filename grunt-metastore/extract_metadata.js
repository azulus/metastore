var fs = require('fs');
var path = require('path');
var recast = require('recast');
var exec = require('child_process').exec;
var Promise = require('es6-promise').Promise;

var MetaStore = require('./meta/lib/MetaStore');

module.exports = function (grunt, configOnly, dirs) {
  if (!configOnly) {
    grunt.task.registerMultiTask('extract_metadata', 'Extracts metadata from source code', function() {
        var done = this.async();
        var taskName = this.target;

        var command = this.data.command;
        var runCommand = function (filename) {
            return new Promise(function (resolve, reject) {
                exec(command.replace(/\{\{\s*filename\s*\}\}/g, filename), function (err, stdout, stderr) {
                    if (stderr) {
                        reject(new Error(stderr));
                    } else if (err) {
                        reject(err);
                    } else {
                        resolve(JSON.parse(stdout));
                    }
                });
            });
        };

        var extractorPromises = [];

        this.files.forEach(function (file) {
            var store = new MetaStore();
            var dest = file.dest;
            // try {
            //     store.import(fs.readFileSync(file.dest, 'utf8'));
            // } catch (e) {
            //     console.warn(e.message);
            // }
            var filePromises = [];

            var writeMetadata = function () {
                console.log('EXPORTING', store.export());
                done();
            }

            file.src.forEach(function (srcFile) {
                var src = srcFile;

                // find all references to P.whatever.doSomething() and convert to:
                // var whatever = require('P.whatever'); assert.equal(whatever, P.whatever); whatever.doSomething()
                filePromises.push(runCommand(src).then(function (data) {
                    store.addData(taskName, path.relative(dirs['IN'], src), data);
                }));
            });

            extractorPromises.push(Promise.all(filePromises).then(function () {
                console.log('WRITING METADATA TO', file.dest);
                fs.writeFileSync(file.dest, store.export());
            }));
        })

        Promise.all(extractorPromises).then(function (data) {
            done();
        }, function (err) {
            grunt.log.error(err);
        });
    });
  }(function(){
    var obj = {};
    obj[path.join(dirs['BUILD'], 'metadata.json')] = [
      path.join(dirs['IN'], '**', '*.js')
    ];
    return obj;
  }())


      return {
          'extract_metadata': {
              'P_namespace_references': {
                  command: 'node ' + path.join(dirs['EXTRACTORS'], 'P_namespace_references.js') + ' {{ filename }}',
                  files: [
                      {
                          src: path.join(dirs['IN'], '**', '*.js'),
                          dest: path.join(dirs['BUILD'], 'metadata.json')
                      }
                  ]
              }
          }
      };
};
