// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const AbstractPlugin = require('./abstractPlugin');
const AbstractInput = require('../entities/entities').AbstractInput;
const path = require('path');

class FunctionCall extends AbstractInput {
	constructor(filename, name, paramVals) {
		super();
		this.filename = path.resolve(filename);
		this.name = name;
		this.paramVals = paramVals || [];
	}

	getFilename() {
		return this.filename;
	}

	clone() {
		return new FunctionCall(this.filename, this.name, this.paramVals.map(pVal => pVal.clone()));
	}

	toString() {
		return `FunctionCall : ${this.filename} ${this.name} ${this.paramVals.map(pVal => pVal.toString())}`;
	}
}

class FunctionCallPlugin extends AbstractPlugin {
	constructor() {
		super('FunctionCallPlugin');
	}

	init() {
		/* left blank on purpose */
	}

	getEntryPoints() {
		return [];
	}

	enhanceProjectWithDynamicData() {
		/* left blank on purpose */
	}

	getUserInputInstrumneters() {
		return [];
	}

	getDynamicDataEnhancementInstrumenters() {
		return [];
	}
}

exports.FunctionCallPlugin = FunctionCallPlugin;
exports.FunctionCall = FunctionCall;