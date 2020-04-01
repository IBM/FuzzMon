// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');
const logger = require('../common/logger');

class CallGraphBuilderInstrumenter extends Instrumenter.AbstractInstrumenter {
	constructor() {
		super('CallGraphBuilderInstrumenter');
	}

	init(project) {
		this.astObjList = project.astObjList;
	}

	initGlobalStorage() {
		global[this.getGlobalStorageName()] = [];
	}

	getGlobalStorageName() {
		if (!this.globalStorageName) {
			this.globalStorageName = '__current_path_call_graph__' + Math.randomAlphaNumeric(5);
		}
		return this.globalStorageName;
	}

	getGlobalStorage() {
		return global[this.getGlobalStorageName()];
	}

	collectInstrumentationData() {
		this.initGlobalStorage();
		if (!this.outInstrumentationData) {
			this.outInstrumentationData =
				this.astObjList.map(astObj =>
					astObj.allFuncsDecls
					// during the de-anonimization process we created a situation where each function can have 2 different names
					// e.g., var random = function() { return 4;}
					// turns into var random = function currentfilenamejs_anonymous_7() { return 4;}
					// so here we screen out these duplicates
					.getUniqByCmpFunc(funcDeclPtr => funcDeclPtr.node) 
					.map(funcDeclPtr => new Instrumenter.InstrumentationData(
						astObj,
						funcDeclPtr.node.body,
						`${this.getGlobalStorageName()}.push({filename: __filename, 
								func: ${funcDeclPtr.name}, 
								caller: ${funcDeclPtr.name}.caller, 
								line:${funcDeclPtr.loc.start.line}})`,
						Instrumenter.InstrRelation.prepend))
				).flatten()
				.filter(n => n);
		}
		return this.outInstrumentationData;
	}

	resetGlobalStorage() {
		this.initGlobalStorage();
	}
}

module.exports = CallGraphBuilderInstrumenter;
