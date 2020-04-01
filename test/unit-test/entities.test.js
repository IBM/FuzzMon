const assert = require('chai').assert;
// var rewire = require('rewire');

const entities = require("../../src/entities/entities")
// const input_queue = require('../../src/fuzzer/input_queue')
// const path = require("../../src/fuzzer/path")

describe("Entities - Test EntryParam object", function() {
    describe("Testing EntryParam equality operator", function() {
        context("When entry params are equal", function(){
            it("Params should be equal", function() {
                var param1 = new entities.EntryParam("param", "string", "no extra info");
                var param2 = new entities.EntryParam("param", "string", "no extra info");
                assert.isTrue(param1.eq(param2));
            });
            it("Params should be equal (even with different weight)", function() {
                var param1 = new entities.EntryParam("param", "string", "no extra info", 1);
                var param2 = new entities.EntryParam("param", "string", "no extra info", 2);
                assert.isTrue(param1.eq(param2));
            });
        });
        context("When entry params are not equal", function(){ 
            it("Params shouldn't be equal (names) ", function() {
                var param1 = new entities.EntryParam("param1", "string", "no extra info");
                var param2 = new entities.EntryParam("param2", "string", "no extra info");
                assert.isFalse(param1.eq(param2));
            });
            it("Params shouldn't be equal (type) ", function() {
                var param1 = new entities.EntryParam("param", "string", "no extra info");
                var param2 = new entities.EntryParam("param", "number", "no extra info");
                assert.isFalse(param1.eq(param2));
            });
        });
    });
});

describe("Entities - Test EntryPoint object", function() {
    describe("Testing EntryPoint Equality Operator", function() {
        context("When entry points equal", function(){
            it("#1 - Entry points should be equal", function() {
                var entry_param1 = new entities.EntryParam("param1", "string1", "no extra info");
                var entry_param2 = new entities.EntryParam("param1", "string1", "no extra info");
    
                var entry_point1 = new entities.EntryPoint("filename1", "entry_name1", entry_param1, "no extra info");
                var entry_point2 = new entities.EntryPoint("filename1", "entry_name1", entry_param2, "no extra info");
                assert.isTrue(entry_point1.eq(entry_point2));
            });
            it("#2 - Entry points should be equal", function() {
                var entry_param1 = new entities.EntryParam("param1", "string1", "no extra info");
                var entry_param2 = new entities.EntryParam("param2", "string2", "no extra info");
    
                var entry_point1 = new entities.EntryPoint("filename1", "entry_name1", entry_param1, "no extra info", 0.1);
                var entry_point2 = new entities.EntryPoint("filename1", "entry_name1", entry_param2, "no extra info", 0.2);
                assert.isTrue(entry_point1.eq(entry_point2));
            });
        });

        context("When entry points are not equal", function(){ 
            it("#1 - Entry points should not be equal", function() {
                var entry_param1 = new entities.EntryParam("param1", "string1", "no extra info");
                var entry_param2 = new entities.EntryParam("param1", "string1", "no extra info");

                var entry_point1 = new entities.EntryPoint("filename1", "entry_name1", [entry_param1, entry_param2], "no extra info");
                var entry_point2 = new entities.EntryPoint("filename2", "entry_name1", entry_param2, "no extra info");
                assert.isFalse(entry_point1.eq(entry_point2));
            });
            it("#2 - Entry points should not be equal", function() {
                var entry_param1 = new entities.EntryParam("param1", "string1", "no extra info");
                var entry_param2 = new entities.EntryParam("param1", "string1", "no extra info");

                var entry_point1 = new entities.EntryPoint("filename1", "entry_name1", entry_param1, "no extra info");
                var entry_point2 = new entities.EntryPoint("filename1", "entry_name2", entry_param2, "no extra info");
                assert.isFalse(entry_point1.eq(entry_point2));
            });
            it("#3 - Entry points should not be equal", function() {
                var entry_param1 = new entities.EntryParam("param1", "string1", "no extra info");
                var entry_param2 = new entities.EntryParam("param1", "string1", "no extra info");

                var entry_point1 = new entities.EntryPoint("filename1", "entry_name1", entry_param1, "no extra info");
                var entry_point2 = new entities.EntryPoint("filename2", "entry_name2", entry_param2, "no extra info");
                assert.isFalse(entry_point1.eq(entry_point2));
            });
        });
    });
});

