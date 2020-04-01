// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
// 'use strict';

// const log = require('loglevel');
// const AbstractInstrumenter = require('./instrumenter')
// 	.AbstractInstrumenter;
// const Runner = require('../fuzzer/runner');
// const Scope = require('./scope').Scope;
// const BuiltInFuncNames = require('./callGraph').BuiltInFuncNames;


// var counter = 0;
// /**
//  * Class representation of a single Variable
//  */
// class Variable {
// 	constructor(name, node, scope, loc, type, filename, isDstNode = false,
// 		isFunctionCall = false, isEntryInput = false) {
// 		if (arguments.length === 0) {
// 			return;
// 		}
// 		this.isDstNode = isDstNode;
// 		this.name = name;
// 		this.scope = scope;
// 		this.node = node;
// 		this.loc = loc && loc instanceof Array ? loc : [node.loc];
// 		// We first build the var graph and consider function invocation as another variable 
// 		this.isFunctionCall = isFunctionCall;
// 		this.isEntryInput = isEntryInput;
// 		this.def = null; // definition
// 		this.refs = [];
// 		if (!type) {
// 			this.type = [];
// 		} else {
// 			this.type = (type instanceof Array) ? type : [type];
// 		}
// 		this.filename = filename;
// 		this.distToDst = Infinity;
// 	}

// 	static fromCompoundVariable(compVar) {
// 		var variable = new Variable()
// 		Object.assign(variable, compVar);
// 		console.log('distToDst:', variable.distToDst);
// 		return variable;
// 	}

// 	toString() {
// 		return ['name:' + this.name + '(' + this.filename + ')',
// 			'loc: ' + this.loc.map(l => '(' + l.start.line + ',' + l.end.line + ')')
// 			.join(','),
// 			'isFunctionCall: ' + this.isFunctionCall,
// 			'isDstNode: ' + this.isDstNode,
// 		].join(';');
// 	}

// 	getFullName() {
// 		return this.name;
// 	}
// };

// class CompoundVariable extends Variable {
// 	constructor(objectName /*blah*/ , subVars /* [foo, getX] (for blah.foo.getX()) */ ,
// 		node, scope, loc, type, filename, isDstNode = false,
// 		isFunctionCall = false, isEntryInput = false) {
// 		if (arguments.length === 0) {
// 			super();
// 		} else {
// 			super(objectName, node, scope, loc, type, filename, isDstNode, isFunctionCall, isEntryInput);
// 			this.subVars = subVars;
// 		}
// 	}

// 	getFullName() {
// 		return this.name + '.' + (this.subVars.map(sv => sv.name)).join('.');
// 	}

// 	static fromVariable(variable, subVars) {
// 		var compVar = new CompoundVariable()
// 		Object.assign(compVar, variable);
// 		compVar.subVars = subVars;
// 		return compVar;
// 	}

// 	toString() {
// 		return ['name:' + this.name + '[' + this.getFullName() + '] (' + this.filename + ')',
// 			'loc: ' + this.loc.map(l => '(' + l.start.line + ',' + l.end.line + ')')
// 			.join(','),
// 			'isFunctionCall: ' + this.isFunctionCall
// 		].join(';');
// 	}
// };

// /**
//  * Representing a graph between the variables in the project
//  */
// class VarGraph extends Graph {
// 	/**
// 	 * Constructs the object.
// 	 *
// 	 * @param	  {[AST]}  astObjList  List of all ASTs in the project
// 	 */
// 	constructor(astObjList) {
// 		super();
// 		this.astObjList = astObjList;
// 		this.dstNodes = [];
// 	}

// 	/**
// 	 * Helper function. Generates an id from a Variable object, and a name of a file
// 	 *
// 	 * @param	  {Variable}  func	  The variable
// 	 * @param	  {string}	filename  The name of the file
// 	 * @return	 {string}	Unique id for a variable in a file
// 	 */
// 	_nodeAndFileToId(node, filename) {
// 		return ((node instanceof CompoundVariable) ? node.getFullName() : node.name) + '_' + filename;
// 	}

