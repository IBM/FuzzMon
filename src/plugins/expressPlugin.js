// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const url = require('url');
const path = require('path');
const randexp = require('randexp').randexp;

const EntryPoint = require('../entities/entities').EntryPoint;
const EntryParam = require('../entities/entities').EntryParam;
const ExpressUserInputInstrumenter = require('../instrumenters').ExpressUserInputInstrumenter;
const ExpressAllRoutesInstrumenter = require('../instrumenters').ExpressAllRoutesInstrumenter;

const ParamVal = require('../entities/entities').ParamVal;
const Type = require('../entities/entities').Type;
const BodyVal = require('../entities/entities').BodyVal;
const logger = require('../common/logger');
const HttpRequest = require('./httpPlugin').HttpRequest;
const HttpPlugin = require('./httpPlugin').HttpPlugin;
const config = require('../config');
require('../common/utils');

const questionMarkParam = /([\/&?](\w+)=\w+)/g;

class Middleware extends HttpRequest {
	constructor(filename, method, originalPath, path, funcsPtrs, headers, cookie, paramVals, routeParamVals, bodyVal) {
		super(filename, method.toLowerCase(), path, headers, cookie, paramVals, bodyVal);
		// the path as was deduced during the static analysis, e.g., "/users/:userId/books/:bookId"
		this.originalPath = ('string' === typeof(originalPath) && originalPath.startsWith('regex_')) ?
			RegExp(originalPath.replace('regex_', '')) : originalPath;
		this.path = path instanceof RegExp ? randexp(path) : path;
		// `path` is the path with the actual values, e.g., "/users/1234/books/1337"
		this.routeParamVals = routeParamVals; // Params of the type "/users/:userId/books/:bookId"
		this.funcsPtrs = funcsPtrs; // pointer to the function that should be called when the user acceess `path` using `method`
	}

	toString() {
		return 'Middleware ' + this.method + ' ' + super.toString();
	}

	eq(rhs) {
		return (this.filename === rhs.filename) && (this.method === rhs.method) && (this.path === rhs.path);
	}

	clone() {
		return new Middleware(this.filename, this.method, this.originalPath, this.path, this.funcsPtrs, 
			JSON.parse(JSON.stringify(this.headers)),
			this.cookie ? JSON.parse(JSON.stringify(this.cookie)) : this.cookie,
			this.paramVals ? this.paramVals.map(paramVal => paramVal.clone()) : this.paramVals,
			this.routeParamVals ? this.routeParamVals.map(pVal => pVal.clone()) : this.routeParamVals,
			this.bodyVal ? this.bodyVal.clone() : this.bodyVal);
	}
}

class ExpressPlugin extends HttpPlugin {
	constructor() {
		super('expressPlugin');
		this._middleware = [];
		this.port = null;
		this.expressUserInputInstrumenter = new ExpressUserInputInstrumenter();
		this.expressAllRoutesInstrumenter = new ExpressAllRoutesInstrumenter();
	}

	getMiddleware() {
		return this._middleware;
	}

	_getExpressAppUsage(astObj, requireExpressNode, expressObjectName) {
		return expressObjectName.map(exprObjName =>
				astObj.searchDown(astObj.astRoot, 'CallExpression', ['callee', 'name'], exprObjName))
			.flatten()
			.map(n => n.parent);
	}

	_getExpressRouterUsage(astObj, requireExpressNode, expressObjectName) {
		return expressObjectName.map(exprObjName => // case of app.Router()
				astObj.searchDown(astObj.astRoot, 'CallExpression', ['callee', 'object', 'name'], exprObjName))
			.flatten()
			.filter(n => n && n.callee && n.callee.property && n.callee.property.name &&
				n.callee.property.name === 'Router')
			.map(n => n.parent)
			.concat(requireExpressNode // case of require('express').Router()
				.filter(r => r && r.type === 'MemberExpression' && r.property.name === 'Router')
				.map(v => v.parent.parent));
	}

	_getAllUseOfAppOrRouter(astObj, names) {
		return names
			.map(a => astObj.searchDown(astObj.astRoot, null, ['callee', 'object', 'name'], a))
			.flatten()
			.filter(a => a);
	}

