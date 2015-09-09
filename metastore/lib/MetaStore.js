var _ = require('lodash');
var GraphQL = require('./GraphQL');
var GraphQLFilter = require('./GraphQLFilter');
var Util = require('./Util');

var MetaStore = function() {
    this._rawData = {};
};

MetaStore.prototype.export = function () {
    return JSON.stringify(this._rawData, null, 2);
}

MetaStore.prototype.import = function (data) {
    this._rawData = JSON.parse(data);
    this._resetCompile();
}

MetaStore.prototype.addData = function (extractorName, fileName, data) {
    if (this._rawData[extractorName] === undefined) {
        this._rawData[extractorName] = {};
    }
    this._rawData[extractorName][fileName] = data;
    this._resetCompile();
};

MetaStore.prototype.getData = function (extractorName, fileName) {
    if (!this._rawData[extractorName]) return []
    return this._rawData[extractorName][fileName] || [];
};

MetaStore.prototype.getExtractors = function () {
    return Object.keys(this._rawData);
};

MetaStore.prototype.getFiles = function () {
    var fileNameMap = {};
    for (var key in this._rawData) {
        for (var fileName in this._rawData[key]) {
            fileNameMap[fileName] = true;
        }
    }
    return Object.keys(fileNameMap);
};

MetaStore.prototype.removeExtractor = function (extractorName) {
    delete this._rawData[extractorName];
    this._resetCompile();
};

MetaStore.prototype.removeFile = function (fileName) {
    for (var key in this._rawData) {
        delete this._rawData[key][fileName];
    }
    this._resetCompile();
};

MetaStore.prototype.query = function (queryString, isParsed) {
    var compiled = this._getCompiled();
    var query = isParsed ? queryString : GraphQL.parse(queryString);
    return GraphQLFilter.filter(compiled[query.getType()], query);
};

MetaStore.prototype._getCompiled = function () {
    if (this._compiled === undefined) {
        this._compiled = Util.compressData(this._rawData);
    }

    return this._compiled;
};

MetaStore.prototype._resetCompile = function () {
    this._compiled = undefined;
};

module.exports = MetaStore;
