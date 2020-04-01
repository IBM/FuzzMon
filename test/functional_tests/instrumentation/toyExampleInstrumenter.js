// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
'use strict';

const path = require('path');
const JSFuzzDir = process.env.JSFUZZ_DIR;
const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');
const Instrumenter = require(path.join(JSFuzzSrcDir, 'instrumenters')).Instrumenter;

/**
 * Instrumenter used to gather the cookies from an expressjs project
 */
class ToyExampleInstrumenter extends Instrumenter.AbstractInstrumenter {
	constructor() {
		super('ToyExampleInstrumenter');
	}

	init(project) {
		this.astObj = project.astObjList[0];
	}

	initGlobalStorage() {
		global[this.getGlobalStorageName()] = [];
	}

	getGlobalStorageName() {
		if (!this.globalStorageName) {
			this.globalStorageName = '__toy_example_instrumenter__';
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
				[new Instrumenter.InstrumentationData(
					this.astObj, // this was mw.filename! This might be wrong!
					this.astObj.astRoot.body[this.astObj.astRoot.body.length - 2],
					'testFunc = () => "gabaza"',
					Instrumenter.InstrRelation.append)];
		}
		return this.outInstrumentationData;
	}

	resetGlobalStorage() {
		this.initGlobalStorage();
	}
}

module.exports = ToyExampleInstrumenter;