// 	/**
// 	 * Retrieves a node from the graph matching the given params
// 	 *
// 	 * @param	  {Variable}  node	  The node
// 	 * @param	  {string}	filename  The filename
// 	 * @return	 {varGraph node}  The node in the graph matching the nodes passed as a param
// 	 */
// 	getNode(node, filename) {
// 		return super.getGraphNode(this._nodeAndFileToId(node, filename));
// 	}

// 	/**
// 	 * Adds a node.
// 	 *
// 	 * @param	  {Variable}  func	  The variable
// 	 * @param	  {string}	filename  The name of the file
// 	 * @return	 {varGraph node}  Pointer to the variable object added to the graph
// 	 */
// 	addNode(node, filename) {
// 		let nodeId = this._nodeAndFileToId(node, filename);
// 		if (super.isGraphNode(nodeId)) { // we'd like to update the node's content
// 			// we update the node's [loc] property
// 			let existingNode = super.getGraphNode(nodeId);
// 			let existingNodeLoc = existingNode.getContent().loc;
// 			existingNodeLoc = existingNodeLoc.concat(node.loc).unique();
// 			return existingNode;
// 		} else {
// 			return super.addGraphNode(node, nodeId);
// 		}
// 	}

// 	/**
// 	 * Adds an edge.
// 	 *
// 	 * @param	  {varGraph node}  startNode  The start variable
// 	 * @param	  {varGraph node}  endNode	The end variable
// 	 * @return	 {varGraph edge}  Pointer to the edge between the two given nodes, added to the graph
// 	 */
// 	addEdge(startNode, endNode, lineNumber) {
// 		let edgeId = 'e_' + startNode.getId() + '_' + endNode.getId();
// 		if (super.isGraphEdge(edgeId)) {
// 			return super.getGraphEdge(edgeId);
// 		}
// 		let startNodeId = startNode.getId();
// 		let endNodeId = endNode.getId();
// 		return super.addGraphEdge(startNodeId, endNodeId, edgeId, lineNumber);
// 	}

// 	/**
// 	 * Initiates the var graph from the ast object list we got in the constructor
// 	 */
// 	async init(project) {
// 		this.project = project;
// 		this.targetLine = project.targetLine;
// 		this.ternWrapper = project.ternWrapper;

// 		// First, we find the initial `if statement` for the target file
// 		var targetAstObj = this.astObjList.find(astObj => astObj.isTargetFile);
// 		this.processTargetAST(targetAstObj);
// 		// Not saving pointers to the nodes itselves because it saves the pointer to 
// 		// *all* of the nodes, and we don't want to clonse them 
// 		this.dstNodesIds = this.getNodes().map(n => n.getId());

// 		// should the nodes from the entry point be also part of the dst nodes?
// 		var entryAstObj = this.astObjList.find(astObj => astObj.isEntryFile);
// 		this.processEntryAST(entryAstObj);

// 		for (let astObj of this.astObjList) {
// 			await this.processSingleAST(astObj);
// 			for (let vertex of this.getNodes()) {
// 				let node = vertex.getContent();

// 				// update the refs and defs of each node
// 				// const refs = await this.ternWrapper.getRefs(astObj.filename, curVar);
// 				// this.getNode(curNode, curNode.filename).getContent().refs = refs;

// 				if (!node.def) {
// 					try {
// 						node.def = await this.ternWrapper.getDef(astObj.filename, node);
// 					} catch (e) {
// 						log.error('Could not retrieve definition of', node.name, 'error:', (e.name === 'TernError' ?
// 							e.name : e));
// 					}
// 				}

