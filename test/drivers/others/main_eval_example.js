// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

async function main() {
	try {
		const fs = require('fs');
		const path = require('path');
		const JSFuzzDir = process.env.JSFUZZ_DIR;
		const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');

		const ParamVal = require(path.join(JSFuzzSrcDir, 'entities', 'entities')).ParamVal;
		const ShellInjectionTarget = require(path.join(JSFuzzSrcDir, 'targets')).ShellInjectionTarget;
		const InitController = require(path.join(JSFuzzSrcDir, 'controller')).InitController;
		const Controller = require(path.join(JSFuzzSrcDir, 'controller')).Controller;
		const BasicFunctionCallExpert = require(path.join(JSFuzzSrcDir, 'fuzzer/expert')).BasicFunctionCallExpert;
		const FunctionCall = require(path.join(JSFuzzSrcDir, 'plugins', 'functionCallPlugin')).FunctionCall;
		const config = require(path.join(JSFuzzSrcDir, 'config'));
		const logger = require(path.join(JSFuzzSrcDir, 'common', 'logger'));

		config.userInput.userInputRequired = false;
		config.userInput.writeUserInputToFile = false;
		config.userInput.readInputFromFile = false;
		config.userInput.openBrowserToGetUserInput = false;

		config.callGraph.staticallyInitializeCallGraph = true;
		config.callGraph.dynamicallyInitializeCallGraph = true;

		config.minArraySlotSize = 1;
		config.maxArraySlotSize = 1;

		const BASE_DIR = path.join(JSFuzzDir, 'test', test_apps);
		const filesList = [path.join(BASE_DIR, 'eval_example.js')];

		const entryFileName = path.join(BASE_DIR, 'eval_example.js');
		const targetFileName = path.join(BASE_DIR, 'eval_example.js');

		const targetsList = [new ShellInjectionTarget(targetFileName)];

		const expertType = BasicFunctionCallExpert;
		let inputs = [''];
		const initialInput = inputs.map(my_input => new FunctionCall(entryFileName, 'main', [new ParamVal('my_input', my_input)]));

		console.log('filesList:', filesList.length, filesList[0]);
		if (!filesList.every(fname => fs.existsSync(fname)) || !targetsList.every(target => fs.existsSync(target.filename))) {
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

