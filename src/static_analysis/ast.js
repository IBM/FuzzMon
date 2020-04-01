// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const fs = require('fs');
const esprima = require('esprima');
const estraverse = require('estraverse');
const Function = require('../static_analysis/callGraph').Function;
const logger = require('../common/logger');
const path = require('path');
// const escodegen = require('escodegen');

require('../common/utils');


var statementTypes = ['VariableDeclarator', 'BlockStatement', 'BreakStatement', 'ContinueStatement',
    'DebuggerStatement', 'DoWhileStatement', 'EmptyStatement', 'ExpressionStatement', 'ForStatement',
    'ForInStatement', 'ForOfStatement', 'FunctionDeclaration', 'IfStatement', 'LabeledStatement', 'ReturnStatement',
    'SwitchStatement', 'ThrowStatement', 'TryStatement', 'VariableDeclaration', 'WhileStatement', 'WithStatement'
];
var expressionTypes = ['ThisExpression', 'Identifier', 'Literal', 'ArrayExpression', 'ObjectExpression',
    'FunctionExpression', 'ArrowFunctionExpression', 'ClassExpression', 'TaggedTemplateExpression',
    'MemberExpression', 'Super', 'MetaProperty', 'NewExpression', 'CallExpression', 'UpdateExpression',
    'UnaryExpression', 'BinaryExpression', 'LogicalExpression', 'ConditionalExpression', 'YieldExpression',
    'AssignmentExpression', 'SequenceExpression', 'MethodDefinition'
];

class Imports {
    cosntructor(containingFilename, requiredFilename, requireCallNode, requiredObject) {
        this.containingFilename = containingFilename;
        this.requiredFilename = requiredFilename;
        this.requireCallNode = requireCallNode;
        this.requiredObject = requiredObject;
    }
}

class Exports {
    constructor(containingFilename, exportName, exportValue, exportNode) {
        this.containingFilename = containingFilename;
        this.exportName = exportName;
        this.exportValue = exportValue;
        this.exportNode = exportNode;
    }
}
/**
 * Representing an abstract syntax tree
 *
 * @class      AST
 */
class AST {
    /**
     * Constructs the object.
     *
     * @param      {string}   filename      Name of the file that that AST will be created from
     * @param      {boolean}  isTargetFile  Indicates if the given file contains the target line(s)
     * @param      {boolean}  isEntryFile   Indicates if the given file is the "entry point" of the program
     */
    constructor(filename, isTargetFile = false, isEntryFile = false) {
        this.filename = filename;
        this.isEntryFile = isEntryFile;
        this.isTargetFile = isTargetFile;
        this.allRequires = null;
        this.allExports = null;
        this.allFuncsDecls = null;
    }

    reset() {
        this.allRequires = null;
        this.allExports = null;
        this.allFuncsDecls = null;
        this.astRoot = null;
    }

    process() {
        this.astRoot = esprima.parseModule(this.sourceCode, {
            loc: true,
            range: true,
            comment: true,
            tolerant: true
        });

        // this.scope = new Scope(this.astRoot);
        // Adding parent node. 
        // Make sure this will come *before* the call to getAllRequires 
        // which goes into infinite loop once you add a 'parent' property
        this.traverse(this.astRoot, (node, parent) => {
            node['parent'] = parent;
        });

        this.removeUseStrict();
        // normalizeScopes should be called *before* deanonymizeFunctions
        this.normalizeScopes();
        this.deanonymizeFunctions();
        // getAllFunctions should be called *after* deanonymizeFunctions

        this.allFuncsDecls = this.getAllFunctions();
        this.allRequires = this.getAllRequires();
        // this.allExports = this.getAllExports();
    }

    /**
     * Initializes the AST
     */
    init() {
        logger.info('AST: initializing ' + this.filename);
        this.sourceCode = fs.readFileSync(this.filename, 'utf8');
        this.sourceCode = this.sourceCode.stripBom();
        // a small optimization
        let sourceCodeList = this.sourceCode.split('\n');
        try {
            // handling the case of a file that starts with e.g., #!/usr/bin/env node
            if (this.sourceCode.startsWith('#')) {
                sourceCodeList = sourceCodeList.slice(1);
                this.sourceCode = '\n' + sourceCodeList.join('\n');
            }
            this.process();
        } catch (e) {
            logger.error('AST: Failed to init file: ' + this.filename);
            logger.error(e);
            throw e;
        }
    }

