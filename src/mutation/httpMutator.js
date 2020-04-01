// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const Utils = require('../common/utils');
const MyMath = require('../common/math');
const ParamVal = require('../entities/entities').ParamVal;
const BodyVal = require('../entities/entities').BodyVal;
const Type = require('../entities/entities').Type;
const InputSequence = require('../entities/entities').InputSequence;
const config = require('../config');
const logger = require('../common/logger');
const AbstractMutator = require('./abstractMutator').AbstractMutator;
const HttpGenerator = require('.').HttpGenerator;
const HttpRequest = require('../plugins/httpPlugin').HttpRequest;
const HttpPlugin = require('../plugins/httpPlugin').HttpPlugin;

class HttpMutator extends AbstractMutator {
	constructor(name) {
		super(name || 'HttpMutator');
	}

	_mutateMethod(input, mutationMetadata) {
		if (Math.random() < config.mutation.probabilityOfMutatingMethod) {
			return HttpPlugin.SUPPORTED_METHODS.weightedRandomItem(this.distribution);
		}
		return input.method;
	}

	_mutateBodyVal(input, mutationMetadata) {
		if (!input || !input.bodyVal || !input.bodyVal.value) {
			return HttpGenerator._generateBodyVal(input);
		}
		let newBodyValValue = super.mutateUsingGivenType(input.bodyVal.value, input.bodyVal.type, mutationMetadata);
		return new BodyVal(newBodyValValue);
	}

	_mutateParamVals(input, mutationMetadata) {
		if (!input || !input.paramVals) {
			return HttpGenerator._generateParamVals(input);
		}

		return input.paramVals.map(pVal => super._mutateSingleParamVal(pVal, mutationMetadata));
	}

	_mutateHttpHeaders(input, mutationMetadata) {
		let headers;
		if (!input || !input.headers || Object.keys(input.headers).length === 0) {
			return HttpGenerator._generateHttpHeaders(input);
		}
		return Object.keys(input.headers).map(header =>
			(Math.random() < config.mutation.probabilityOfMutatingHeader) ?
			HttpPlugin.HEADERS_TO_POSSIBLE_VALUES_MAP[header.toLowerCase()].weightedRandomItem(this.distribution) :
			input.headers[header]
		);
	}

	_mutatePath(input, mutationMetadata) {
		return input.path; // for now, not mutating paths
	}

	_mutateCookies(input, mutationMetadata) {
		// for now, not mutating cookie
		return input.cookie;
	}

	_mutateInput(input, mutationMetadata) {
		return new HttpRequest(input.filename,
			this._mutateMethod(input, mutationMetadata),
			this._mutatePath(input, mutationMetadata),
			this._mutateHttpHeaders(input, mutationMetadata),
			this._mutateCookies(input, mutationMetadata),
			this._mutateParamVals(input, mutationMetadata),
			this._mutateBodyVal(input, mutationMetadata)
		);
	}

	// _addInput(inputSequence, mutationMetadata) {
	// 	if (inputSequence.size >= inputSequence.MAX_GEN_INPUT_SEQ_SIZE) {
	// 		return false;
	// 	}
	// 	let randomIdxOfItem = Math.randomInt(inputSequence.size - 1);
	// 	let randomIdxToInsertTo = Math.randomInt(inputSequence.size - 1);

	// 	let itemToAdd = this._mutateHttpRequest(inputSequence.at(randomIdxOfItem), mutationMetadata);

	// 	inputSequence.insertTo(randomIdxToInsertTo, itemToAdd);
	// }
}

module.exports = HttpMutator;