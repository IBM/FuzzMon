// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');
const Utils = require('../common/utils');

/**
 * Instrumenter which aims to dynamically detect properties of objects, and their types
 */
class ObjectTypesInstrumenter extends Instrumenter.AbstractInstrumenter {
	// constructor() {
	// 	super('ObjectTypesInstrumenter');
	// }

	// init(project) {
	// 	this.varGraph = project.varGraph;
	// }

	// initGlobalStorage() {
	// 	this.globalStorageName = Instrumenter.createRandomInstGlobalObjName();
	// 	global[this.globalStorageName] = [];
	// 	// Recursively determines the type of the object, and its properties
	// 	this.getObjTypeFuncName = Instrumenter.createRandomInstGlobalObjName();
	// 	global[this.getObjTypeFuncName] = Utils.extractObjectType;
	// }

	// getGlobalStorage() {
	// 	return global[this.globalStorageName];
	// }

	// collectInstrumentationData() {
	// 	this.initGlobalStorage();
	// 	let varsToInstrument = this.varGraph.getNodes()
	// 		.map(n => n.getContent())
	// 		.filter(n => (!n.isFunctionCall) && (n.type.includes('object')));
	// 	console.log('varsToInstrument.length:', varsToInstrument.length);
	// 	return varsToInstrument
	// 		.map(n =>
	// 			n.loc.map(curLoc =>
	// 				new Instrumenter.InstrumentationData(n.filename,
	// 					curLoc.start.line,
	// 					'{0}[\'{1}\'] = [];\n\
 //                         {0}[\'{1}\'][{2}] = (typeof {1} !== \'object\') ? null : {3}({1});'.format(this.globalStorageName, n.name, curLoc.start.line, this.getObjTypeFuncName),
	// 					Instrumenter.InstrRelation.after)
	// 			)
	// 		).flatten();
	// }

	// resetGlobalStorage() {
	// 	global[this.globalStorageName] = [];
	// }
}


module.exports = ObjectTypesInstrumenter;