    deanonymizeFunctions() {
        const enter_callback = (node) => {
            try {
                let wasArrowFunction = false;
                switch (node.type) {
                    case 'ArrowFunctionExpression': // var a = () => {}
                        wasArrowFunction = true;
                    case 'FunctionExpression': // var foo = function() {}
                        node.type = 'FunctionDeclaration';
                    case 'FunctionDeclaration': // function foo() {}
                        if (!node.id || !node.id.name) {
                            node.id = {
                                'type': 'Identifier',
                                'name': `${path.basename(this.filename).replace(/\./g, '_').replace('-', '_')}_anonymous_${node.loc.start.line}`
                            };
                        }
                        break;
                    default:
                        return;
                }
                // In the transformation between arrow function syntax to a reglar sytax, we loose the advantage of
                // closure bind of `this`. So we add it manually so that the code will not be angry at us
                if (wasArrowFunction) {
                    const tmpParent = node.parent;

                    node.parent = null;
                    let cloneFunctionNode = Object.assign({}, node);

                    const range = JSON.parse(JSON.stringify(node.range));
                    const loc = JSON.parse(JSON.stringify(node.loc));

                    for (let i in node) {
                        delete node[i];
                    }

                    node.type = 'CallExpression';
                    node.callee = {
                        'type': 'MemberExpression',
                        'computed': false,
                        'object': cloneFunctionNode,
                        'property': {
                            'type': 'Identifier',
                            'name': 'bind'
                        },
                        'range': range,
                        'loc': loc
                    };
                    node.arguments = [{
                        'type': 'ThisExpression'
                    }];
                    cloneFunctionNode.parent = node.callee;
                    cloneFunctionNode.body.parent = cloneFunctionNode;

                    node.parent = tmpParent;
                }
            } catch (e) {
                console.log(e);
                process.exit(5);
            }
        }
        this.traverse(this.astRoot, enter_callback);
    }

    _createBlockStatement(node, property) {
        if (node[property]) {
            if (node[property].type !== 'BlockStatement') {
                let tmpNodeBody = Object.assign({}, node[property]);
                node[property] = {
                    type: 'BlockStatement',
                    body: tmpNodeBody instanceof Array ? tmpNodeBody : [tmpNodeBody],
                    parent: node
                };
                tmpNodeBody.parent = node;
                return node[property];
            }
        } else {
            throw Error(`Unsupported type: ${node.type}`);
            process.exit();
        }
    }

    _handleArrowFunctionExpression(node) {
        if (node.type !== 'ArrowFunctionExpression') {
            throw Error('Expected `node` to be of type `ArrowFunctionExpression`');
        }
        if (node.body.type !== 'BlockStatement') {
            let block = this._createBlockStatement(node, 'body');
            // If we got here, it means that block.body.length === 1, we check it to make sure
            if (!block || !block.body || block.body.length !== 1) {
                throw Error('Invalid ArrowFunctionExpression');
            }
            let statementPtr = block.body[0];
            block.body[0] = {
                "type": "ReturnStatement",
                "argument": statementPtr
            }
            statementPtr.parent = block.body[0];
            node.expression = false;
        }
    }

    // _createArrowFunc(node) {
    // 	let tmpParent = node.parent;
    // 	node.parent && delete node.parent;
    // 	let cloneNode = Object.assign({}, node);
    // 	for (let i in node) {
    // 		delete node[i];
    // 	}
    // 	node.type = "CallExpression";
    // 	node.callee = {
    // 		"type": "ArrowFunctionExpression",
    // 		"id": null,
    // 		"params": [],
    // 		"body": {
    // 			"type": "BlockStatement",
    // 			"body": [cloneNode]
    // 		},
    // 		"generator": false,
    // 		"expression": false,
    // 		"async": false
    // 	};
    // 	node.arguments = [];
    // 	node.parent = tmpParent;
    // }

