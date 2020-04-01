// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
try {
	'use strict';
	const opn = require('opn');
	const fs = require('fs');
	const glob = require("glob-all");
	const path = require('path');

	let JSFuzzDir = process.env.JSFUZZ_DIR;
	JSFuzzDir = JSFuzzDir.replace('\r', '');
	const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');
	const ParamVal = require(path.join(JSFuzzSrcDir, 'entities/entities')).ParamVal;
	const InputSequence = require(path.join(JSFuzzSrcDir, 'entities/entities')).InputSequence;
	const Middleware = require(path.join(JSFuzzSrcDir, 'plugins/expressPlugin')).Middleware;
	const ExpressPlugin = require(path.join(JSFuzzSrcDir, 'plugins/expressPlugin')).ExpressPlugin;
	const LinesTarget = require(path.join(JSFuzzSrcDir, 'targets')).LinesTarget;
	const InitController = require(path.join(JSFuzzSrcDir, 'controller')).InitController;
	const Controller = require(path.join(JSFuzzSrcDir, 'controller')).Controller;
	const BasicExpressExpert = require(path.join(JSFuzzSrcDir, 'fuzzer/expert')).BasicExpressExpert;
	const config = require(path.join(JSFuzzSrcDir, 'config'));
	const logger = require(path.join(JSFuzzSrcDir, 'common/logger'));

	config.userInput.userInputRequired = false;
	config.userInput.writeUserInputToFile = false;
	config.userInput.readInputFromFile = true;
	config.userInput.openBrowserToGetUserInput = false;

	config.http.isSSL = false;
	config.callGraph.staticallyInitializeCallGraph = true;

	config.http.webServerPort = 8086;
	if (!process.env.CLOSUREMOD_DIR) {
		console.log('Not initialized `CLOSUREMOD_DIR` environment variable!');
		process.exit();
	}

	const BASE_DIR = path.join(JSFuzzDir, 'test', 'test_apps', 'express_server_example');
	const filesList = glob.sync([
		path.join(BASE_DIR, 'express_server_example.js'),
	]);
	config.userInput.inputFilename = path.join(BASE_DIR, 'serializedUserInput_');

	const targetFileName = filesList[0];
	const entryFileName = filesList[0];

	const entryFilenames = [entryFileName];
	const targetsList =  [new LinesTarget(targetFileName, [63])];
	const expertType = BasicExpressExpert;

	const initialInput = [];

	if (!filesList.every(fname => fs.existsSync(fname))) {
		console.log('Not all files specified in filesList exist!');
		process.exit(1);
	}

	async function run() {
		/* `\🐼/` */
		try {
			let controller = new InitController(filesList, targetsList, entryFilenames, expertType, initialInput);
			await Controller.exec(controller);
		} catch (e) {
			console.log('EVERYTHING CRASHED WITH ERROR:');
			console.log(e);
		}
		/* 🐢~~~ */
	}

	run();
} catch (e) {
	console.log(e);
	console.trace();
}