var GraphQL = require('../index').GraphQL;

var user1 = "User{name}";
var user2 = "User{friends{name,comments{date}}}";
var user3 = "User{name,age,friends{name,comments{text}}}";
var user4 = "User{friends.after(123).first(3,10){name,relationship}}";

var container = "User{" + user1 + "," + user2 + "," + user3 + "," + user4 + "}";

module.exports.testChain = function (test) {
  var query = GraphQL.parse('User.id(123){name}');
  test.deepEqual(query.getChain(), [{key: 'User'}, {key: 'id', args: ['123']}]);
  test.done();
};

module.exports.testFlatten = function (test) {
  var query = GraphQL.parse(container);
  test.equal(query.toString(), "User{age,friends{comments{date,text},name},friends.after(123).first(3,10){name,relationship},name}");
  test.done();
};

module.exports.testChildren = function (test) {
  var query = GraphQL.parse(container);
  var children;

  children = query.getChildKeys();
  children.sort();
  test.deepEqual(children, ['age', 'friends','name']);

  children = query.getChildren('friends')[0].getChildKeys();
  children.sort();
  test.deepEqual(children, ['comments','name']);

  children = query.getChildren('friends')[0].getChildren('comments')[0].getChildKeys();
  children.sort();
  test.deepEqual(children, ['date', 'text']);

  test.deepEqual(query.getChildren('friends')[1].getChain(), [
    {key:'friends'},
    {key:'after', args:['123']},
    {key:'first', args:['3', '10']}
  ]);

  children = query.getChildren('friends')[1].getChildKeys();
  children.sort();
  test.deepEqual(children, ['name','relationship']);

  test.done();
};