    _handleSwitchCase(node) {
        if (node.type !== 'SwitchCase') {
            throw Error('Expected `node` to be of type `SwitchCase`');
        }
        if (!node.consequent) {
            throw new Error('SwitchCase should have had a `consequent` property: ' + node);
        }

        if (node.consequent.type !== 'BlockStatement') {
            let tmpNodeBody = Object.assign([], node['consequent']);
            node['consequent'] = [{
                type: 'BlockStatement',
                body: tmpNodeBody instanceof Array ? tmpNodeBody : [tmpNodeBody],
                parent: node
            }];
            tmpNodeBody.parent = node;
            return node['consequent'];
        }
    }

    removeUseStrict() {
        const enter_callback = (node) => {
            if ('ExpressionStatement' === node.type &&
                node.directive && 'use strict' === node.directive) {
                let origParent = node.parent;
                node = {
                    type: 'EmptyStatement',
                    parent: origParent
                };
            }
        }

        this.traverse(this.astRoot, enter_callback, null);
    }

    normalizeScopes() {
        const enter_callback = (node) => {
            try {
                switch (node.type) {
                    case 'ArrowFunctionExpression':
                        this._handleArrowFunctionExpression(node);
                        break;
                    case 'DoWhileStatement':
                    case 'FunctionDeclaration':
                    case 'ForOfStatement':
                    case 'ForStatement':
                    case 'ForInStatement':
                    case 'WhileStatement':
                    case 'WithStatement':
                        this._createBlockStatement(node, 'body');
                        break;
                    case 'IfStatement':
                        node.consequent && this._createBlockStatement(node, 'consequent');
                        // Please note that we've got to be careful here as in the following case,
                        // if (a) {...} else if (b) {...} else {...}
                        // The AST something like this:
                        // "type": "IfStatement", "test": {...},
                        // "consequent": {...},
                        // "alternate": {
                        // 	"type": "IfStatement",
                        // 	"test": {...},
                        // 	"consequent": {...},
                        // 	"alternate": {...} <<<-- this is the 'else' statement. It is an `alternate` property of the inner `IfStatement`
                        // }
                        node.alternate && node.alternate.type !== 'IfStatement' && this._createBlockStatement(node, 'alternate');
                        break;
                    case 'SwitchCase':
                        this._handleSwitchCase(node);
                        break;
                }
            } catch (e) {
                console.log(e);
                process.exit(5);
            }
        };
        this.traverse(this.astRoot, enter_callback, null);
    }

    /**
     * Retrieves a list with all functions in ast originated at root
     *
     * @param      {esprima node}  root    The root node
     * @return     {[Function]}    All functions.
     */
    getAllFunctions() {
        if (!this.allFuncsDecls) {
            this.allFuncsDecls = [];
            const enter_callback = (node) => {
                let functionName = null;
                switch (node.type) {
                    case 'FunctionDeclaration': // function foo() {}
                        functionName = node.id.name;
                        this.allFuncsDecls.push(new Function(functionName, node.loc, this.filename, node));
                    case 'ArrowFunctionExpression': // var a = () => {}
                    case 'FunctionExpression': // var foo = function() {}
                        if (node.parent && node.parent.type && node.parent.type === 'VariableDeclarator') {
                            functionName = node.parent.id.name;
                            this.allFuncsDecls.push(new Function(functionName, node.loc, this.filename, node));
                        }
                        break;
                }
            }
            this.traverse(this.astRoot, enter_callback);
        }
        return this.allFuncsDecls;
    }

    /**
     * Traverses the esprima ast
     *
     * @param      {esprima node}  root        The root
     * @param      {function}  enter_callback  The function called everytime we "enter" a node in the AST
     * @param      {function}  leave_callback  The function called everytime we "leave" a node in the AST
     */
    traverse(root, enter_callback, leave_callback) {
        estraverse.traverse(root, {
            enter: enter_callback,
            leave: leave_callback
        });
    };

