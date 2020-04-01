// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');

/**
 * Instrumenter used to determine whether an execution reached a certain set of lines
 */
class MultipleSuccessInstrumenter extends Instrumenter.AbstractInstrumenter {
	constructor(targetLines, targetAst) {
		super('MultipleSuccessInstrumenter');
		this.targetLines = targetLines;
		this.targetAst = targetAst;
		this.targetASTNodePtrs = null;
	}

	init() {
		// translate the line number to an ast node
		this.targetASTNodePtrs = this.targetLines.map(lineNum => {
			return {
				lineNum: lineNum,
				astNodePtr: this.targetAst.getNodeByLine(this.targetAst.astRoot, lineNum)[0]
			}
		});
	}

	initGlobalStorage() {
		global[this.getGlobalStorageName()] = [];
	}

	getGlobalStorageName() {
		if (!this.storageName) {
			this.storageName = '__fuzzer_success__' + this.targetAst.filename.replace(/\W/g, '');
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

module.exports = MultipleSuccessInstrumenter;
