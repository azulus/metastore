var SEPARATOR_CHAR = ',';
var OPEN_CHAR = '{';
var CLOSE_CHAR = '}';
var OPEN_ARG_CHAR = '(';
var CLOSE_ARG_CHAR = ')';
var CLASS_NAME_REGEX = /^[A-Z]/;
var FUNCTION_REGEX = /\([^\)]*\)/;
var TOKEN_REGEX = /[\{\}\(\),]/g;

var chainCreator = function (chunk) {
  var match = FUNCTION_REGEX.exec(chunk);
  if (match !== null) {
    return {
      key: chunk.substr(0, match.index),
      args:match[0].substr(1, match[0].length - 2).split(',').map(function (item) {
          return item.replace(/^(['"]?)(.*?)\1$/, '$2');
      })
    };
  } else {
    return {
      key: chunk
    };
  }
};

var splitChunk = function (chunk) {
    var chunks = [];
    var lastIdx = 0;
    var results = [];
    var parenCount = 0;
    var regex = /[\(\)\.]/g;

    while ((match = regex.exec(chunk)) !== null) {
        switch (match[0]) {
            case '.':
                if (parenCount === 0) {
                    chunks.push(chunk.substr(lastIdx, match.index - lastIdx));
                    lastIdx = match.index + 1;
                }
                break;

            case '(':
                parenCount++;
                break;

            case ')':
                parenCount--;
                break;
        }
    }

    chunks.push(chunk.substr(lastIdx));
    return chunks;
}


var Query = function() {
};

Query.prototype.getType = function () {
  return this._type;
};

Query.prototype.getChain = function () {
  return this._chain;
};

Query.prototype.hasChild = function (key) {
    return typeof this._children[key] !== 'undefined';
};

Query.prototype.getChild = function (key) {
  var keyRoot = this._getKeyRoot(key);
  return this._children[keyRoot][key];
};

Query.prototype.getChildren = function (keyRoot) {
  var keys = Object.keys(this._children[keyRoot]);
  var children = [];
  for (var i = 0; i < keys.length; i++) {
    children.push(this._children[keyRoot][keys[i]]);
  }
  return children;
};

Query.prototype.getChildKeys = function () {
  return this._children === undefined ? [] : Object.keys(this._children);
};

Query.parse = function(queryString) {
  var query = new Query();
  query._initChildren();

  var trimmedQueryString = queryString.replace(/[\s\n\t\r]+/g, "");
  var stack = [query];
  var match, preMatch, matchObj;

  var idx = 0;
  var inParens = 0;
  while ((match = TOKEN_REGEX.exec(trimmedQueryString)) !== null) {
    curr = stack[stack.length - 1];
    preMatch = trimmedQueryString.substr(idx, match.index - idx);

    if (match[0] === CLOSE_ARG_CHAR) {
        inParens = false;
        continue;
    }

    if (match[0] === OPEN_ARG_CHAR) {
        inParens = true;
        continue;
    }

    if (inParens) {
        continue;
    }

    idx = match.index + match[0].length;

    if (preMatch.length) {
      matchObj = undefined;

      if (match[0] !== OPEN_CHAR || !preMatch.match(CLASS_NAME_REGEX)) {
        matchObj = curr._hasChild(preMatch) ? curr.getChild(preMatch) : curr._addChild(preMatch);
      }

      if (match[0] === OPEN_CHAR) {
        if (preMatch.match(CLASS_NAME_REGEX)) {
          var currType = curr.getType();

          // dedupe the current class
          if (currType !== undefined && currType !== preMatch) {
            throw new Error("type " + currType + " does not match " +
              preMatch + " in " + query);
          }
          curr._setType(preMatch);
          stack.push(curr);

        } else {
          matchObj._initChildren();
          stack.push(matchObj);
        }
      }
    }

    if (match[0] === CLOSE_CHAR) {
      stack.pop();
    }
  }

  return query;
};

Query.prototype._getKeyRoot = function (key) {
  var idx = key.indexOf('.');
  if (idx === -1) {
    return key;
  } else {
    return key.substr(0, idx);
  }
};

Query.prototype._initChildren = function () {
  if (this._children === undefined) {
    this._children = {};
  }
};

Query.prototype._setType = function (type) {
  var dotIndex = type.indexOf('.');

  this._setChain(splitChunk(type).map(chainCreator));

  if (dotIndex !== -1) {
    type = type.substr(0, dotIndex);
  }

  this._type = type;
};

Query.prototype._addChild = function (key) {
  var child = new Query();
  var keyRoot = this._getKeyRoot(key);

  child._setChain(splitChunk(key).map(chainCreator));

  if (this._children[keyRoot] === undefined) {
    this._children[keyRoot] = {};
  }
  this._children[keyRoot][key] = child;
  return child;
};

Query.prototype._setChain = function (chain) {
  this._chain = chain;
};

Query.prototype._hasChild = function (key) {
  var keyRoot = this._getKeyRoot(key);

  return this._hasChildren() &&
    this._children[keyRoot] !== undefined &&
    this._children[keyRoot][key] !== undefined;
};

Query.prototype._hasChildren = function() {
  return this._children !== undefined;
};

Query.prototype.toString = function (hideType) {
  var idx = Math.floor(Math.random() * 10000);
  var keys = this.getChildKeys();
  keys.sort();

  var out = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var children = this._children[this._getKeyRoot(key)];
    var childKeys = Object.keys(children);
    childKeys.sort();

    for (var j = 0; j < childKeys.length; j++) {
      var childKey = childKeys[j];
      var child = children[childKey];
      if (child._hasChildren()) {
        out.push(childKey + child.toString(true));
      } else {
        out.push(childKey);
      }
    }
  }
  return (hideType ? "{" : this.getType() + "{") +
    out.join(",") + "}";
};

module.exports = Query;
