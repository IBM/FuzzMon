// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');
const config = require('../config');

/**
 * Instrumenter for getting the coverage of each execution
 */
class CoverageInstrumenter extends Instrumenter.AbstractInstrumenter {
	constructor() {
		super('CoverageInstrumenter');
		this.expressionsToInstrument = ['IfStatement', 'ConditionalExpression', 'LogicalExpression', 'SwitchCase'];

		this.options = {
			hashBits: config.coverageBits,
			hashName: '__coverage__',
		};
	}

	init(project) {
		this.astObjList = project.astObjList;
	}

	createRandomID() {
		return Math.floor(Math.random() * (1 << this.options.hashBits));
	}

	getPrevStateName() {
		return this.options.hashName + '_prevState';
	}

	initGlobalStorage() {
		global[this.getPrevStateName()] = 0;
		if (!global[this.options.hashName]) {
			global[this.options.hashName] = new Uint8Array(1 << this.options.hashBits);
		}
		global[this.options.hashName].fill(0);
	}

	getGlobalStorage() {
		return global[this.options.hashName];
	}

	collectInstrumentationData() {
		this.initGlobalStorage();
		if (!this.toInstrument) {
			let currentASTWorkingOn = '';
			let allASTNodesToInstrument = [];
			let enterCallback = (node) => {
				let astNodesToInstrument = [];
				switch (node.type) {
					case 'IfStatement':
						node.consequent && astNodesToInstrument.push(node.consequent);
						node.alternate && node.alternate.type !== 'IfStatement' && astNodesToInstrument.push(node.alternate);
						// "else if" will be traversed when visit "node.alternate"
						break;
					case 'SwitchCase':
						astNodesToInstrument.push(node.consequent[0]);
						break;
					case 'WhileStatement':
					case 'ForOfStatement':
					case 'ForInStatement':
					case 'ForStatement':
					case 'ArrowFunctionExpression':
						astNodesToInstrument.push(node.body);
						break;
					case 'TryStatement':
						node.block && astNodesToInstrument.push(node.block);
						node.finalizer && astNodesToInstrument.push(node.finalizer);
						break;
					case 'CatchClause':
						astNodesToInstrument.push(node.body);
						break;
					// case 'ConditionalExpression':
					// 	node.consequent && astNodesToInstrument.push(node.consequent);
					// 	node.alternate && astNodesToInstrument.push(node.alternate);
					// 	break;
				}
				astNodesToInstrument.map(astNodePtr => allASTNodesToInstrument.push({
					astObj: currentASTWorkingOn,
					astNode: astNodePtr
				}));
			}

			this.astObjList.map(astObj => {
				currentASTWorkingOn = astObj;
				astObj.traverse(astObj.astRoot, enterCallback);
			});

			this.toInstrument = allASTNodesToInstrument.map(astNodeToInstrument => {
				let id = this.createRandomID() + 1; // making sure it's not zero
				let value = '({0}[{1} ^ {2}]++, {3} = {2})'
					.format(this.options.hashName, this.getPrevStateName(), id, this.getPrevStateName());
				return new Instrumenter.InstrumentationData(astNodeToInstrument.astObj,
					astNodeToInstrument.astNode,
					value,
					Instrumenter.InstrRelation.prepend);
			});
		}
		return this.toInstrument;
	}

	resetGlobalStorage() {
		this.initGlobalStorage();
	}
}

module.exports = CoverageInstrumenter;