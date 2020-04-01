// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');
const logger = require('../common/logger');

/**
 * Instrumenter used to gather the cookies from an expressjs project
 */
class CookieMonster extends Instrumenter.AbstractInstrumenter {
	constructor() {
		super('CookieMonster');
	}

	init(project, expert) {
		this.project = project;
		this.expert = expert;
	}

	initGlobalStorage() {
		global[this.getGlobalStorageName()] = [];
	}

	getGlobalStorageName() {
		if (!this.globalStorageName) {
			this.globalStorageName = '__cookie_monster_collects_cookies__' + Math.randomString(5, 16);
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
				this.expert.plugin.middleware.map(mw => {
					let astObj = this.project.astObjList.find(astObj => astObj.filename === mw.filename);
					return mw.funcsPtrs.map(funcPtr => new Instrumenter.InstrumentationData(
						astObj, // this was mw.filename! This might be wrong!
						funcPtr.body,
						'(req && req.cookies && {0}.push(req.cookies));'.format(this.getGlobalStorageName()),
						Instrumenter.InstrRelation.prepend));
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

module.exports = CookieMonster;