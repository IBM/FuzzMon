// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const AbstractTarget = require('./abstractTarget');
const Instrumenter = require('../instrumenters');

class LinesTarget extends AbstractTarget {
	/**
	 * Constructs the object.
	 *
	 * @param      {string}    filename     The name of the target file
	 * @param      {[number]}  lineNumbers  List of line numbers that reaching them in the code would mean a target is reached.
	 */
	constructor(filename, lineNumbers) {
		super('LinesTarget');
		this.filename = filename;
		this.lineNumbers = lineNumbers instanceof Array ? lineNumbers : [lineNumbers];
	}

	/**
	 * Initializes the current target
	 */
	init(project) {
		this.astObj = project.astObjList.find(astObj => astObj.filename === this.filename);
		this.instrumenter = new Instrumenter.MultipleSuccessInstrumenter(this.lineNumbers, this.astObj);
		this.instrumenter.init();
	}

	getInstrumenters() {
		return [this.instrumenter];
	}

	getTargetFunctions() {
		if (!this.targetFunctions) {
			let targetASTNodes = this.instrumenter.targetASTNodePtrs.map(item => item.astNodePtr);
			this.targetFunctions = targetASTNodes.map(node => this.instrumenter.targetAst.getContainingFunction(node));
		}
		return this.targetFunctions;
	}

	isTargetReached(resultsList) {
		return this.instrumenter.getGlobalStorage().some(v => v === true);
	}

	eq(rhs) {
		return (this.filename === rhs.filename) && (this.lineNumbers == rhs.lineNumbers);
	}
}

module.exports = LinesTarget;