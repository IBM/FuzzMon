// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

class FuzzMonRunner {
	constructor(runnersList /*, instrumentersList*/ ) {
		this.runnersList = runnersList instanceof Array ? runnersList : [runnersList];
		// this.instrumentersList = instrumentersList instanceof Array ? instrumentersList : [instrumentersList];
	}

	async init() {
		await Promise.all(this.runnersList.map(async(runner) => await runner.init()));
	}

	async stop() {
		await Promise.all(this.runnersList.map(async(runner) => await runner.stop()));
	}

	async runOnInput(input) {
		// first, find the correct runner for the entry file
		let runner = this.runnersList.find(runner => runner.entryFilename === input.getFilename());
		if (!runner) {
			throw Error(`Invalid runner for file: ${input.getFilename()}`);
		}
		return await runner.run(input);
	}

	/**
	 * Runs the program on a single inputs
	 *
	 * @param      {?}  input   The input to run the program on. Can be either a single item, or a list
	 */
	async runOnInputSequence(inputSequence) {
		return await Promise.all(inputSequence.map(async(input) =>
			await this.runOnInput(input)));
	}
}

module.exports = FuzzMonRunner;