    getNodeByLoc(root, loc) {
        return this.searchDown(root, null, ['loc'], loc, true);
    }

    /**
     * Retrives the node[s] in the AST that appear at a specific line
     *
     * @param      {esprima node}    root        The root
     * @param      {number}          lineNumber  The line number
     * @return     {[esprima node]}  The node(s) that appear in the given line
     */
    getNodeByLine(root, lineNumber) {
        return this.searchDown(root, null, ['loc', 'start', 'line'], lineNumber, true);
    }

    /**
     * Internal function of ast.js
     * Checks whether the given node matches the property names/values passed as params
     *
     * @param      {esprima node}      node            The node to check
     * @param      {string?}           type            The type we check agains 
     * @param      {string?}           property_name   Name of the property we check agains
     * @param      {(Array|Function)}  property_value  Value of the property we check agains
     * @param      {string}            searchMode      The search mode. It can either be 'exact', 'any', or 'contains'
     * @return     {boolean}           True iff the given node matches the data passed in the arguments
     */
    _checkNode(node, type, property_name, property_value, searchMode = 'exact') {
        if (!node) {
            throw Error('Node should never be null or undefined!');
        }
        if ((!type) && (!property_name)) {
            throw Error('Either type, or property_name shuold be specified');
        }

        if (property_name && (!property_value)) { // Getting nodes that have the given property_name
            return node.hasOwnProperty(property_name);
        }

        if (('contains' !== searchMode) && ('exact' !== searchMode) && ('any' !== searchMode)) {
            throw Error('Invalid search mode: ' + searchMode);
        }

        if (('any' === searchMode) && (!(property_value instanceof Array))) {
            throw Error('When search mode is \'any\', the property_value arguments should be an array');
        }

        var retVal = true;
        if (type && (node.type !== type)) {
            retVal = false;
        }
        if (property_name && retVal) {
            let curPropertyValue = node.getNestedProp(property_name);
            if (('exact' === searchMode) && (curPropertyValue !== property_value)) {
                retVal = false;
            } else if (('contains' === searchMode) && (!curPropertyValue.includes(property_value))) {
                retVal = false;
            } else if (('any' === searchMode) && (!property_value.includes(curPropertyValue))) {
                retVal = false;
            }
        }
        return retVal;
    }

    /**
     * Searches for a node with certain given properties starting from the given node, up towards the root of the AST
     *
     * @param      {esprima node}      root            The root node to begin the search from
     * @param      {string?}           type            The type we search for
     * @param      {string?}           property_name   Name of the property we search for
     * @param      {(Array|Function)}  property_value  Value of the property we search for
     * @param      {string}            searchMode      The search mode. It can either be 'exact', 'any', or 'contains'
     * @return     {[esprima node]}    All nodes that meet the requirements.
     */
    searchUp(root, type, property_name, property_value, searchMode = 'exact') {
        while (root) {
            if (this._checkNode(root, type, property_name, property_value, searchMode)) {
                return root;
            }
            root = root.parent;
        }
        return root;
    }

    /**
     * Searches for a node with certain given properties starting from the given node, towards the leaves of the AST
     *
     * @param      {esprima node}      root            The root node to begin the search from
     * @param      {string?}           type            The type we search for
     * @param      {string?}           property_name   Name of the property we search for
     * @param      {(Array|Function)}  property_value  Value of the property we search for
     * @param      {string}            searchMode      The search mode. It can either be 'exact', 'any', or 'contains'
     * @return     {[esprima node]}    All nodes that meet the requirements.
     */
    searchDown(root, type, property_name, property_value, should_skip_traversal = false, searchMode = 'exact') {
        var result = [];
        var self = this;

        var enter_callback = (node) => {
            var tmp_property_name = property_name;
            if (property_name instanceof Array) {
                tmp_property_name = property_name.slice(0); // _checkNode alters property_name, so we just copy it by value
            }
            if (node && self._checkNode(node, type, tmp_property_name, property_value, searchMode)) {
                result.push(node);
                if (should_skip_traversal) {
                    return self.skip_traversal;
                }
            }
        };
        this.traverse(root, enter_callback, null);
        return result;
    }