	_getFuncPtrFromArgs(astObj, args) {
		// TODO: handle the cases:
		// 1. When the function comes from a different file
		// 2. When a function is a pointer to a router, e.g., app.use(routerNameFromADifferentFileGoesHere)
		// For now, this is used only in `expressInputFromUserInstrumenter`,
		// so THERE IS NO NEED TO IMPLEMENT THE AFOREMENTIONED FEATURES 
		let outFuncsPtr = [];
		let i = args.length === 1 ?
			0 // the case of 'app.use' 
			:
			1; // all other cases
		for (; i < args.length; ++i) {
			switch (args[i].type) {
				case 'Identifier': // case of: router.put('/blah', someFuncName);
					let funcObj = astObj.allFuncsDecls.find(func => func.name === args[i].name);
					if (funcObj) {
						outFuncsPtr.push(funcObj.node);
					}
					break;
				case 'FunctionDeclaration': // case of router.put('/blah', function gabaza(req, res) {});
				case 'FunctionExpression': // case of: router.put('/blah', function(req, res) {});
				case 'ArrowFunctionExpression': // case of: router.put('/blah', (req, res) => {});
					outFuncsPtr.push(args[i]);
					break;
			}
		}
		return outFuncsPtr;
	}

	_getPathFromArgs(args) {
		if (args.length === 1) {
			return '/';
		} else if (args[0].type !== 'Literal') {
			return null; // we do not yet support things like `app.use(someVariableName, function()...`
		} else {
			return args[0].value;
		}
	}

	_getPortFromListen(args) {
		// let portNode = args[0];
		// switch (portNode.type) {
		// 	case 'Literal':
		// 		return portNode.value;
		// 	case 'MemberExpression':
		// 		if (portNode.object && portNode.object.object && portNode.object.property &&
		// 			('process' === portNode.object.object.name) && ('env' === portNode.object.property.name)) {
		// 			return process.env[portNode.property.name];
		// 		}
		// 		break;
		// 	default:
		// 		if (config.http.webServerPort) {
		return config.http.webServerPort;
		// 		} else {
		// 			throw Error('Not yet implemented port type');
		// 		}
		// }
	}

	_processListen(middlewareNode) {
		let portValue = this._getPortFromListen(middlewareNode.arguments);
		if (!this.port) {
			this.port = portValue;
		} else {
			throw Error('ExpressPlugin port already set. Port value:', this.port, '; new value:' + portValue);
		}
	}

	_collectAllMiddleWare() {
		this.project.astObjList.map(astObj => {
			let requireExpressNode = astObj.getAllRequires()
				.filter(res => res.arguments.every(arg => arg.value === 'express'))
				.map(node => node.parent);

			let expressObjectName = requireExpressNode
				.map(node => node && node.id && node.id.name);

			let apps = this._getExpressAppUsage(astObj, requireExpressNode, expressObjectName);
			let routers = this._getExpressRouterUsage(astObj, requireExpressNode, expressObjectName);
			let routerNames = routers.map(r => r.id.name);
			let appNames = apps.map(a => a.id.name);

			let allCallsToApps = this._getAllUseOfAppOrRouter(astObj, appNames);
			let allCallsToRouters = this._getAllUseOfAppOrRouter(astObj, routerNames);

			allCallsToApps.map(acta => this._processMiddleWare(astObj, acta));
			allCallsToRouters.map(actr => this._processMiddleWare(astObj, actr));
		});

		return this._middleware;
	}

	_processMiddleWare(astObj, middlewareNode) {
		let filename = astObj.filename;
		let method = middlewareNode.callee.property.name.toLowerCase();
		let path = this._getPathFromArgs(middlewareNode.arguments);
		if ((!path) && (method !== 'listen')) {
			return;
		}

		let funcsPtrs = this._getFuncPtrFromArgs(astObj, middlewareNode.arguments);
		if (!HttpPlugin.SUPPORTED_METHODS.includes(method)) {
			logger.warn('Unsupported method: ' + method);
			return;
		}
		if (method === 'listen') {
			this._processListen(middlewareNode);
		} else {
			// filename, method, originalPath, path, funcsPtrs, headers, cookie, paramVals, routeParamVals, bodyVal
			this._middleware.push(new Middleware(filename, method, path, path, funcsPtrs));
		}
	}