// 				if (node.def && (node.def.file !== astObj.filename)) {
// 					continue;
// 				}
// 				if ((!node.type) || (node.type == 0)) {
// 					try {
// 						let newTypes = await this.ternWrapper.getType(astObj.filename, node);
// 						node.type = [].concat(node.type, newTypes.split('|'));
// 					} catch (e) {
// 						log.error('Could not retrieve type of', node.name, 'error:', (e.name === 'TernError' ? e.name :
// 							e));
// 					}
// 				}
// 				node.refs.map(ref => node.loc.push({
// 					start: ref.start,
// 					end: ref.end
// 				}));
// 				node.loc = node.loc.getUniqByCmpFunc(l => l.start.line);
// 			}
// 		}
// 		// sanity check
// 		if (!this.getNodes().some(v => v.getContent().isDstNode)) {
// 			throw Exception('No dst node found!');
// 		}
// 		this.initDistToDst();
// 	}

// 	/**
// 	 * Dynamically find the types of the variables we couldn't deduce from the static analysis
// 	 * 
// 	 * @param	  {Instrumenter.AbstractInstrumenter}  instrumenter	   The instrumenter that used
// 	 *																	 to instrument the source code to
// 	 *																	 deduce the variable types
// 	 * @param	  {[?]}								inputs			 Inputs to run the code  on
// 	 * @param	  {string}							 typeToInvestigate  The type to investigate. Should be in ['?', 'object']
// 	 *																	 See note below
// 	 * 
// 	 * @note This function operates in two modes - 1) Getting the type of a variable with a basic type
// 	 *  2) Getting the properties of an object, and trying to deduce their types
// 	 */
// 	enrichVarTypes(instrumenter, inputs, typeToInvestigate /*either '?' or 'object'*/ ) {
// 		if (!['?', 'object'].includes(typeToInvestigate)) {
// 			throw Error('Invalid type fo typeToInvestigate');
// 		}
// 		if (!this.project.isInitialized) {
// 			throw Error('Initialize project first, and only then call enrichVarTypes');
// 		}
// 		var hModule = Runner.instrumentAndRequire(this.project, instrumenter);
// 		inputs.map(input => {
// 			console.log('enrichVarTypes - Running on input:', input);
// 			Runner.runLoadedModule(hModule, input, this.project.entryPointName);
// 			let dynamicVarTypes = instrumenter.getGlobalStorage();
// 			this.getNodes()
// 				.filter(n => n.getContent()
// 					.type.includes(typeToInvestigate))
// 				.map(node => {
// 					let n = node.getContent();
// 					for (const instrN in dynamicVarTypes) {
// 						if (instrN === n.name) {
// 							let newTypes = dynamicVarTypes[instrN].unique()
// 								.filter(v => v);
// 							if (!n.type.includes(newTypes)) {
// 								n.type = [].concat(n.type, newTypes);
// 							}
// 						}
// 					}
// 				});
// 		});
// 		this.getNodes()
// 			.map(node => {
// 				let n = node.getContent();
// 				if (n.type.includes(typeToInvestigate) && n.type.length > 1) {
// 					n.type = n.type.filter(t => t !== typeToInvestigate);
// 				}
// 			});
// 	}

// 	/**
// 	 * Enriches the graph with the variables from the entry file
// 	 *
// 	 * @param	  {AST}  astObj  The ast object containing the data from the entry file
// 	 */
// 	processEntryAST(astObj) {
// 		let entryPointPtr = astObj.allFuncsDecls.filter(func => this.project.entryPointName === func.name);
// 		if (entryPointPtr.length !== 1) {
// 			throw Error('Something went really wrong. There is more that one function with the name: ' + this.project.entryPointName +
// 				' in the file: ' + astObj.filename);
// 		}
// 		entryPointPtr = entryPointPtr[0];
// 		let entryPointNode = astObj.getNodeByLine(astObj.astRoot, entryPointPtr.loc.start.line);
// 		entryPointNode = entryPointNode[0];
// 		let inputVars = astObj.extractVariables(entryPointNode);
// 		inputVars.map(v => Object.assign(v, {
// 				isEntryInput: true,
// 				isDstNode: false
// 			}))
// 			.map(v => this.addNode(v, astObj.filename));
// 	}

