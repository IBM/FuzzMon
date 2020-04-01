// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');
const escodegen = require('escodegen');

class HttpUserInputInstrumenter extends Instrumenter.AbstractInstrumenter {
	constructor() {
		super('HttpUserInputInstrumenter');
	}

	init(project) {
		this.project = project;
	}

	initGlobalStorage() {
		global[this.getGlobalStorageName()] = {};
		global['__number_of_input_from_user__'] = 0;
	}

	getGlobalStorageName() {
		if (!this.globalStorageName) {
			this.globalStorageName = '__htttp_input_from_user__' + Math.randomAlphaNumeric(5);
		}
		return this.globalStorageName;
	}

	getGlobalStorage() {
		return global[this.getGlobalStorageName()];
	}

	_getRequestListenerFromCallToCreateServer(callToCreateServerNodePtr) {
		switch (callToCreateServerNodePtr.arguments.length) {
			case 0:
				throw Error('Not yet supported call to `createServer` w/o arguments');
			case 1:
				return callToCreateServerNodePtr.arguments[0]; // no `options`
			case 2:
				// Note: we don't really care about the `options` in createServer
				// or do we?
				return callToCreateServerNodePtr.arguments[1];
			default:
				throw Error('Invalid number of requestListeners in your code!');
		}
	}

	_findCallsToCreateServerByHttpObjName(astObj, httpObjectName) {
		return astObj.searchDown(astObj.astRoot, 'CallExpression', ['callee', 'object', 'name'], httpObjectName)
			.filter(node => node.callee.property.name === 'createServer')
			.map((nodePtr) => {
				return {
					filename: astObj.filename,
					nodePtr: nodePtr
				}
			}).flatten();
	}

	_findCallsToCreateServer() {
		return this.project.astObjList.map(astObj => {
			let requireHttpNode = astObj.getAllRequires()
				.filter(res => res.arguments.every(arg => arg.value === 'http' || arg.value === 'https'))
				.map(node => node.parent);

			let httpObjectNames = requireHttpNode
				.map(node => node && node.id && node.id.name);

			// Please note that `httpObjectNames` is an array as a very bad programmer could write:
			// const a = require('http');
			// const b = require('http');
			// and use them both
			// OR use require('http') and require('https')
			return httpObjectNames
				.map(httpObjectName => this._findCallsToCreateServerByHttpObjName(astObj, httpObjectName))
				.flatten();
		}).flatten()
	}

	collectInstrumentationData() {
		this.initGlobalStorage();
		if (!this.outInstrumentationData) {
			let inputFromUserJson = '{req: req, body : (req.headers["content-length"] > 0 ? require("co-body")(req) : "")}';
			 // {params: req.params, body: req.body, method: req.method, cookies: req.cookies, idx: __number_of_input_from_user__}';
			let requestListenerWrapper =
				`(req, res) => {
					req && ({0}[req.url] ? {0}[req.url].push({1}) : {0}[req.url] = [{1}]);
					req && ++__number_of_input_from_user__;
					({2})(req, res);
			}`.format(this.getGlobalStorageName(), inputFromUserJson, '{0}');
			let callsToCreateServer = this._findCallsToCreateServer();
			this.outInstrumentationData =
				callsToCreateServer.map(callToCreateServer => {
					let astObj = this.project.astObjList.find(astObj => astObj.filename === callToCreateServer.filename);
					let requestListenerNodePtr = this._getRequestListenerFromCallToCreateServer(callToCreateServer.nodePtr);
					let requestListenerNodePtrSrc = escodegen.generate(requestListenerNodePtr);
					return new Instrumenter.InstrumentationData(astObj,
						callToCreateServer.nodePtr.arguments,
						requestListenerWrapper.format(requestListenerNodePtrSrc),
						Instrumenter.InstrRelation.prepend);
				});
		}

		return this.outInstrumentationData;
	}

	resetGlobalStorage() {
		this.initGlobalStorage();
	}
}

module.exports = HttpUserInputInstrumenter;