	_extractParamsFromPath(path) {
		if (!path) {
			throw Error('Empty path is invalid');
		}
		if (path instanceof RegExp) {
			// HACK
			return [];
		} else {
			const regex = /\/:(\w+)/g;
			let m;
			let outParamsList = [];
			while ((m = regex.exec(path)) !== null) {
				let match = m[1];
				outParamsList.push(new EntryParam(match, 'string'));
			}
			return outParamsList;
		}
	}

	init(project) {
		this.project = project;
		this._collectAllMiddleWare();
		this.expressUserInputInstrumenter.init(this, this.project);
		this.expressAllRoutesInstrumenter.init(this.project);
	}

	getUserInputInstrumneters() {
		return this.expressUserInputInstrumenter;
	}

	getDynamicDataEnhancementInstrumenters() {
		return [];
		// return this.expressAllRoutesInstrumenter;
	}

	enhanceProjectWithDynamicData() {
		// this.expressAllRoutesInstrumenter
		// 	dynamicData.map(dynamicEntry =>
		// 		// filename, method, originalPath, path, funcsPtrs, headers, cookie, paramVals, routeParamVals, bodyVal
		// 		this._middleware.push(new Middleware(dynamicData.filename, dynamicEntry.method, dynamicEntry.path, null, null))
		// 	);
	}

	_extractBodyVal(input) {
		return new BodyVal(input.body);
	}

	_extractParamVals(input) {
		return  input.urlParams ?
			Object.entries(input.urlParams).map(([paramName, paramVal]) => new ParamVal(paramName, paramVal)) :
			[];
	}

	_extractRouteParamVals(input) {
		return input.routeParams ?
			Object.entries(input.routeParams).map((paramName, paramVal) => new ParamVal(paramName, paramVal)) :
			[];
	}

	_findMiddleware(input) {
		return this._middleware.find(mw => mw.filename === input.filename && mw.originalPath === input.originalPath);
	}

	_createNewMiddleware(input) {
		let epMiddleware = this._findMiddleware(input);
		if (epMiddleware) {
			let newMiddleware = epMiddleware.clone();
			newMiddleware.method = input.method;
			newMiddleware.headers = input.headers;
			newMiddleware.path = input.path;
			newMiddleware.cookies = input.cookies;
			newMiddleware.routeParamVals = this._extractRouteParamVals(input);
			newMiddleware.bodyVal = this._extractBodyVal(input);
			return newMiddleware;
		}

		const paramVals = this._extractParamVals(input);
		const routeParams = this._extractRouteParamVals(input);
		const bodyVal = this._extractBodyVal(input);
		// filename, method, originalPath, path, funcsPtrs, headers, cookie, paramVals, routeParamVals, bodyVal
		return new Middleware(input.filename, input.method, input.originalPath,
			input.path, null /* do we really  need funcPtrs? */ , input.headers, input.cookies,
			paramVals,
			routeParams,
			bodyVal
		);
	}

	formatRawInputFromUser(entryFilename, rawInput) {
		return rawInput.map(input => this._createNewMiddleware(input));
	}

	getRawUserInput() {
		let rawInputFromInstrumenter = this.expressUserInputInstrumenter.getGlobalStorage();
		return rawInputFromInstrumenter.map((request) => {
			let headers = request.headers;
			headers.cookie && delete headers.cookie;
			let method = request.method;
			let userInputURL = url.parse(request.originalUrl, true);
			let body = request.body;
			let pathName = userInputURL.pathname;
			let originalPath = request.route.path;
			originalPath = originalPath instanceof RegExp ? 'regex_' + originalPath.toString() : originalPath;
			// TODO: handle 'signedCookies'
			let cookies = request.cookies;
			let urlParams = userInputURL.query;
			let filename = request.filename;
			return {
				'filename': filename,
				'method': method,
				'headers': headers,
				'path': pathName,
				'originalPath': originalPath,
				'urlParams': urlParams,
				'routeParams': request.params,
				'cookies': cookies,
				'body': body
			};
		});
	}

}

exports.ExpressPlugin = ExpressPlugin;
exports.Middleware = Middleware;
