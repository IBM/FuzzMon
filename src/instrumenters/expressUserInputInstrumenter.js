// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');

class ExpressUserInputInstrumenter extends Instrumenter.AbstractInstrumenter {
	constructor() {
		super('ExpressUserInputInstrumenter');
	}

	init(plugin, project) {
		this.plugin = plugin;
		this.project = project;
	}

	initGlobalStorage() {
		global[this.getGlobalStorageName()] = [];
	}

	getGlobalStorageName() {
		if (!this.globalStorageName) {
			this.globalStorageName = '__express_input_from_user__' + Math.randomAlphaNumeric(5);
		}
		return this.globalStorageName;
	}

	getGlobalStorage() {
		return global[this.getGlobalStorageName()];
	}

	collectInstrumentationData() {
		this.initGlobalStorage();
		if (!this.outInstrumentationData) {
			let funcPtrsAlreadyInstrumented = [];
			this.outInstrumentationData =
				this.plugin.getMiddleware().map(mw => {
					let astObj = this.project.astObjList.find(astObj => astObj.filename === mw.filename);
					let ret = mw.funcsPtrs.map(funcPtr => {
						if (funcPtrsAlreadyInstrumented.find(instrdFuncPtr => instrdFuncPtr.body === funcPtr.body)) {
							return;
						}
						funcPtrsAlreadyInstrumented.push(funcPtr);
						let inputFromUserJson = funcPtr.params[0].name; // usually, it is 'req'
						return new Instrumenter.InstrumentationData(
							astObj,
							funcPtr.body,
							`${inputFromUserJson}.filename = __filename; ${this.getGlobalStorageName()}.push(${inputFromUserJson});`,
							Instrumenter.InstrRelation.prepend);
					}).filter(n => n); // remove nulls and undefined
					return ret;
				})
				.flatten()
				.filter(n => n); // remove nulls and undefined
		}
		return this.outInstrumentationData;
	}

	resetGlobalStorage() {
		this.initGlobalStorage();
	}
}

module.exports = ExpressUserInputInstrumenter;