// 	/**
// 	 * Enriches the graph with the variables from the file containing the destination
// 	 *
// 	 * @param	  {AST}  astObj  The ast object containing the data from the file with the destination
// 	 */
// 	processTargetAST(astObj) {
// 		let node = astObj.getNodeByLine(astObj.astRoot, this.targetLine);
// 		// we only care about one of them
// 		// so we're taking the last one so that we can use searchUp
// 		node = node[node.length - 1];
// 		let ifStatementNode = astObj.searchUp(node, 'IfStatement');
// 		let conditionExpression = ifStatementNode.test;
// 		var res = astObj.extractVariables(conditionExpression)
// 			.getUniqByCmpFunc(n => n.name);
// 		// Please note that loc list in [Compound]Variable will contain only a single 
// 		// location. This is on purpose.
// 		res.map(v => Object.assign(v, {
// 				isDstNode: true
// 			}))
// 			.map(v => this.addNode(v, astObj.filename));
// 	}

// 	/**
// 	 * Enriches the graph with the variables from the given assignment expression
// 	 *
// 	 * @param	  {AST}			astObj		The ast object to work on 
// 	 * @param	  {varGraph node}  variableNode  The node containing the 'interesting variable' for the BFS
// 	 * @param	  {Variable}	   left		  The left part of the assignment expression
// 	 * @param	  {Variable}	   right		 The right part of the assignment expression
// 	 * @return	 {[Variable]}  List of variable added to the graph
// 	 */
// 	// processVarsFromAssignmentExpression(astObj, variableNode, left, right) {
// 	// 	let variable = variableNode.getContent();
// 	// 	if (variable.name === left.name) { // the case where 'a = b + c' where 'a' is the 'variable'
// 	// 		let rhsVars = astObj.extractVariables(right);
// 	// 		if (rhsVars) rhsVars.map(v => this.addEdge(this.addNode(v, astObj.filename), variableNode));
// 	// 		return rhsVars;
// 	// 	} else { // the case where 'a = b + c' where 'b' is the 'variable'
// 	// 		let lhsVars = astObj.extractVariables(left);
// 	// 		// there can be more than one, you'll be amazed!
// 	// 		if (lhsVars) lhsVars.map(v => this.addEdge(variableNode, this.addNode(v, astObj.filename)));
// 	// 		return lhsVars;
// 	// 	}
// 	// }

// 	/**
// 	 * Enriches the graph with the given variable
// 	 *
// 	 * @param	  {AST}			astObj		The ast object to work on 
// 	 * @param	  {varGraph node}  variableNode  The node containing the 'interesting variable' for the BFS
// 	 * @param	  {Variable}	   varParent	 Parent of the node containing the 'interesting variable'
	 
// 	 * @return	 {[Variable]}  List of variable added to the graph
// 	 */
// 	// processVar(astObj, variableNode, varParent) {
// 	//	 if (varParent && varParent.type === 'VariableDeclaration') {
// 	//		 return varParent.declarations.map(decl => this.processVarsFromAssignmentExpression(astObj, variableNode,
// 	//				 decl.id, decl.init))
// 	//			 .flatten();
// 	//	 } else if (varParent && varParent.type === 'AssignmentExpression') {
// 	//		 return this.processVarsFromAssignmentExpression(astObj, variableNode, varParent.left, varParent.right);
// 	//	 }
// 	//	 return [];
// 	// }

// 	*
// 	 * Enriches the graph with the reference of a given variable
// 	 *
// 	 * @param	  {AST}			astObj		The ast object
// 	 * @param	  {tern's ref}	 ref		   The reference
// 	 * @param	  {varGraph node}  variableNode  The node containing the 'interesting variable' for the BFS
// 	 *
// 	 * @return	 {[Variable]}  List of variable added to the graph
	 
