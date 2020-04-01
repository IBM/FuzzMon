// // Licensed Materials - Property of IBM
// // (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// // IBM-Review-Requirement: Art30.3 marking
// // Developed by Benny Zeltser at Haifa Research Lab
// 	// extractReturnStatementsConditions(funcNode) {
// 	//     let returnStatements = this.searchDown(funcNode.body, 'ReturnStatement');
// 	//     let out = [];
// 	//     for (let retStatement of returnStatements) {
// 	//         let statement = this.extractVariables(retStatement.argument);
// 	//         if (statement) {
// 	//             if (statement instanceof Array) {
// 	//                 out = [].concat(statement, out);
// 	//             } else {
// 	//                 out.push(statement);
// 	//             }
// 	//         }
// 	//     }
// 	//     return out;
// 	// }

// 	/**
// 	 * Extracts all variables from binary expression
// 	 *
// 	 * @param      {esprima node}  binExprNode  The node to extract the variables from
// 	 * @return     {[Variable]}    List of variables that appear under the given node
// 	 */
// 	extractVariablesFromBinaryExpr(binExprNode) {
// 		let out = [];
// 		for (let direct of['left', 'right']) {
// 			let statement = this.extractVariables(binExprNode[direct]);
// 			if (statement) {
// 				if (statement instanceof Array) {
// 					out = [].concat(statement, out);
// 				} else {
// 					out.push(statement);
// 				}
// 			}
// 		}
// 		return out.flatten();
// 	}

// 	/**
// 	 * Extracts all variables from a function call
// 	 *
// 	 * @param      {esprima node}  funcNode  The node to extract the variables from
// 	 * @return     {[Variable]}    List of variables that appear under the given node
// 	 */
// 	extractVariablesFromFunctionCall(funcNode) {
// 		let funcArgsVars = [];
// 		if (funcNode.arguments) {
// 			for (let arg of funcNode.arguments) {
// 				if ('SpreadElement' === arg.type) {
// 					arg = arg.argument;
// 				}
// 				funcArgsVars = [].concat(funcArgsVars, this.extractVariables(arg));
// 			}
// 		}
// 		let callee = this.extractVariables(funcNode.callee);
// 		if (!callee || callee.length !== 1) {
// 			throw 'Failed to extract callee data (in extractVariablesFromFunctionCall)';
// 		}
// 		callee = callee[0];
// 		if (callee instanceof CompoundVariable) {
// 			callee.subVars[callee.subVars.length - 1].isFunctionCall = true;
// 		} else {
// 			callee.isFunctionCall = true;
// 		}
// 		return [].concat(funcArgsVars, callee);
// 	}

// 	/**
// 	 * Extracts all variables from a given node
// 	 *
// 	 * @param      {esprima node}  node  The node to extract the variables from
// 	 * @return     {[Variable]}    List of variables that appear under the given node
// 	 */
// 	extractVariables(node) {
// 		try {
// 			if (!node) {
// 				return null;
// 			}
// 			if (statementTypes.includes(node.type)) {
// 				return this.extractVariablesFromStatement(node);
// 			} else if (expressionTypes.includes(node.type)) {
// 				return this.extractVariablesFromExpression(node);
// 			}
// 		} catch (e) {
// 			console.log('Failed to extract variable from line', node.loc.start.line);
// 			const escodegen = require('escodegen');
// 			console.log(escodegen.generate(node));
// 			console.trace();
// 			throw e;
// 		}
// 	}

// 	/**
// 	 * Extracts all variables from a given variable declaration
// 	 *
// 	 * @param      {esprima node}  statement  The node to extract the variables from
// 	 * @return     {[Variable]}    List of variables that appear under the given node
// 	 */
// 	extractVariablesFromVariableDeclaration(statement) {
// 		let result = [];
// 		for (let decl of statement.declarations) {
// 			result = result.concat(this.extractVariables(decl));
// 		}
// 		return result;
// 	}

// 	/**
// 	 * Extracts all variables from a given statement list 
// 	 *
// 	 * @param      {esprima node}  statementList  The node to extract the variables from
// 	 * @return     {[Variable]}    List of variables that appear under the given node
// 	 */
// 	extractVariablesFromStatementList(statementList) {
// 		let result = [];
// 		for (let stmt of statementList) {
// 			result = result.concat(this.extractVariables(stmt));
// 		}
// 		return result;
// 	}