    renameCallToFunc(root, moduleName, origFuncName, newFuncName) {
        if (!origFuncName && !newFuncName) { // only origFuncName and newFuncName specified
            origFuncName = root;
            newFuncName = moduleName;
            root = this.astRoot;
            moduleName = null;
        } else if (origFuncName && !newFuncName) { // only moduleName, origFuncName, and newFuncName specified
            newFuncName = origFuncName;
            origFuncName = moduleName;
            moduleName = root;
            root = this.astRoot;
        }

        let renamedCallNodes = [];

        // let allRequires = this.getAllRequires();
        // allRequires = allRequires.map(require => {
        // 	let varDecl = this.searchUp(require, 'VariableDeclaration');
        // 	return varDecl || require;
        // })

        const enter_callback = (node) => {
            if ('CallExpression' === node.type) {
                switch (node.callee.type) {
                    case 'Identifier': // the case of "readFile()"
                        if (node.callee.name !== origFuncName) {
                            break;
                        }
                        renamedCallNodes.push(node);
                        node.callee.name = newFuncName;
                        // we should change the value in the require line as well 
                        // var execFile = require('child_process').execFile;
                        // allRequires
                        // 	.filter(require => require.type === 'VariableDeclaration')
                        // 	.map(require => require.declarations.map(decl => {
                        // 		if (origFuncName === decl.id.name) {
                        // 			decl.id.name = newFuncName;
                        // 		}
                        // 	}));
                        break;
                    case 'MemberExpression':
                        let currentFuncName = node.callee.property.name;
                        if (currentFuncName !== origFuncName) {
                            break;
                        }

                        if (!moduleName) {
                            throw Error('moduleName has to be specified!');
                        }
                        if (('Identifier' === node.callee.object.type) &&
                            (moduleName = node.callee.object.name)) { // the case of "fs.readFile()"
                            node.callee.property.name = newFuncName;
                            node.callee = node.callee.property;
                        } else if (('CallExpression' === node.callee.object.type) &&
                            (moduleName === node.callee.object.arguments[0].value)) { // the case of "require('fs').readFile()"
                            node.callee.property.name = newFuncName;
                        }

                        renamedCallNodes.push(node);
                        break;
                }
            }
        }
        this.traverse(root, enter_callback);
        return renamedCallNodes;
    }

    getCallsToFunc(root, funcName) {
        if (!funcName) {
            funcName = root;
            root = this.astRoot; // default value
        }
        return [].concat(this.searchDown(root, 'CallExpression', ['callee', 'name'], funcName),
            this.searchDown(root, 'CallExpression', ['callee', 'property', 'name'], funcName));
    }

    getRequireNode(moduleName) {
        return this.getAllRequires()
            .filter(res => res.arguments.every(arg => arg.value === moduleName))
            .map(node => node.parent);
    }

    getAllRequires() {
        if (!this.allRequires) {
            this.allRequires = []
                .concat(
                    this.searchDown(this.astRoot, 'CallExpression', ['callee', 'name'], 'require'),
                    this.searchDown(this.astRoot, 'CallExpression', ['callee', 'object', 'callee', 'name'], 'require')
                );
        }
        return this.allRequires;
    }

    getAllExports() {
        if (!this.allExports) {
            this.allExports = [].concat(
                    // module.export = {a,b,c}
                    // TODO: add support to module.export = {a : asd,b : asd2,b : asd3}
                    this.searchDown(this.astRoot, 'AssignmentExpression', ['left', 'object', 'name'], 'module')
                    .filter(exprStatementNode =>
                        exprStatementNode.left.property && exprStatementNode.left.property.name === 'exports')
                    .map(exprStatementNode => exprStatementNode.right.properties)
                    .map(property => property.key.name),
                    // exports.a = b
                    // TODO: add support to the case where a != b
                    this.searchDown(this.astRoot, 'AssignmentExpression', ['left', 'object', 'name'], 'exports')
                    .map(exprStatementNode => exprStatementNode.right),
                    // exports = {a, b, c}
                    // TODO: add support to export = {a : asd,b : asd2,b : asd3}
                    this.searchDown(this.astRoot, 'AssignmentExpression', ['left', 'object', 'name'], 'exports')
                    .map(exprStatementNode => exprStatementNode.right.properties)
                    .map(property => property.key.name),
                )
                .flatten()
                .filter(n => n); // remove all nulls/undefined
        }
        return this.allExports;
    }

