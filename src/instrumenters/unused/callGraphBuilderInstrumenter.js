// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');
const Utils = require('../common/utils');
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
			this.globalStorageName = '__call_graph__' + Math.randomString(5, 16);
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
					astObj.allFuncsDecls.map(funcPtr => 
						new Instrumenter.InstrumentationData(
							astObj,
							funcPtr.node.body,
							`${this.getGlobalStorageName()}.push((new Error()).stack)`,
							Instrumenter.InstrRelation.prepend)

					)
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