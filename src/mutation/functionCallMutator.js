// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const AbstractMutator = require('./abstractMutator').AbstractMutator;
const FunctionCall = require('../plugins/functionCallPlugin').FunctionCall;

class FunctionCallMutator extends AbstractMutator {
	constructor() {
		super();
	}

	_mutateInput(functionCall, mutationMetadata) {
		let newParamVals = functionCall.paramVals.map(pVal => super._mutateSingleParamVal(pVal, mutationMetadata));
		return new FunctionCall(functionCall.filename,
			functionCall.name,
			newParamVals);
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

module.exports = FunctionCallMutator;