describe("Entities - Test ParamVal object", function() {
    describe("testing ParamVal constructor", function() {
        it("ParamVal with no newType should equal old type from the entry param", function(){
            var old_type = "number"
            var entry_param = new entities.EntryParam("param1", old_type);
            var param_val = new entities.ParamVal(entry_param, 1337);
            assert.equal(param_val.newType, old_type);
            assert.notEqual(param_val.newType, "string");
            assert.notEqual(param_val.newType, "hexNumber");
            assert.notEqual(param_val.newType, "boolean");
        });
    });

    describe("Testing ParamVal clone method", function() {

        it("cloned param_val should be equal", function(){
            var entry_param = new entities.EntryParam("param1", "number");
            var param_val = new entities.ParamVal(entry_param, 1337, "string")
            var cloned_param_val = param_val.clone()
            assert.isTrue(param_val.paramPtr.eq(entry_param));
            assert.equal(cloned_param_val.value, param_val.value);
            assert.equal(cloned_param_val.newType, param_val.newType);
        });

        it("cloned param_val should not be equal to a different param_val", function(){
            var entry_param1 = new entities.EntryParam("param1", "number");
            var entry_param2 = new entities.EntryParam("param2", "number");
            var param_val1 = new entities.ParamVal(entry_param1, 1337, "string")
            var param_val2 = new entities.ParamVal(entry_param2, 10539, "number")
            var cloned_param_val1 = param_val1.clone()
            
            // All 3 propeties of the cloned param are not equal to a different param
            assert.isFalse(cloned_param_val1.paramPtr.eq(param_val2));
            assert.notEqual(cloned_param_val1.value, param_val2.value);
            assert.notEqual(cloned_param_val1.newType, param_val2.newType);
        });


        it("cloned ParamVal shouldn't create a copy of the paramPtr", function(){
            var entry_param = new entities.EntryParam("param1", "number", "no_extra_info", 1);
            var param_val = new entities.ParamVal(entry_param, 1337);
            cloned_param_val = param_val.clone();
        
            // Change the propeties of the orig entry_param and see that they were not change in the new copy.
            entry_param.type = "string";
            assert.equal(cloned_param_val.paramPtr.type, entry_param.type);
            
            entry_param.name = "new_name";
            assert.equal(cloned_param_val.paramPtr.name, entry_param.name);

            entry_param.weight = 100;
            assert.equal(cloned_param_val.paramPtr.weight, entry_param.weight);
        });

    });
});

describe("Entities - Test Type object", function() {
    describe("Testing isStringJSON method", function(){
        it("obj should be a valid json", function() {
            var result = entities.Type.isStringJSON('{"Hello":"World"}')
            assert.isObject(result);
            assert.isNotBoolean(result);
            assert.equal(JSON.stringify(result), JSON.stringify({"Hello":"World"}));
        });
        it("Obj should not valid json", function(){
            assert.isFalse(entities.Type.isStringJSON('{Hello":"World"}'));
        });
    });

    describe("Testing determineType", function(){
        it("Raw item type is a string", function(){
            assert.equal(entities.Type.determineType("hello"), 'string');
            assert.equal(entities.Type.determineType("1234567890ABCDEFabdefg"), 'string');
            assert.equal(entities.Type.determineType("123g123"), 'string')
        });
        it("raw item type is an hexNumber (and not a string)", function(){
            assert.notEqual(entities.Type.determineType("abcdef"), 'string')
            assert.equal(entities.Type.determineType("abcdef"), 'hexNumber')
            assert.equal(entities.Type.determineType("1234567890abcdefABCDEF"), 'hexNumber')
        });
        it("raw item type is a number", function(){
            assert.equal(entities.Type.determineType(1),'number' )
            assert.equal(entities.Type.determineType(0),'number')
            assert.equal(entities.Type.determineType(-1), 'number')
        });
        it("raw item type is a boolean", function(){
            assert.equal(entities.Type.determineType(false),'boolean');
            assert.equal(entities.Type.determineType(true), 'boolean');
        });
        it("raw item type is undefined", function(){
            assert.equal(entities.Type.determineType(undefined), 'undefined')
        });
        it("raw item type is never null (because typeOf never returns null)", function() {
            assert.isNotNull(entities.Type.determineType(null))
            assert.isNotNull(entities.Type.determineType(undefined))
            assert.isNotNull(entities.Type.determineType(1))
            assert.isNotNull(entities.Type.determineType(0))
            assert.isNotNull(entities.Type.determineType('1'))
            assert.isNotNull(entities.Type.determineType('{"Hello":"World"}'))
            assert.isNotNull(entities.Type.determineType('abcde'))
            assert.isNotNull(entities.Type.determineType('1234'))
            assert.isNotNull(entities.Type.determineType('hello world'))
        });
        // TODO complete this..
        // it("raw item is a json string and thus an object", function(){
            // assert.equal(entities.Type.determineType('{}'), '')
            // assert.equal(entities.Type.determineType('{"hello":"world"}'), 'object')

        // });

    });
});