// 	/**
// 	 * Extracts all variables from a given statement
// 	 *
// 	 * @param      {esprima node}  statement  The node to extract the variables from
// 	 * @return     {[Variable]}    List of variables that appear under the given node
// 	 */
// 	extractVariablesFromStatement(statement) {
// 		if (!statement) {
// 			return null;
// 		}
// 		if (!statementTypes.includes(statement.type)) {
// 			throw "Invalid statement type: " + (expression.type);
// 		}

// 		switch (statement.type) {
// 			case 'VariableDeclaration':
// 				return this.extractVariablesFromVariableDeclaration(statement);
// 			case 'VariableDeclarator':
// 				// can be a "binding pattern"
// 				return [].concat(this.extractVariables(statement.id), this.extractVariables(statement.init));
// 			case 'IfStatement':
// 				return [].concat(this.extractVariables(statement.test),
// 					this.extractVariables(statement.consequent),
// 					this.extractVariables(statement.alternate));
// 			case 'BlockStatement':
// 				return this.extractVariablesFromStatementList(statement.body);
// 			case 'ExpressionStatement':
// 				return this.extractVariables(statement.expression);
// 			case 'FunctionDeclaration':
// 				return this.extractVariablesFromStatementList(statement.params);
// 			case 'ReturnStatement':
// 				return this.extractVariables(statement.argument);
// 				// case 'SwitchCase':
// 				//     console.log(statement);
// 				//     console.log(this.filename);
// 				//     process.exit(3453454);
// 				//     // return [].concat(this.extractVariables(statement.test));
// 				// case 'TryStatement':
// 				//     console.log(statement);
// 				//     console.log(this.filename);
// 				//     process.exit(4234234);
// 				//     return 
// 			case 'SwitchStatement':
// 				return this.extractVariables(statement.discriminant);
// 			default:
// 				throw 'Unsupported statement type: ' + (statement.type);
// 		}
// 	}

// 	*
// 	 * Extracts all variables from a given member expression
// 	 *
// 	 * @param      {esprima node}  expression  The node to extract the variables from
// 	 * @return     {[Variable]}    List of variables that appear under the given node
	 
// 	extractVariablesFromMemberExpression(expression) {
// 		let propertyExpr = this.extractVariables(expression.property);
// 		if (propertyExpr) {
// 			propertyExpr = propertyExpr.flatten();
// 		}
// 		let objectExpr = this.extractVariables(expression.object);
// 		if (objectExpr.length > 1) {
// 			console.log(objectExpr);
// 			return null;
// 			// process.exit(34);
// 		}
// 		if (!objectExpr || (objectExpr.length !== 1)) {
// 			throw 'Unsupported object or property in extractVariablesFromMemberExpression in expression';
// 		}
// 		objectExpr = objectExpr[0];
// 		let objectName = objectExpr.name;
// 		if (propertyExpr) {
// 			if (!propertyExpr instanceof Array) {
// 				propertyExpr = [propertyExpr];
// 			}
// 			if (objectExpr instanceof CompoundVariable) {
// 				objectExpr.subVars = objectExpr.subVars.concat(propertyExpr);
// 				return [objectExpr];
// 			} else {
// 				return [new CompoundVariable(objectName, // objectName
// 					propertyExpr, // subVars
// 					objectExpr.node, // node
// 					objectExpr.scope, // scope
// 					objectExpr.loc, // loc
// 					objectExpr.type, // type
// 					this.filename)]; // filename
// 			}
// 		} else {
// 			return [new Variable(objectName, // name
// 				objectExpr.node, // node
// 				objectExpr.scope, // scope
// 				objectExpr.loc, // loc
// 				objectExpr.type, // type
// 				this.filename)]; // filename
// 		}
// 	}

// 	extractVariablesFromFunctionExpression(expression) {
// 		var funcName = this.extractVariables(expression.id);
// 		var res = expression.params
// 			.map(param => this.extractVariables(param))
// 			.flatten();
// 		if (funcName) { // will be null in case of isFromArrowFuncExpr
// 			if (funcName.length > 1) {
// 				throw 'A function cannot have more than one name. Something went wrong here';
// 			}
// 			funcName = funcName[0];
// 			funcName.isFunctionCall = true;
// 			res.push(funcName);
// 		}
// 		return res;
// 	}

