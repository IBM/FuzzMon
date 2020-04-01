// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');

/**
 * Instrumenter which aims to dynamically detect types of variables 
 */
class VarTypesInstrumenter extends Instrumenter.AbstractInstrumenter {
	// constructor() {
	// 	super('VarTypesInstrumenter');
	// }

	// init(project) {
	// 	this.varGraph = project.varGraph;
	// }

	// initGlobalStorage() {
	// 	this.globalStorageName = Instrumenter.createRandomInstGlobalObjName();
	// 	global[this.globalStorageName] = [];
	// }

	// getGlobalStorage() {
	// 	return global[this.globalStorageName];
	// }

	// collectInstrumentationData() {
	// 	this.initGlobalStorage();
	// 	let varsToInstrument = this.varGraph.getNodes()
	// 		.map(n => n.getContent())
	// 		.filter(n => (!n.isFunctionCall) && (n.type.includes('?')));

	// 	return varsToInstrument.map(n =>
	// 		n.loc.map(curLoc =>
	// 			new Instrumenter.InstrumentationData(n.filename,
	// 				curLoc.start.line,
	// 				'{0}[\'{1}\'] = [];\n\
 //                    {0}[\'{1}\'][{2}] = typeof {1};'.format(this.globalStorageName, n.getFullName(), curLoc.start.line),
	// 				Instrumenter.InstrRelation.after)
	// 		)
	// 	).flatten();
	// }

	// resetGlobalStorage() {
	// 	global[this.globalStorageName] = [];
	// }
}

module.exports = VarTypesInstrumenter;