// 	// processSingleRef(astObj, ref, variableNode) {
// 	// 	let node = astObj.getNodeByLine(astObj.astRoot, ref.start.line);
// 	// 	// we only care about one of them
// 	// 	// so we're taking the last one so that we can use searchUp
// 	// 	node = node[node.length - 1];
// 	// 	// the expression we're looking for is either VariableDeclaration or AssignmentExpression
// 	// 	let varParent = astObj.searchUp(node, 'VariableDeclaration') || astObj.searchUp(node,
// 	// 		'AssignmentExpression');
// 	// 	return this.processVar(astObj, variableNode, varParent);
// 	// }

// 	/**
// 	 * Enriches the graph with references of a given variable
// 	 *
// 	 * @param	  {AST}			astObj		The ast object
// 	 * @param	  {[tern's ref]}   ref		   The reference
// 	 * @param	  {varGraph node}  variableNode  The node containing the 'interesting variable' for the BFS
// 	 *
// 	 * @return	 {[Variable]}  List of variable added to the graph
// 	 */
// 	// processVarsFromRefs(astObj, refs, variable) {
// 	// 	let variableNode = this.getNode(variable, astObj.filename);
// 	// 	console.log(variableNode.getContent()
// 	// 		.scope.block.loc);
// 	// 	console.log(variableNode.getContent()
// 	// 		.loc);
// 	// 	if (!variableNode) {
// 	// 		throw Error('variableNode is undefined or null');
// 	// 	}
// 	// 	return refs.map(ref => this.processSingleRef(astObj, ref, variableNode))
// 	// 		.flatten() // can be a nested list
// 	// 		.filter(v => v); // remove all the nulls, and undefined(s)
// 	// }

// 	/**
// 	 * Helper function. Determines if given scope is in loop
// 	 *
// 	 * @return	 {boolean}  True iff scope in loop.
// 	 */
// 	isScopeInLoop(astObj, scope) {
// 		if (!scope) {
// 			return false;
// 		}
// 		switch (scope.type) {
// 			case 'global': // continue
// 			case 'module': // continue
// 			case 'class':
// 				return false;
// 			case 'for':
// 				return true;
// 			case 'block':
// 				let blockStartLine = scope.block.loc.start.line;
// 				let blockStartNode = astObj.getNodeByLine(astObj.astRoot, blockStartLine);
// 				if (blockStartNode.some((bsn => ['DoWhileStatement', 'WhileStatement'].includes(bsn.type)))) {
// 					return true;
// 				}
// 				// no return or break here on purpose
// 			case 'function': // can be a lambda inside of a loop
// 			case 'switch':
// 				return this.isScopeInLoop(astObj, scope.upper);
// 		}
// 	}

// 	/**
// 	 * Helper function. Determines if the given line is in loop
// 	 * Determines if line in loop.
// 	 *
// 	 * @param	  {<type>}   astObj	  The ast object
// 	 * @param	  {<type>}   lineNumber  The line number
// 	 * @return	 {boolean}  True iff line is in loop.
// 	 */
// 	isLineInLoop(astObj, lineNumber) {
// 		return this.isScopeInLoop(astObj, astObj.scope.get(astObj.getNodeByLine(astObj.astRoot, lineNumber)[0]));
// 	}

