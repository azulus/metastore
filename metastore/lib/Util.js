var _ = require('lodash');

module.exports.compressData = function(rawData, layers) {
    var compressedData = {};
    var typeMap = {};

    for (var extractorName in rawData) {
        var extractorData = rawData[extractorName];
        for (var sourceFile in extractorData) {
            var data = extractorData[sourceFile];

            for (var i = 0; i < data.length; i++) {
              var item = data[i];
              if (typeMap[item.type] === undefined) {
                typeMap[item.type] = {};
              }
              if (typeMap[item.type][item.id] === undefined) {
                typeMap[item.type][item.id] = {};
              }
              typeMap[item.type][item.id] = _.merge(typeMap[item.type][item.id], item, function(a, b) {
                if (_.isArray(a)) {
                  return a.concat(b);
                }
              });
            }
        }
    }

    for (var key in typeMap) {
      compressedData[key] = [];
      for (var subKey in typeMap[key]) {
        compressedData[key].push(typeMap[key][subKey]);
      }
      compressedData[key].sort(function (a, b) {
         if (a.id === b.id) return 0;
         return a.id > b.id ? 1 : -1;
      });
    }

    return compressedData;
}