// 	/**
// 	 * Extracts all variables from a given general expression
// 	 *
// 	 * @param      {esprima node}  expression  The node to extract the variables from
// 	 * @return     {[Variable]}    List of variables that appear under the given node
// 	 */
// 	extractVariablesFromExpression(expression) {
// 		if (!expression) {
// 			return null;
// 		}
// 		if (!expressionTypes.includes(expression.type)) {
// 			throw "Invalid expression type: " + (expression.type);
// 		}
// 		switch (expression.type) {
// 			case 'BinaryExpression': // x + y
// 			case 'AssignmentExpression': // a+=2
// 				return this.extractVariablesFromBinaryExpr(expression);
// 			case 'Identifier': // x
// 				return [new Variable(expression.name, expression, this.scope.get(expression), expression.loc, null,
// 					this.filename)];
// 			case 'CallExpression': // foo(x)
// 				return this.extractVariablesFromFunctionCall(expression);
// 			case 'UpdateExpression': // x++
// 				return [new Variable(expression.argument.name, expression.argument, this.scope.get(expression),
// 					expression.loc, null, this.filename)];
// 			case 'MemberExpression': // arrayName.length or this.something
// 				return this.extractVariablesFromMemberExpression(expression);
// 			case 'ThisExpression': // this
// 				return [new Variable('this', expression, this.scope.get(expression), expression.loc, null, this.filename)];
// 			case 'Literal': // 8
// 				if (!isNaN(expression.value) || expression.value.includes(' ') /* there can't be a space in prop. name */ ) {
// 					return null;
// 				}
// 				// The following is for the case:
// 				// a = {b: 1};
// 				// a["b"] = 234;
// 				return [new Variable(expression.value, expression, this.scope.get(expression), expression.loc, null,
// 					this.filename)];
// 			case 'LogicalExpression': // a + b
// 				return [].concat(['left', 'right'].map(v => this.extractVariables(expression[v]))
// 					.flatten());
// 			case 'UnaryExpression':
// 				return this.extractVariables(expression.argument);
// 			case 'FunctionExpression':
// 			case 'ArrowFunctionExpression':
// 				return this.extractVariablesFromFunctionExpression(expression);
// 			case 'MethodDefinition':
// 				return this.extractVariablesFromFunctionExpression(expression.value);
// 			default:
// 				throw 'Unsupported expression type: ' + (expression.type);
// 		}
// 	}

// 	/**
// 	 * @param      {esprima node}  callExpression  Esprima node containing a call expression
// 	 * @return     {string}  Name of the callee
// 	 */
// 	getCalleeName(callExpression) {
// 		if ('CallExpression' !== callExpression.type) {
// 			throw 'Node type should be `CallExpression`';
// 		}

// 		if (!callExpression['callee']) {
// 			throw 'Node should have a `callee` member';
// 		}

// 		let calleeName = this.sourceCode.substring(callExpression.callee.range[0], callExpression.callee.range[1]);
// 		return calleeName;
// 		// return this.allFuncsDecls.find(fDecl => fDecl.name === calleeName.split(/[.]+/).pop());

// 		// switch (node.callee.type) {
// 		//     case 'Identifier':
// 		//     case 'MemberExpression':
// 		//         let calleeVar = this.extractVariables(node.callee);
// 		//         if (calleeVar.length !== 1) {
// 		//             throw 'Something went wrong `calleeVar.length !== 1`';
// 		//         }
// 		//         calleeVar = calleeVar[0];
// 		//         return calleeVar ? calleeVar.name : null;
// 		//     default:
// 		//         throw 'Unsupported type: ' + (node.callee.type);
// 		// }
// 	}

// 	/**
// 	 * Gets the chain to the root.
// 	 *
// 	 * @param      {esprima node}  node    The node to start the chain from
// 	 * @return     {[esprima node]}   The chain to root.
// 	 */
// 	getChainToRoot(node) {
// 		var result = [];
// 		while (node) {
// 			result.push(node);
// 			node = node.parent;
// 		}
// 		return result;
// 	}

// 	/**
// 	 * Gets the chain from a src node to a dst node.
// 	 *
// 	 * @param      {esprima node}  src     The source
// 	 * @param      {esprima node}  dst     The destination
// 	 * @return     {[esprima node]}   The chain from src to dst.
// 	 */
// 	getChainToNode(src, dst) {
// 		var result = [];
// 		while (src && dst && (src !== dst)) {
// 			result.push(src);
// 			src = src.parent;
// 		}
// 		return result;
// 	}