    getContainingFunction(node) {
        // Please note that in the following case,
        // function goo() {
        //  function bar() {
        //   console.log('gabaza');
        //  }
        // }
        // for "console.log('gabaza');" we'll return 'bar'
        // We *always* return the innermost function
        let tmpNode = node;
        while (tmpNode.parent && !['FunctionExpression', 'FunctionDeclaration', 'ArrowFunctionExpression'].includes(tmpNode.type)) {
            tmpNode = tmpNode.parent;
        }
        /// HACK
        if (tmpNode.loc instanceof Array) {
            tmpNode.loc = tmpNode.loc[0];
        }
        return this.allFuncsDecls.find(funcPtr => 
            funcPtr.node.loc.start.line === 
            tmpNode.loc.start.line &&
            funcPtr.node.loc.end.line === 
            tmpNode.loc.end.line);
// =======
//         while (tmpNode && !['FunctionExpression', 'FunctionDeclaration', 'ArrowFunctionExpression'].includes(tmpNode.type)) {
//             tmpNode = tmpNode.parent;
//         }
//         if (!tmpNode) {
//             return;
//         }
//         return this.allFuncsDecls.find(funcPtr => funcPtr.node.loc.start.line === tmpNode.loc.start.line &&
//             funcPtr.node.loc.end.line === tmpNode.loc.end.line);
// >>>>>>> a531c26bf89dd7f196999839e0b690c2e58ddb3b
    }

    // isInFunction(lineNum) {
    // 	lineNum = Number(lineNum);
    // 	let node = this.getNodeByLine(this.astRoot, lineNum)[0];
    // 	if (!node) {
    // 		return false;
    // 	}
    // 	return this.allFuncsDecls.find(fDecl => (fDecl.loc.start.line < node.loc.start.line) && (fDecl.loc.end.line >
    // 		node.loc.end.line));
    // }

    /**
     * @param      {esprima node}  callExpression  Esprima node containing a call expression
     * @return     {string}  Name of the callee
     */
    getCalleeName(callExpression) {
        if ('CallExpression' !== callExpression.type) {
            throw Error('Node type should be `CallExpression`');
        }

        if (!callExpression['callee']) {
            throw Error('Node should have a `callee` member');
        }

        let calleeName = this.sourceCode.substring(callExpression.callee.range[0], callExpression.callee.range[1]);
        return calleeName;
    }

    getFunctionBodyLinesRangeNode(funcPtr) {
        if (!funcPtr) {
            return;
        }
        switch (funcPtr.type) {
            case 'FunctionExpression':
            case 'FunctionDeclaration':
            case 'ArrowFunctionExpression':
                return {
                    start: funcPtr.body.loc.start.line,
                    end: funcPtr.body.loc.end.line
                };
            case 'VariableDeclaration':
                if (funcPtr.declarations.length > 0) {
                    // Assuming no condition like
                    // var f = function() {}, g = function();
                    // ^ This is a very bad piece of code
                    let funcDecl = funcPtr.declarations[0].init;
                    return this.getFunctionBodyLinesRangeNode(funcDecl);
                } else {
                    throw Error('Invalid function variable declaration');
                }
            default:
                throw Error('Not yet supported function type: ' + funcPtr.type);
        }
        throw Error('Should have not gotten here (getFunctionBodyLinesRange)');
    }

    getFunctionBodyLinesRange(funcPtr) {
        let nodeFuncPtr = (funcPtr instanceof Function) ? funcPtr.node : funcPtr;
        return this.getFunctionBodyLinesRangeNode(nodeFuncPtr);
    }
}

exports.AST = AST;
exports.Imports = Imports;
exports.Exports = Exports;
exports.statementTypes = statementTypes;
exports.expressionTypes = expressionTypes;