// 	/**
// 	 * Adds edge between the variable node passed as param and all the variables in the param varsToAdd
// 	 *
// 	 * @param	  {AST}		 astObj		The ast object
// 	 * @param	  {graph.node}  variableNode  The variable node
// 	 * @param	  {[Variable]}  varsToAdd	 List of variables that affect the variable in `variableNode`
// 	 * 											and thus, should have an edge between them and `variableNode`
// 	 */
// 	addEdgeBetweenVars(astObj, variableNode, varsToAdd) {
// 		// adding compound variables:
// 		// b = foo.bar ==> foo -> foo.bar -> b 
// 		varsToAdd
// 			.filter(v => v instanceof CompoundVariable)
// 			.map(v => v.subVars.concat(null).reduce((dstNode /*acc*/ , curV, curIdx, array) => {
// 				let newVariable = (curV === null) ?
// 					Variable.fromCompoundVariable(v) : // last variable in the chain, should not be compound
// 					CompoundVariable.fromVariable(v, array.slice(0, array.length - curIdx - 1)); // Converting variable to compound variable. Please note that we do not deep copy anything!
// 				let newNode = this.addNode(newVariable, newVariable.filename);
// 				this.addEdge(newNode, dstNode, newVariable.loc[0].start.line);
// 				return newNode;
// 			}, (() => {
// 				// adding the first variable
// 				// e.g., for b = foo.bar.baz, adding foo.bar.baz -> b
// 				let newNode = this.addNode(v, v.filename);
// 				this.addEdge(newNode, variableNode, v.loc[0].start.line);
// 				return newNode;
// 			})()));

// 		// adding non-compound variables
// 		varsToAdd
// 			.map(v => (!(v instanceof CompoundVariable)) &&
// 				this.addEdge(this.addNode(v, astObj.filename),
// 					variableNode, v.loc[0].start.line));
// 	}

// 	/**
// 	 * Retrieving all variables related to the variable passed as param in the given scope
// 	 *
// 	 * @param	  {AST}  astObj						  The ast object
// 	 * @param	  {[escope's references]}  references	The references
// 	 * @param	  {[Compound]Variable}  variable		 The destination variable
// 	 * @param	  {number}  varStartLine				 The destination variable start line
// 	 * @note The library escope didn't support retrieval of references of type MemberExpression (foo.bar.baz)
// 	 * 		So we introduced two minor modifications:
// 	 * 			1. In the file pattern-visitor.js, we added 
// 	 * 				'nodeType === _estraverse.Syntax.MemberExpression'
// 	 * 			   to the function isPattern()
// 	 * 			2. In the file scope.js, the first if statement in the function __referencing() is changed to
// 	 *				if (!node || (node.type !== _estraverse.Syntax.Identifier && node.type !== _estraverse.Syntax.MemberExpression)) {
// 	 *				instead of 
// 	 *				if (!node || node.type !== _estraverse.Syntax.Identifier) {
// 	 * 				 
// 	 * @return	 {[[Compound]Variable]}  List of all the variables related to the `variable` passed as param
// 	 */
// 	processReferencesFromScope(astObj, references, variable, varStartLine) {
// 		let newVarsFromRefs = references
// 			.filter(ref => (ref.hasOwnProperty('writeExpr')) &&
// 				// covers the case of a MemberExpression e.g., foo.bar.baz
// 				(astObj.extractVariables(ref.identifier)[0].getFullName() === variable.name))
// 			.map(ref => astObj.extractVariables(ref.writeExpr))
// 			.flatten()
// 			.filter(v => v) // removing all nulls
// 			.filter(v => { // filter out built in function names
// 				let isFunctionCall = v.isFunctionCall || // v instanceof Variable
// 					(v instanceof CompoundVariable) && (v.subVars.some(v2 => v2.isFunctionCall)) // v instanceof CompoundVariable
// 				if (!isFunctionCall) {
// 					return true;
// 				}
// 				return !BuiltInFuncNames.includes(v.getFullName());
// 			});

// 		let isLineInLoop = this.isLineInLoop(astObj, varStartLine);
// 		if (!isLineInLoop) {
// 			if (!newVarsFromRefs.every(varFromRef => varFromRef.loc.length === 1)) {
// 				throw Error('Something went wrong in getting variables from refs');
// 			}
// 			newVarsFromRefs = newVarsFromRefs.filter(varFromRef => varFromRef.loc[0].start.line < varStartLine);
// 		}

// 		let variableNode = this.getNode(variable, variable.filename);
// 		this.addEdgeBetweenVars(astObj, variableNode, newVarsFromRefs);
// 		return newVarsFromRefs;
// 	}

