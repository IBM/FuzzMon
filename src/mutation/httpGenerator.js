// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const AbstractGenerator = require('.').AbstractGenerator;
const SimpleGenerator = require('.').SimpleGenerator;
const HttpRequest = require('../plugins/httpPlugin').HttpRequest;
const HttpPlugin = require('../plugins/httpPlugin').HttpPlugin;
const ParamVal = require('../entities/entities').ParamVal;
const BodyVal = require('../entities/entities').BodyVal;

require('../common/math.js');

class HttpGenerator extends AbstractGenerator {
	constructor() {
		super();
	}

	static _generateMethod(input) {
		return HttpPlugin.SUPPORTED_METHODS.randomItem();
	}

	static _generateBodyVal(input) {
		return input.bodyVal && input.bodyVal.type ?
			new BodyVal(SimpleGenerator.generateRandomInputFromType(input.bodyVal.type)) :
			new BodyVal(SimpleGenerator.generateRandomObject());
	}

	static _generateParamVals(input) {
		return input.paramVals ?
			input.paramVals.map(pVal => new ParamVal(pVal.name, this.generateRandomInputFromType(pVal.type))) :
			(new Array(Math.randomInt(config.http.maxNumOfParamsPerRequest)))
			.map(p =>
				new ParamVal(this.generateRandomInputFromType('string'), this.generateRandomInput()));
	}

	static _generateHttpHeaders(input) {
		let headers;
		if (!input || !input.headers || Object.keys(input.headers).length === 0) {
			headers = config.http.headers;
		}
		return Object.keys(input.headers).map(header => HttpPlugin.HEADERS_TO_POSSIBLE_VALUES_MAP[header.toLowerCase()].randomItem());
	}

	static _generatePath(input) {
		return input.path || SimpleGenerator.generateRandomInputFromType('string');
	}

	static _generateCookies(input) {
		return input.cookie || SimpleGenerator.generateRandomInputFromType('string');
	}

	static _generateHttpRequest(input) {
		return new HttpRequest(filename,
			HttpGenerator._generateMethod(input),
			HttpGenerator._generatePath(input),
			HttpGenerator._generateHttpHeaders(input),
			HttpGenerator._generateCookies(input),
			HttpGenerator._generateParamVals(input),
			HttpGenerator._generateBodyVal(input)
		);
	}

	static generateInput(input) {
		return HttpGenerator._generateHttpRequest(input);
	}
}


exports = HttpGenerator;