describe("Entities - Test BodyVal object", function() {
    describe("Testing clone method", function(){
        let body1 = new entities.BodyVal("This is a long body!", 'number');
        it("cloned is equal", function(){
            let cloned_body = body1.clone()
            assert.equal(body1.toString(), cloned_body.toString());
        });
    });
});

describe("Entities - Test GeneralizedInput object", function() {
    describe("Testing clone method", function(){
        let entry_param = new entities.EntryParam('entry1', 'number');
        let entry_point = new entities.EntryPoint("filename1", "entry1", [entry_param])
        let param_val1 = new entities.ParamVal(entry_param, 1);
        let param_val2 = new entities.ParamVal(entry_param, 2, "string");
        let param_vals = [param_val1, param_val2];
        let generalized_input = new entities.GeneralizedInput(entry_point, param_vals);
        let generalized_input2 = new entities.GeneralizedInput(entry_point, param_val1);
        it("cloned generalized input is the same", function() {
            let cloned_generalized_input = generalized_input.clone()
            assert.equal(generalized_input.toString, cloned_generalized_input.toString);
        });
        it("cloned generalized input is not the same", function() {
            let cloned_generalized_input = generalized_input.clone()
            assert.equal(generalized_input2.toString, cloned_generalized_input.toString);
        });
        it("empty param vals for generalized input", function() {
            let generalized_input = new entities.GeneralizedInput(entry_point);
            assert.equal(generalized_input.paramsVals.length, 0);
            assert.equal(generalized_input.bodyVal.toString(), 'BodyVal: {}');
        });
    });
});

describe("Entities - Test GeneralizedInputSequence object", function() {
    describe("Testing clone method", function(){
        let entry_param = new entities.EntryParam('entry1', 'number');
        let entry_point = new entities.EntryPoint("filename1", "entry1", [entry_param])
        let param_val1 = new entities.ParamVal(entry_param, 1);
        let param_val2 = new entities.ParamVal(entry_param, 2, "string");
        let param_val3 = new entities.ParamVal(entry_param, 3, "number");
        let generalized_input_seq  = new entities.GeneralizedInputSequence();
        it("Cloning empty generalized sequence", function() {
            let cloned_generalized_input_seq = generalized_input_seq.clone()
            assert.equal(cloned_generalized_input_seq.toString(), cloned_generalized_input_seq.toString());
            assert.lengthOf(cloned_generalized_input_seq.generalizedInputSequence, 0);
            assert.equal(cloned_generalized_input_seq.size, 0);
        });
        it("cloned generalized input is the same", function() {
            let cloned_generalized_input_seq = generalized_input_seq.clone()
            assert.equal(generalized_input_seq.toString, cloned_generalized_input_seq.toString);
        });
        it("Insert and removal of a generalized input into the sequence", function() {
            let new_generalized_input = new entities.GeneralizedInput(entry_point, param_val2)
            assert.equal(generalized_input_seq.size, 0);
            generalized_input_seq.insertTo(1,new_generalized_input);
            assert.equal(generalized_input_seq.size, 1);
            generalized_input_seq.removeFrom(0);
            assert.equal(generalized_input_seq.size, 0);
        });
        it("Check equality of insertions and removals", function() {
            let new_generalized_input1 = new entities.GeneralizedInput(entry_point, param_val1)
            let new_generalized_input2 = new entities.GeneralizedInput(entry_point, param_val2)
            let new_generalized_input3 = new entities.GeneralizedInput(entry_point, param_val3)
            generalized_input_seq.insertTo(0,new_generalized_input1);
            generalized_input_seq.insertTo(1,new_generalized_input2);
            generalized_input_seq.insertTo(2,new_generalized_input3);
            assert.equal(generalized_input_seq.size, 3);
            assert.equal(generalized_input_seq.at(2).toString(), new_generalized_input3.toString());
            generalized_input_seq.removeFrom(1);
            assert.equal(generalized_input_seq.at(1).toString(), new_generalized_input3.toString())
            assert.equal(generalized_input_seq.at(0).toString(), new_generalized_input1.toString())
            assert.equal(generalized_input_seq.size, 2);
            
        });
        
    });
});





