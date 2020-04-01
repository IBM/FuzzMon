// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');

/**
 * Instrumenter used to determine whether an execution reached a certain line, or not
 */
class SuccessInstrumenter extends Instrumenter.AbstractInstrumenter {
	constructor(targetLine, targetAst) {
		super('SuccessInstrumenter');
		this.targetLine = targetLine;
		this.targetAst = targetAst;
	}

	init() {
		// translate the line number to an ast node
		this.targetASTNodePtr = this.targetAst.getNodeByLine(this.targetAst.astRoot, this.targetLine);
	}

	initGlobalStorage() {
		global[this.getGlobalStorageName()] = false;
	}

	getGlobalStorageName() {
		return '__fuzzer_success__';
	}

	getGlobalStorage() {
		return global[this.getGlobalStorageName()];
	}

	collectInstrumentationData() {
		this.initGlobalStorage();
		if (!this.toInstrument) {
			let value = '{0} = true;'.format(this.getGlobalStorageName());
			this.toInstrument = [new Instrumenter.InstrumentationData(this.targetAst,
				this.targetASTNodePtr,
				value,
				Instrumenter.InstrRelation.prepend)];
		}
		return this.toInstrument;
	}

	resetGlobalStorage() {
		this.initGlobalStorage();
	}
}

module.exports = SuccessInstrumenter;