// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const AbstractPlugin = require('./abstractPlugin');
const HttpUserInputInstrumenter = require('../instrumenters').HttpUserInputInstrumenter;
const url = require('url');
const ParamVal = require('../entities/entities').ParamVal;
const BodyVal = require('../entities/entities').BodyVal;
const config = require('../config');
const AbstractInput = require('../entities/entities').AbstractInput;

class HttpRequest extends AbstractInput {
	constructor(filename, method, path, headers, cookie, paramVals, bodyVal) {
		super();
		this.filename = filename;
		this.method = method; // get, post, use, etc.
		this.path = path; // '/', '/static/blah', etc.
		this.headers = headers || config.http.headers;
		this.cookie = cookie;
		this.paramVals = paramVals || [];
		this.paramVals = this.paramVals instanceof Array ? this.paramVals : [this.paramVals];
		this.bodyVal = bodyVal;
	}

	getFilename() {
		return this.filename;
	}

	toString() {
		return `HttpRequest: ${this.filename}:${this.method} ${this.path} 
		headers:${JSON.stringify(this.headers)}
		cookie:${JSON.stringify(this.cookie)}
		paramVals:${this.paramVals ? this.paramVals.map(paramVal => paramVal.toString()).join(';') : 'no param vals'}
		bodyVal:${this.bodyVal ? this.bodyVal.toString() : 'no body'}`;
	}

	clone() {
		return new HttpRequest(this.filename, this.method, this.path,
			JSON.parse(JSON.stringify(this.headers)),
			this.cookie ? JSON.parse(JSON.stringify(this.cookie)) : this.cookie,
			this.paramVals ? this.paramVals.map(paramVal => paramVal.clone()) : this.paramVals,
			this.bodyVal ? this.bodyVal.clone() : this.bodyVal);
	}
}

class HttpPlugin extends AbstractPlugin {
	constructor() {
		super('HttpPlugin');
		this.httpUserInputInstrumenter = new HttpUserInputInstrumenter();
	}

	_findPort() {
		return config.http.webServerPort;
	}

	init(project) {
		this.project = project;
		this.httpUserInputInstrumenter.init(this.project);
		this.port = this._findPort();
	}

	// getEntryPoints() {
	// 	return [];
	// }

	enhanceProjectWithDynamicData() {
		// TODO: implement
	}

	getUserInputInstrumneters() {
		return this.httpUserInputInstrumenter;
	}

	getDynamicDataEnhancementInstrumenters() {
		return [];
	}

	formatRawInputFromUser(entryFilename, rawInput) {
		return rawInput.map(input => {
			let filename = entryFilename;
			let paramVals = Object.keys(input.urlParams).map(paramName => new ParamVal(paramName, input.urlParams[paramName]));
			let bodyVal = new BodyVal(input.body);
			return new HttpRequest(filename, input.method, input.path, input.headers, input.cookies, paramVals, bodyVal);
		}).flatten();
	}

	async getRawUserInput() {
		let rawInputFromInstrumenter = this.httpUserInputInstrumenter.getGlobalStorage();
		let rawUserInput = await Promise.all(Object.entries(rawInputFromInstrumenter).map(async([pathURL, inputs]) =>
			await Promise.all(inputs.map(async(input) => {
				let request = input.req;
				let headers = request.headers;
				headers.cookie && delete headers.cookie;
				let method = request.method.toLowerCase();
				let userInputURL = url.parse(request.url, true);
				let body = input.body === '' ? '' : await input.body;
				let pathName = userInputURL.pathname;
				let rawCookies = request.headers.cookie;
				let urlParams = userInputURL.query;
				let cookies = {};
				rawCookies && rawCookies.split(';').map((cookie) => {
					var parts = cookie.split('=');
					cookies[parts.shift().trim()] = decodeURI(parts.join('='));
				});
				return {
					'method': method,
					'headers': headers,
					'path': pathName,
					'urlParams': urlParams,
					'cookies': cookies,
					'body': body
				}
			}))
		));
		return rawUserInput.flatten();
	}
}

HttpPlugin.SUPPORTED_METHODS = ['get', 'post', 'listen'];
HttpPlugin.HEADERS_TO_POSSIBLE_VALUES_MAP = {
	'accept-encoding': ['gzip, deflate, br'],
	'accept-language': ['en-US,en;q=0.9,he;q=0.8,ru;q=0.7'],
	'connection': ['keep-alive'],
	'content-type': ['application/json',
		'application/x-www-form-urlencoded',
		'text/plain',
		'multipart/form-data',
		'application/octet-stream',
		'text/javascript' /*obsolete*/ ,
	],
	'user-agent': ['Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36']
}

exports.HttpRequest = HttpRequest;
exports.HttpPlugin = HttpPlugin;