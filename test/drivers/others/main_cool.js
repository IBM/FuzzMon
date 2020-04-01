// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

'use strict';

try {
	const fs = require('fs');
	const glob = require("glob-all");
	const path = require('path');
	const JSFuzzDir = process.env.JSFUZZ_DIR;
	const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');

	const PathTraversalTarget = require(path.join(JSFuzzSrcDir, 'targets')).PathTraversalTarget;
	const InitController = require(path.join(JSFuzzSrcDir, 'controller')).InitController;
	const Controller = require(path.join(JSFuzzSrcDir, 'controller')).Controller;
	const BasicExpressExpert = require(path.join(JSFuzzSrcDir, 'fuzzer/expert')).BasicExpressExpert;
	const config = require(path.join(JSFuzzSrcDir, 'config'));

	let userInput = false;

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

	config.callGraph.staticallyInitializeCallGraph = false;
	config.http.isSSL = true;
	config.http.webServerPort = 4443;

	// COOL TEST
	const BASE_DIR = path.join(JSFuzzDir, 'test', 'test_apps', 'cool_with_vuln', 'cloudsolutiondesigntool');
	const filesList = glob.sync([
		BASE_DIR + '/*.js',
		BASE_DIR + '/routes/*.js',
		BASE_DIR + '/mw/*.js',
		BASE_DIR + '/validator/*.js',
		BASE_DIR + '/bin/www',
	]);

	const entryFilename = path.join(BASE_DIR, 'bin', 'www');
	const targetsList = [new PathTraversalTarget()];
	const expertType = BasicExpressExpert;
	const initialInput = [];

	if (!filesList.every(fname => fs.existsSync(fname))) {
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