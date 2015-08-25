var MetaStore = require('../index').MetaStore;
var MultiMetaStore = require('../index').MultiMetaStore;

var data1 = [{
    type: 'Module',
    id: 'Pin',
    view_types: ['summary', 'detailed']
}];

var data2 = [{
    type: 'Module',
    id: 'Pin',
    view_types: ['thumbnail'],
    classes: ['large', 'small']
}, {
    type: 'Module',
    id: 'PinImage'
}, {
    type: 'Module',
    id: 'Pin',
    view_types: ['closeup']
}];

var data3 = [{
    type: 'Module',
    id: 'Header',
    view_types: ['fixed', 'relative']
}];

var data4 = [{
    type: 'Module',
    id: 'Pin',
    view_types: ['listItem']
}];

module.exports.testConstruct = function(test) {
    var store1 = new MetaStore();
    store1.addData('extractor1', 'file1', data1);

    var store2 = new MetaStore();
    store2.addData('extractor2', 'file1', data2);

    var store3 = new MetaStore();
    store3.addData('extractor1', 'file2', data3);

    var store4 = new MetaStore();
    store4.addData('extractor2', 'file2', data4);

    var multiStore = new MultiMetaStore([store1, store2, store3, store4]);

    test.deepEqual(multiStore.query('Module.id(Header){type,id,view_types}'), [{
        type: 'Module',
        id: 'Header',
        view_types: data3[0].view_types
    }]);

    test.deepEqual(multiStore.query('Module{type,id}'), [{
        type: 'Module',
        id: 'Header'
    }, {
        type: 'Module',
        id: 'Pin'
    }, {
        type: 'Module',
        id: 'PinImage'
    }]);

    test.deepEqual(multiStore.query('Module.id(Pin){type,id,view_types}'), [{
        type: 'Module',
        id: 'Pin',
        view_types: ['summary', 'detailed', 'thumbnail',
            'closeup', 'listItem'
        ]
    }]);

    test.deepEqual(multiStore.query(
        'Module.id(Pin,Header){type,id,view_types}'), [{
        id: 'Header',
        type: 'Module',
        view_types: ['fixed', 'relative']
    }, {
        id: 'Pin',
        type: 'Module',
        view_types: ['summary', 'detailed', 'thumbnail',
            'closeup', 'listItem'
        ]
    }]);

    store1.removeExtractor('extractor1');
    store3.removeExtractor('extractor1');

    test.deepEqual(multiStore.query(
        'Module.id(Pin,Header){type,id,view_types}'), [{
        id: 'Pin',
        type: 'Module',
        view_types: ['thumbnail', 'closeup', 'listItem']
    }]);

    store3.removeFile('file2');
    store4.removeFile('file2');

    test.deepEqual(multiStore.query(
        'Module.id(Pin,Header){type,id,view_types}'), [{
        id: 'Pin',
        type: 'Module',
        view_types: ['thumbnail', 'closeup']
    }]);

    test.deepEqual(multiStore.query(
        'Module.id(Pin,Header){type,id,view_types}'), [{
        id: 'Pin',
        type: 'Module',
        view_types: ['thumbnail', 'closeup']
    }]);

    try {
        multiStore.query('Module(Header){view_types}');
        test.fail('Should not be able to call MultiMetaStore without id');
    } catch (e) {
        test.equal(e.message, 'id is a required response field for MultiMetaStore queries');
    }

    try {
        multiStore.query('Module(Header){id,view_types}');
        test.fail('Should not be able to call MultiMetaStore without type');
    } catch (e) {
        test.equal(e.message, 'type is a required response field for MultiMetaStore queries');
    }

    test.done();
};
