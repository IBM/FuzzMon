// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
'use strict';

const escodegen = require('escodegen');
const mocha = require('mocha');
const expect = require("chai").expect;

const path = require('path');
const JSFuzzDir = process.env.JSFUZZ_DIR;

const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');
const EntryParam = require(path.join(JSFuzzSrcDir, 'entities/entities')).EntryParam;
const EntryPoint = require(path.join(JSFuzzSrcDir, 'entities/entities')).EntryPoint;
const Project = require(path.join(JSFuzzSrcDir, 'static_analysis', 'project')).Project;
const ToyExampleInstrumenter = require('./toyExampleInstrumenter');
const HttpUserInputInstrumenter = require(path.join(JSFuzzSrcDir, 'instrumenters', 'httpUserInputInstrumenter'));
const request = require('superagent');
const url = require('url');
const bodyParser = require('co-body');

global.config = require(path.join(JSFuzzSrcDir, 'config'));
config.coverageBits = 4;

let counter = 0;

if (!process.env.CLOSUREMOD_DIR) {
	console.log('Not initialized `CLOSUREMOD_DIR` environment variable!');
	process.exit();
}
const requireFromString = require('require-from-string');

// RUNNING TOY EXAMPLE:
const BASE_DIR = path.join(JSFuzzDir, 'test', test_apps);
const filesList = [path.join(BASE_DIR, 'http_server_example.js')];

const targetFileName = filesList[0];
const entryFileName = filesList[0];

const targetsList = [];

let project = new Project(filesList, targetsList, [entryFileName]);
project.init();
const targetAST = project.astObjList[0];

let expert = null;
let httpUserInputInstrumenter = new HttpUserInputInstrumenter();

httpUserInputInstrumenter.init(expert, project);
const ASTInstrumentedWithUserInput = httpUserInputInstrumenter.instrument(targetAST);
const ASTInstrumentedWithUserInputSrc = escodegen.generate(ASTInstrumentedWithUserInput.astRoot);
console.log(ASTInstrumentedWithUserInputSrc);

const myURL = '/'; // '/trololo?param1=value1&param2=value2';
const fullURL = 'http://localhost:8086' + myURL;
const ASTInstrumentedWithUserInputSrcFunc = requireFromString(ASTInstrumentedWithUserInputSrc);

// describe("Instrumentation Tests", () => {
// it("Coverage instrumenter test", () => {
httpUserInputInstrumenter.resetGlobalStorage();
ASTInstrumentedWithUserInputSrcFunc.run();

setTimeout(() => {
	const callback = async function(res) {
		console.log('res:', res);
		let userInputs = httpUserInputInstrumenter.getGlobalStorage();
		let request = userInputs['/'][0].req;
		let body = await userInputs['/'][0].body;
		let headers = request.headers;
		let method = request.method;
		let cookies = headers.cookie;
		let userInputURL = url.parse(request.url, true);

		console.log('##############');
		console.log('method:', method);
		console.log('url:', userInputURL);
		console.log('headers:', headers);
		console.log('cookies:', cookies);
		console.log('body:', body);
		console.log('##############');

		// let userKeys = Object.keys(userInput);
		// let urls = userKeys.map(key => url.parse(key, true));
		// expect(urls.length).to.equal(1);
		// urls = urls[0];
		// expect(urls.path).to.equal(myURL);
		// expect(urls.query['param1']).to.equal('value1');
		// expect(urls.query['param2']).to.equal('value2');
		// const singleUserInput = userInput[userKeys][0];
		// console.log('singleUserInput:', singleUserInput);
		// expect(singleUserInput.method.toLowerCase()).to.equal('post');
		// ASTInstrumentedWithUserInputSrcFunc.stop();
	}

	request
		// .get(fullURL)
		.post(fullURL, { param1: 'value1', param2: 'value2' })
		.set('Content-Type', 'application/x-www-form-urlencoded')
		.set('Cookie', 'asdf')
		// .send('gabaza!')
		.end(callback)

}, 1000);