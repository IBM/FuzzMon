// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const escope = require('escope');
const Utils = require('../common/utils');

class Scope {
	constructor(ast) {
		this.scopeManager = escope.analyze(ast, {
			sourceType: 'module',
			ecmaVersion: 6
		});
	}

	get(node) {
		do {
			var currentScope = this.scopeManager.acquire(node);
			if (node === node.parent) {
				throw Error('What the hell is going on in here?!');
			}
			node = node.parent;
		} while (node && null === currentScope);
		return currentScope;
	}

	getAllScopes() {
		return this.scopeManager.scopes;
	}

	static isLineInScope(scope, lineNum) {
		let start = scope.block.start.line;
		let end = scope.block.end.line;
		return Utils.inRange(lineNum, start, end);
	}
	
	static getLowestCommonScope(scope1, scope2) {
		let tmpScope1 = scope1;
		let tmpScope2 = scope2;
		// Good thing it's not a job interview!
		while (tmpScope1 && !['global', 'module'].includes(tmpScope1.type)) {
			while (tmpScope2 && !['global', 'module'].includes(tmpScope2.type)) {
				if (tmpScope1 === tmpScope2) {
					return tmpScope1;
				}
				tmpScope1 = tmpScope1.upper;
			}
			tmpScope2 = tmpScope2.upper;
		}
	}

	static contains(scope, lineNumber) {
		return Utils.inRange(lineNumber, scope.block.loc.start.line, scope.block.loc.end.line);
	}
}

exports.Scope = Scope;