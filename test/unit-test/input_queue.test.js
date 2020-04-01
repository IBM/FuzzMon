

const assert = require('chai').assert;
const rewire = require('rewire');
// const execution_path = require('./path');

// const entities = require("../../src/entities/entities")
// const input_queue = require('../../src/fuzzer/input_queue')
// const path = require("../../src/fuzzer/path")

// var entities = rewire('../../')
var input_queue = rewire('../../src/fuzzer/input_queue.js');



describe('Input Queue Tests', function() {
    // Testing the InputQueue found in input_queue.js
    describe('#1 - Testing input queue size updates', function(){
        it('InputQueue size should update after every enqueue operation', function(){
            var input_queue_object = new  input_queue.InputQueue();
            var times = 10;
            for(var i=0; i < times; i++){
                var queue_obj = new input_queue.QueueObject("mock genInputSeq" + i.toString(), "path", "metadata");
                input_queue_object.enqueue(queue_obj);
                assert.equal(input_queue_object.size, i+1);
            }
        });
        // Currently unimplemented, but need to test dequeue for size reduction..
    });


});






















// describe('Array', function() {
//     describe('#indexOf()', function() {
//         it('should return -1 when the value is not present', function() {
//             assert.equal([1,2,3].indexOf(4), -1);
//         });
//     });
//     describe('#indexOf2()', function() {
//         it('should return 1 when the value present at index 1', function() {
//             assert.equal([1,2,3].indexOf(2), 1);
//         });
//     });
// });

// describe('Hello', function() {
//     describe('test_hello_world', function() {
//         it('should return "hello world"', function() {
//             assert.equal(hello.hello_world(), 'hello world1');
//         });
//     });

// });