// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

async function main() {
	try {
		const fs = require('fs');
		const glob = require("glob-all");
		const path = require('path');
		let JSFuzzDir = process.env.JSFUZZ_DIR;
		JSFuzzDir = JSFuzzDir.replace('\r', '');
		const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');

		const ParamVal = require(path.join(JSFuzzSrcDir, 'entities', 'entities')).ParamVal;
		const PathTraversalTarget = require(path.join(JSFuzzSrcDir, 'targets')).PathTraversalTarget;
		const InitController = require(path.join(JSFuzzSrcDir, 'controller')).InitController;
		const Controller = require(path.join(JSFuzzSrcDir, 'controller')).Controller;
		const BasicPathTraversalExpert = require(path.join(JSFuzzSrcDir, 'fuzzer', 'expert')).BasicPathTraversalExpert;
		const FunctionCall = require(path.join(JSFuzzSrcDir, 'plugins', 'functionCallPlugin')).FunctionCall;
		const config = require(path.join(JSFuzzSrcDir, 'config'));
		const logger = require(path.join(JSFuzzSrcDir, 'common', 'logger'));
		const MyMath = require(path.join(JSFuzzSrcDir, 'common', 'math'));
		const Utils = require(path.join(JSFuzzSrcDir, 'common', 'utils'));

		config.userInput.userInputRequired = false;
		config.userInput.writeUserInputToFile = false;
		config.userInput.readInputFromFile = false;
		config.userInput.openBrowserToGetUserInput = false;

		config.callGraph.staticallyInitializeCallGraph = true;
		config.callGraph.dynamicallyInitializeCallGraph = true;

		config.minArraySlotSize = 1;
		config.maxArraySlotSize = 1;

		config.mutation.inputMayBeLargerThanOneCall = true;
		
		const filesList = [path.join(JSFuzzDir, 'test', 'test_apps', 'directory_traversal_example', 'directory_traversal_example.js')];

		const targetFileName = filesList[0];
		const entryFileName = filesList[0];

		const targetsList = [new PathTraversalTarget()];

		const expertType = BasicPathTraversalExpert;
		let inputs = ['asdasdfg'];
		const initialInput = inputs.map(my_input => new FunctionCall(entryFileName, 'test', [new ParamVal('path', my_input)]));

		if (!filesList.every(fname => fs.existsSync(fname))) {
			console.log('Not all files specified in filesList exist!');
			process.exit(1);
		}

		async function run() {
			/* `\🐼/` */
			try {
				let controller = new InitController(filesList, targetsList, [entryFileName], expertType, initialInput);
				await Controller.exec(controller);
			} catch (e) {
				logger.error(`EVERYTHING CRASHED WITH ERROR: ${e}`);
				console.log(e);
				process.exit(5);
			}
			/* 🐢~~~ */
		}

		await run();
	} catch (e) {
		console.log(e);
		console.trace();
	}
}

try {
      main(); //this should work
} catch (e){
      console.log(e)
      console.trace();
}
