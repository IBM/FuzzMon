// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');

/**
 * Instrumenter used to determine whether an execution reached a certain set of lines
 */
class PathTraversalInstrumenter extends Instrumenter.AbstractInstrumenter {
	constructor(project) {
		super('PathTraversalInstrumenter');
		this.project = project;
		this.targetFunctions = {
			'child_process': ['execFile'],
			'fs': ['appendFile', 'appendFileSync', 'writeFile', 'writeFileSync', 'open', 'openSync', 'unlink', 'unlinkSync']
		};
	}

	initSingleFile(astObj) {
		return Object.keys(this.targetFunctions).map(moduleName =>
				this.targetFunctions[moduleName]
				.map(funcName => astObj.getCallsToFunc(astObj.astRoot, funcName))
				.flatten()
				// // .map(nodePtr => nodePtr.parent)
				// .filter(callExprNode => {
				// 	console.log('#######', callExprNode.callee);
				// })
				// 	return callExprNode.callee.object.name === moduleName || // all the cases of fs.writeFile
				// 		(callExprNode.callee.object.name === 'require' && callExprNode.callee.object.arguments[0].value === moduleName)
				// }) // all the cases of require('fs').writeFile
			)
			.flatten()
			.filter(n => n);
	}

	init() {
		let toInstrument = this.project.astObjList.map(astObj => {
			return {
				astPtr: astObj,
				nodes: this.initSingleFile(astObj)
			}
		}).filter(item => item.nodes && item.nodes.length > 0);

		toInstrument.map(item => {
			console.log(item.astPtr.filename, item.nodes.map(n => n.loc.start.line).join('; '));
		});
		process.exit(5);
	}

	initGlobalStorage() {
		global[this.getGlobalStorageName()] = [];
	}

	getGlobalStorageName() {
		if (!this.storageName) {
			this.storageName = '__fuzzer_success__'; // + this.targetAst.filename.replace(/\W/g, '');
		}
		return this.storageName;
	}

	getGlobalStorage() {
		return global[this.getGlobalStorageName()];
	}

	collectInstrumentationData() {
		this.initGlobalStorage();
		if (!this.toInstrument) {
			this.toInstrument = this.targetASTNodePtrs.map(targetLineAndASTNode =>
				new Instrumenter.InstrumentationData(this.targetAst, targetLineAndASTNode.astNodePtr,
					`${this.getGlobalStorageName()}[${targetLineAndASTNode.lineNum}] = true`,
					Instrumenter.InstrRelation.prepend));
		}
		return this.toInstrument;
	}

	resetGlobalStorage() {
		this.initGlobalStorage();
	}
}

module.exports = PathTraversalInstrumenter;