// 	/**
// 	 * Retrieving all variables related to the variable passed as param in the given scope
// 	 *
// 	 * @param	  {AST}  astObj							 The ast object
// 	 * @param	  {[Compound]Variable}  variable			The destination variable
// 	 * @param	  {escope's scope object}  scope			The scope we work on
// 	 * @param	  {number}  varStartLine					The destination variable start line
// 	 * @param	  {[escope's scope object]} scopesToIgnore  The inner scopes we already visited, which we don't want to visit again. 
// 	 * 													 This prevents an infinite loop.
// 	 *
// 	 * @return	 {[[Compound]Variable]}  List of all the variables related to the `variable` passed as param
// 	 */
// 	processScope(astObj, variable, scope, varStartLine, scopesToIgnore) {
// 		varStartLine = varStartLine || variable.loc[0].start.line;
// 		if (!variable.loc.some(l => l.start.line === varStartLine)) {
// 			throw Error('Invalid line number of variable!');
// 		}

// 		// getting both the current scope, and the child scopes. otherwise, the inner scope will not be visible.
// 		// e.g., function foo() { while (8) { var a = 4; }}
// 		// excluding the scopes in `scopesToIgnore`
// 		let references = scope.childScopes.concat(scope)
// 			.filter(s => !scopesToIgnore.includes(s))
// 			.map(s => s.references)
// 			.flatten();
// 		return this.processReferencesFromScope(astObj, references, variable, varStartLine);
// 	}

// 	/**
// 	 * Enriches the graph with variables from the given AST
// 	 *
// 	 * @param	  {AST}   astObj  The ast object
// 	 */
// 	async processSingleAST(astObj) {
// 		var interestingVars = this.dstNodesIds.map(id => this.getGraphNode(id).getContent()).splice(0);
// 		var visited = [];
// 		while (interestingVars.length > 0) {
// 			var curVar = interestingVars.shift();
// 			try {
// 				if (curVar.filename !== astObj.filename) {
// 					continue;
// 				}

// 				var scope = curVar.scope;
// 				let visitedScopes = [];
// 				let newVars = [];
// 				while (scope && !['global', 'module'].includes(scope.type)) {
// 					newVars = [].concat(newVars, this.processScope(astObj, curVar, scope,
// 						curVar.loc[0].start.line /*varStartLinem*/ , visitedScopes /*scopesToIgnore*/ ));
// 					visitedScopes.push(scope);
// 					scope = scope.upper;
// 				}
// 				interestingVars = [].concat(interestingVars, newVars).getUniqByCmpFunc(n => n.name);

// 				// let newVars = this.processVarsFromRefs(astObj, refs, curVar);
// 				// visited.push(curVar.name + curVar.filename);

// 				// // node is a function call, which we'll 
// 				// // handle later once the call graph is built
// 				// newVars = newVars.filter(n => !n.isFunctionCall)
// 				//	 .filter(n => !visited.includes(n.name + n.filename));
// 				// interestingVars = [].concat(interestingVars, newVars)
// 				//	 .getUniqByCmpFunc(n => n.name);
// 			} catch (e) {
// 				if (e.name === 'TernError') {
// 					log.error('TernError. For var:', curVar.name);
// 				} else {
// 					log.error(e, 'for var:', curVar.name);
// 				}
// 			}
// 		}
// 	}

// 	/**
// 	 * Gets the minimum distance to the closest destination node from the given node
// 	 *
// 	 * @param	  {Variable} variable  The variable to get the destination from
// 	 * @return	 {number}   The minimum distance to destination node from the given variable
// 	 */
// 	_getMinDistToDestNode(variable) {
// 		++counter;
// 		// find all edges containing this variable as the src
// 		var relevantEdges = this.getGraphEdges()
// 			.filter(e => e.nodeStart.getContent().getFullName() === variable.getFullName() &&
// 				e.nodeStart.getContent().filename === variable.filename);
// 		return Math.min(variable.distToDst, (relevantEdges.map(edge => 1 + this._getMinDistToDestNode(edge.nodeEnd.getContent()))).min());
// 	}

