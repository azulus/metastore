var _ = require('lodash');

var GraphQL = require('./GraphQL.js');
var Util = require('./Util.js');

var MultiMetaStore = function(stores) {
    this._stores = stores;
};

MultiMetaStore.prototype.export = function () {
    throw new Error('MultiMetaStore is unable to export data, export from individual metastores');
}

MultiMetaStore.prototype.import = function (data) {
    throw new Error('MultiMetaStore is unable to import data, import into individual metastores');
}

MultiMetaStore.prototype.addData = function (extractorName, fileName, data) {
    throw new Error('MultiMetaStore is immutable, call addData() on MetaStore instances instead');
};

MultiMetaStore.prototype.getExtractors = function () {
    return this._stores.map(function (store) {
        return store.getExtractors();
    }).flatten().val();
};

MultiMetaStore.prototype.getFiles = function () {
    return this._stores.map(function (store) {
        return store.getFiles();
    }).flatten().val();
};

MultiMetaStore.prototype.removeExtractor = function (extractorName) {
    throw new Error('MultiMetaStore is immutable, call removeExtractor() on MetaStore instances instead');
};

MultiMetaStore.prototype.removeFile = function (fileName) {
    throw new Error('MultiMetaStore is immutable, call removeFile() on MetaStore instances instead');
};

MultiMetaStore.prototype.query = function (queryString) {
    var query = GraphQL.parse(queryString);
    
    if (!query.hasChild('id')) {
        throw new Error('id is a required response field for MultiMetaStore queries');
    }

    if (!query.hasChild('type')) {
        throw new Error('type is a required response field for MultiMetaStore queries');
    }

    var results = _.flatten(this._stores.map(function (store) {
        return store.query(query, true);
    }).filter(function (data) {
        return data !== undefined;
    }));

    return Util.compressData({'all_extractors': {'all_files': results}}, 2)[query.getType()];
};

module.exports = MultiMetaStore;
