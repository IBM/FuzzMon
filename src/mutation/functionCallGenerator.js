// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const AbstractGenerator = require('.').AbstractGenerator;
const FunctionCall = require('../plugins/functionCallPlugin').FunctionCall;
const HttpGenerator = require('.').HttpGenerator;

require('../common/math.js');

class FunctionCallGenerator extends AbstractGenerator {
	constructor() {
		super();
	}

	static _generateFunctionCall(input) {
		return new FunctionCall(input.filename,
			input.name,
			HttpGenerator._generateParamVals(input)
		);
	}

	static generateInput(input) {
		return FunctionCallGenerator._generateFunctionCall(input);
	}
}


exports = FunctionCallGenerator;