// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');

/**
 * Instrumenter for getting statistics about variables we find interesting
 */
class InterestingVarCountInstrumenter extends Instrumenter.AbstractInstrumenter {
	// constructor() {
	// 	super('InterestingVarCountInstrumenter');
	// 	this.isInitialized = false;
	// }

	// init(project) {
	// 	this.astObjList = project.astObjList;
	// }

	// initGlobalStorage() {
	// 	this.globalStorageName = Instrumenter.createRandomInstGlobalObjName();
	// 	global[this.globalStorageName] = [];
	// 	this.varGraph.getNodes().map(n => global[this.globalStorageName][n.getId()] = 0);
	// 	this.isInitialized = true;
	// }

	// getGlobalStorage() {
	// 	return global[this.globalStorageName];
	// }

	// collectInstrumentationData() {
	// 	this.initGlobalStorage();
	// 	return this.varGraph.getNodes()
	// 		.filter(n => !n.getContent().isFunctionCall)
	// 		.map(n => n.getContent().loc.map((curLoc) =>
	// 			new Instrumenter.InstrumentationData(n.getContent().filename,
	// 				curLoc.start.line,
	// 				'({0}[\'{1}\'])++;'.format(this.globalStorageName, n.getId()),
	// 				Instrumenter.InstrRelation.after)
	// 		)).flatten();
	// }

	// resetGlobalStorage() {
	// 	if (!this.isInitialized) {
	// 		this.initGlobalStorage();
	// 	}
	// 	Object.keys(global[this.globalStorageName]).map((key, value) => global[this.globalStorageName][key] = 0);
	// }
}

module.exports = InterestingVarCountInstrumenter;