var MetaStore = require('../index').MetaStore;

var data1 = [
    {
        type: 'Module',
        id: 'Pin',
        view_types: ['summary', 'detailed'],
        cache: {
            file1: 123,
            file2: 456
        }
    }
];

var data2 = [
    {
        type: 'Module',
        id: 'Pin',
        view_types: ['thumbnail'],
        classes: ['large', 'small']
    },
    {
        type: 'Module',
        id: 'PinImage'
    },
    {
        type: 'Module',
        id: 'Pin',
        view_types: ['closeup']
    }
];

var data3 = [
    {
        type: 'Module',
        id: 'Header',
        view_types: ['fixed', 'relative']
    }
];

var data4 = [
    {
        type: 'Module',
        id: 'Pin',
        view_types: ['listItem']
    }
];

module.exports.testConstruct = function (test) {
    var store = new MetaStore();

    store.addData('extractor1', 'file1', data1);
    store.addData('extractor2', 'file1', data2);
    store.addData('extractor1', 'file2', data3);
    store.addData('extractor2', 'file2', data4);

    test.deepEqual(store.query('Module.id(Pin){cache}'), [{
      cache: data1[0].cache
    }]);

    test.deepEqual(store.query('Module.id(Header){view_types}'), [{
      view_types: data3[0].view_types
    }]);

    test.deepEqual(store.query('Module{id}'), [
      {id: 'Header'},
      {id: 'Pin'},
      {id: 'PinImage'}
    ]);

    test.deepEqual(store.query('Module.id(Pin){view_types}'), [
      {
        view_types: ['summary', 'detailed', 'thumbnail', 'closeup', 'listItem']
      }
    ]);

    test.deepEqual(store.query('Module.id(Pin,Header){id,view_types}'), [
      {
        id: 'Header',
        view_types: ['fixed', 'relative']
    },
      {
        id: 'Pin',
        view_types: ['summary', 'detailed', 'thumbnail', 'closeup', 'listItem']
      }
    ]);

    store.removeExtractor('extractor1');

    test.deepEqual(store.query('Module.id(Pin,Header){id,view_types}'), [
      {
        id: 'Pin',
        view_types: ['thumbnail', 'closeup', 'listItem']
      }
    ]);

    store.removeFile('file2');

    test.deepEqual(store.query('Module.id(Pin,Header){id,view_types}'), [
      {
        id: 'Pin',
        view_types: ['thumbnail', 'closeup']
      }
    ]);

    var exported = store.export();
    store = new MetaStore();
    store.import(exported);

    test.deepEqual(store.query('Module.id(Pin,Header){id,view_types}'), [
      {
        id: 'Pin',
        view_types: ['thumbnail', 'closeup']
      }
    ]);

    test.deepEqual(store.query('Module{id}'), [
      {id: 'Pin'},
      {id: 'PinImage'}
    ]);

    test.equal(store === undefined, false);
    test.done();
};
