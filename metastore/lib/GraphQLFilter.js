//TODO(tuanderful): implement modifiers
var constructRegex = function(str) {
    var expression = str.substr(1, str.length-2);
    return new RegExp(expression);
};

var getChainEvaluator = function (chain) {
    var state = {};
    return function(obj) {
        if (chain === undefined) return true;
        var arg,
            found;

        for (var i = 1; i < chain.length; i++) {
            var step = chain[i];

            switch(step.key) {
                case "id":
                    found = false;
                    for (var j = 0; j < step.args.length; j++) {
                        arg = step.args[j];

                        if ((arg === obj.id) ||
                            (arg.match(/^\/.*\/$/) && obj.id.match(constructRegex(arg)))) {

                            found = true;
                        }
                    }
                    if (!found) {
                        return false;
                    }
                    break;
                case "with":
                    if (obj[step.args[0]] !== step.args[1]) {
                        return false;
                    }
                    break;
                default:
                    throw new Error('unknown filter: ' + step.key);
            }
        }
        return true;
    };
};

var resolveQuery = function (sourceObj, query) {
    var i, response, destObj;
    var chain = query.getChain();
    var chainEvaluator = getChainEvaluator(chain);

    if (Array.isArray(sourceObj)) {
      // process each item individually if this is an array
      destObj = [];
      for (i = 0; i < sourceObj.length; i++) {
        if (chainEvaluator(sourceObj[i])) {
          response = resolveQuery(sourceObj[i], query);
          if (response !== undefined) {
            destObj.push(response);
          }
        }
      }
      return destObj;

    } else if (typeof sourceObj === 'object' && chainEvaluator(sourceObj)){
      // filter an actual object
      destObj = {};

      var queryFields = query.getChildKeys();
      if (!queryFields.length) {
          return sourceObj;
      }

      for (i = 0; i < queryFields.length; i++) {
        var pairs = [];
        var queryField = queryFields[i];
        var fieldRequests = query.getChildren(queryField);

        for (var j = 0; j < fieldRequests.length; j++) {
          var request = fieldRequests[j];
          var srcChildren = sourceObj[queryField];

          response = resolveQuery(srcChildren, request);
          if (response !== undefined) {
            destObj[queryField] = response;
          }
        }

      }

      return destObj;

    } else {
      // handle primitive types
      return sourceObj;
    }
};

var filter = function (obj, query) {
    return resolveQuery(obj, query);
};

module.exports.filter = filter;
