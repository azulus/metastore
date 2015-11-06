var GraphQL = require('../index').GraphQL;
var GraphQLFilter = require('../index').GraphQLFilter;

module.exports.testBasic = function (test) {
    var filtered;
    var obj = {
        users: [
            {
                id: 'user1',
                name: 'User One',
                age: 123,
                friends: [
                    {name: 'User Two', duration: '1 hour'}
                ]
            },
            {
                id: 'user2',
                name: 'User Two',
                age: 234,
                friends: [
                    {name: 'User One', duration: '1 hour'}
                ]
            }
        ]
    };

    filtered = GraphQLFilter.filter(obj, GraphQL.parse('Object{users{age}}'));
    test.deepEqual(filtered, {
        users:[
            {
                age:obj.users[0].age
            },
            {
                age:obj.users[1].age
            }
        ]
    });

    filtered = GraphQLFilter.filter(obj, GraphQL.parse('Object{users.id(user2){name}}'));
    test.deepEqual(filtered, {
        users:[
            {
                name:obj.users[1].name
            }
        ]
    });

    filtered = GraphQLFilter.filter(obj, GraphQL.parse('Object{users.id(/2/){name}}'));
    test.deepEqual(filtered, {
        users:[
            {
                name:obj.users[1].name
            }
        ]
    });

    filtered = GraphQLFilter.filter(obj, GraphQL.parse('Object{users.id(/ser/){age}}'));
    test.deepEqual(filtered, {
        users:[
            {
                age:obj.users[0].age
            },
            {
                age:obj.users[1].age
            }
        ]
    });

    filtered = GraphQLFilter.filter(obj, GraphQL.parse('Object{users.id(/^2/){name}}'));
    test.deepEqual(filtered, {
        users:[]
    });

    test.done();
};
