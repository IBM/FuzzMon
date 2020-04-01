// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
try {
	'use strict';

	const fs = require('fs');
	const glob = require("glob-all");
	const path = require('path');
	let JSFuzzDir = process.env.JSFUZZ_DIR;
	JSFuzzDir = JSFuzzDir.replace('\r', '');

	const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');
	const ParamVal = require(path.join(JSFuzzSrcDir, 'entities/entities')).ParamVal;
	const BodyVal = require(path.join(JSFuzzSrcDir, 'entities/entities')).BodyVal;
	const LinesTarget = require(path.join(JSFuzzSrcDir, 'targets')).LinesTarget;
	const InitController = require(path.join(JSFuzzSrcDir, 'controller')).InitController;
	const Controller = require(path.join(JSFuzzSrcDir, 'controller')).Controller;
	const BasicHttpExpert = require(path.join(JSFuzzSrcDir, 'fuzzer/expert')).BasicHttpExpert;
	const config = require(path.join(JSFuzzSrcDir, 'config'));
	const HttpRequest = require(path.join(JSFuzzSrcDir, 'plugins', "httpPlugin")).HttpRequest;

	config.userInputRequired = false;
	config.http.isSSL = false;
	config.http.webServerPort = 8086;

	if (!process.env.CLOSUREMOD_DIR) {
		console.log('Not initialized `CLOSUREMOD_DIR` environment variable!');
		process.exit();
	}

	const BASE_DIR = path.join(JSFuzzDir, 'test', 'test_apps', 'http_server_example');
	const filesList = glob.sync([
		path.join(BASE_DIR, 'http_server_example.js'),
	]);
	
	const targetFileName = filesList[0];
	const entryFileName = filesList[0];
	
	const entryFilenames = [entryFileName];
	const targetsList = [new LinesTarget(targetFileName, [67])];
	const expertType = BasicHttpExpert;
	

	var initialParamVals = [new ParamVal("foo", "blah2", "string")]
	var initialBodyVal = new BodyVal("blah10", "blah123", "string")
	const initialInput = [new HttpRequest("filename", "get", "hello", "header", "123456789ABCDEF",
										  initialParamVals, initialBodyVal)];
	
	if (!filesList.every(fname => fs.existsSync(fname)) || !targetsList.every(target => fs.existsSync(target.filename))) {
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