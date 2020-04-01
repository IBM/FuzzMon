// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const AbstractRunner = require('./abstractRunner').AbstractRunner;
const logger = require('../common/logger');

/**
 * A simple runner. Used when an entry point is a function name.
 *
 * @class      FunctionCallRunner (name)
 */
class FunctionCallRunner extends AbstractRunner {
	/**
	 * Runs an already instrumented and loaded module
	 *
	 * @param      {functionCall}  input  The input we'd like to run the entry point with
	 * @return     {?}  Result of the execution
	 */
	async run(functionCall) {
		let resValue = null;
		let functionName = functionCall.name;
		let functionParams = functionCall.paramVals.map(pVal => pVal.value);
		// The following code is commented out to remind you that `undefined` or `null` are *valid* functionParamss
		// if (!functionParams) {
		//     throw ('Invalid functionParams:', functionParams);
		// }

		// setIO(false);

		if (typeof(this.hModule[functionName]) === "function") {
			if (!functionParams || functionParams.constructor !== Array) {
				functionParams = [functionParams];
			}
			try {
				resValue = await this.hModule[functionName].apply(null, functionParams);
			} catch (e) {
				// seIO(true);
				// logger.error('Failed to run', this.hModule, 'due to:', e);
			}
		} else {
			// setIO(true);
			throw Error('Invalid entry point');
		}
		// setIO(true);
		return resValue;
	}

	stop() {
		
	}
}

module.exports = FunctionCallRunner;
