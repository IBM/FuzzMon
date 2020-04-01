// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

'use strict';

try {
	const opn = require('opn');
	const fs = require('fs');
	const glob = require("glob-all");
	const path = require('path');
	process.env.JSFUZZ_DIR = '/mnt/c/Users/bennyz/FuzzMon_sense_city';
	const JSFuzzDir = process.env.JSFUZZ_DIR;
	const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');
	const logger = require(path.join(JSFuzzSrcDir, 'common/logger'));
	const EntryParam = require(path.join(JSFuzzSrcDir, 'entities/entities')).EntryParam;
	const EntryPoint = require(path.join(JSFuzzSrcDir, 'entities/entities')).EntryPoint;
	const ParamVal = require(path.join(JSFuzzSrcDir, 'entities/entities')).ParamVal;
	const GeneralizedInput = require(path.join(JSFuzzSrcDir, 'entities/entities')).GeneralizedInput;
	const GeneralizedInputSequence = require(path.join(JSFuzzSrcDir, 'entities/entities')).GeneralizedInputSequence;
	const Middleware = require(path.join(JSFuzzSrcDir, 'plugins/expressPlugin')).Middleware;
	const ExpressPlugin = require(path.join(JSFuzzSrcDir, 'plugins/expressPlugin')).ExpressPlugin;
	const PathTraversalTarget = require(path.join(JSFuzzSrcDir, 'targets')).PathTraversalTarget;
	const InitController = require(path.join(JSFuzzSrcDir, 'controller')).InitController;
	const Controller = require(path.join(JSFuzzSrcDir, 'controller')).Controller;
	const BasicExpert = require(path.join(JSFuzzSrcDir, 'fuzzer/expert')).BasicExpert;
	const BasicExpressExpert = require(path.join(JSFuzzSrcDir, 'fuzzer/expert')).BasicExpressExpert;
	const config = require(path.join(JSFuzzSrcDir, 'config'));

	let userInput = true;

	if (userInput) {
		config.userInput.userInputRequired = true;
		config.userInput.writeUserInputToFile = true;
		config.userInput.readInputFromFile = false;
		config.userInput.openBrowserToGetUserInput = true;
	} else {
		config.userInput.userInputRequired = false;
		config.userInput.writeUserInputToFile = false;
		config.userInput.readInputFromFile = true;
		config.userInput.openBrowserToGetUserInput = false;
	}

	config.callGraph.staticallyInitializeCallGraph = true;
	config.http.isSSL = true;
	config.http.webServerPort = 4443;

	// if (!process.env.CLOSUREMOD_DIR) {
	// 	console.log('Not initialized `CLOSUREMOD_DIR` environment variable!');
	// 	process.exit();
	// }

	const BASE_DIR = path.join('/opt/sensecity-api');
	const filesList = glob.sync([
		BASE_DIR + '/config/*.js',
		BASE_DIR + '/models/*.js',
		BASE_DIR + '/routes/*.js',
		BASE_DIR + '/schemas/*.js',
		BASE_DIR + '/server.js',
	]);

	const entryFilename = path.join(BASE_DIR,'/server.js');
	const targetsList = [new PathTraversalTarget()];
	const expertType = BasicExpressExpert;
	const initialInput = [];

	if (![].concat(filesList, [entryFilename]).every(fname => fs.existsSync(fname))) {
		console.log('Not all files specified in filesList exist!');
		process.exit(1);
	}

	async function run() {
		/* `\🐼/` */
		try {
			let controller = new InitController(filesList, targetsList, [entryFilename], expertType, initialInput);
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