// 	/**
// 	 * Initializes the minimal destination of each node in the graph to the nearest destination node
// 	 */
// 	initDistToDst() {
// 		console.log(this.toString());
// 		this.getNodes()
// 			.map(n => n.getContent())
// 			.map(n => Object.assign(n, {
// 				distToDst: this._getMinDistToDestNode(n)
// 			}));
// 	}

// 	/**
// 	 * Returns a string representation of the object.
// 	 */
// 	toString() {
// 		return super.getGraphEdges()
// 			.map(e => {
// 				let startNode = e.getNodeStart()
// 					.getContent();
// 				let endNode = e.getNodeEnd()
// 					.getContent();

// 				return '{0}[{1}][{2}] ^{6}-> {3}[{4}][{5}]'.format(
// 					startNode.getFullName(),
// 					startNode.type.join(','),
// 					startNode.distToDst,
// 					endNode.getFullName(),
// 					endNode.type.join(','),
// 					endNode.distToDst,
// 					e.getWeight())
// 			})
// 			.join('\n');
// 	}

// 	/**
// 	 * Retrieves all variables with the 'isEntryInput' flag set
// 	 *
// 	 * @param	  {string}  filename  Name of the file 
// 	 * @return	 {[Variable]}  The variables with the 'isEntryInput' flag set
// 	 */
// 	getEntryInputs(filename) {
// 		let varsFromFile = this.getVarsFromFile(filename);
// 		return varsFromFile.map(n => n.getContent())
// 			.filter(n => n.isEntryInput);
// 	}

// 	/**
// 	 * Retrieves all variables from a certain file.
// 	 *
// 	 * @param	  {string}  filename  Name of the file 
// 	 * @return	 {[Variable]}  The variables from file.
// 	 */
// 	getVarsFromFile(filename) {
// 		return this.getNodes()
// 			.filter(n => n.getContent()
// 				.filename === filename);
// 	}

// 	/**
// 	 * Retrieves a mapping between a variable's name and a pointer to the instance of the Variable class 
// 	 *
// 	 * @param	  {string}  filename  Name of the file 
// 	 * @return	 {[string:Variable]}  Mapping between a variable's name and a pointer to the 
// 	 * instance of the Variable class 
// 	 */
// 	getNameToVarMap(filename) {
// 		let varsFromFile = this.getVarsFromFile(filename);
// 		var out = [];
// 		for (let v of varsFromFile) {
// 			out[v.getContent()
// 				.name] = v.getContent();
// 		}
// 		return out;
// 	}

// 	/**
// 	 * Retrieves the minimal distance to one of the destination nodes by an id of a node
// 	 *
// 	 * @param	  {string}  nodeId  The node identifier
// 	 * @return	 {[number]}  The distance to destination.
// 	 */
// 	getDistToDstById(nodeId) {
// 		return this.getNodes()
// 			.filter(n => n.getId() === nodeId)
// 			.map(n => n.getContent()
// 				.distToDst);
// 	}

// 	/**
// 	 * Retrieves the minimal distance to one of the destination nodes by a name of a variable
// 	 *
// 	 * @param	  {string}  varName  Variable name
// 	 * @param	  {string}  filename  Name of the file
// 	 * @return	 {[number]}  The distance to destination.
// 	 */
// 	getDistToDstByVar(varName, filename) {
// 		return this.getVarsFromFile(filename)
// 			.filter(n => n.getcontent()
// 				.name === varName)
// 			.map(n => n.getcontent()
// 				.distToDst);
// 	}

// 	merge(rhsVarGraph) {
// 		// TODO: implement
// 	}
// }

// exports.VarGraph = VarGraph;
// exports.Variable = Variable;
// exports.CompoundVariable = CompoundVariable;