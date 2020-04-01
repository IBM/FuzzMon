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
const BasicExpressExpert = require(path.join(JSFuzzSrcDir, 'fuzzer', 'expert')).BasicExpressExpert;
const ExpressUserInputInstrumenter = require(path.join(JSFuzzSrcDir, 'instrumenters', 'expressUserInputInstrumenter'));
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
const filesList = [path.join(BASE_DIR, 'express_server_example.js')];

const targetFileName = filesList[0];
const entryFileName = filesList[0];

const targetsList = [];

let project = new Project(filesList, targetsList, [entryFileName]);
project.init();
const targetAST = project.astObjList[0];

let expert = new BasicExpressExpert();
expert.init(project);

let expressUserInputInstrumenter = new ExpressUserInputInstrumenter();
expressUserInputInstrumenter.initGlobalStorage();
expressUserInputInstrumenter.init(expert, project);
const ASTInstrumentedWithUserInput = expressUserInputInstrumenter.instrument(targetAST);
let ASTInstrumentedWithUserInputSrc = escodegen.generate(ASTInstrumentedWithUserInput.astRoot);
ASTInstrumentedWithUserInputSrc = `var ${expressUserInputInstrumenter.getGlobalStorageName()} = [];` +
	ASTInstrumentedWithUserInputSrc
	.replace(`res.send(\'success!\');`,
		`res.send(\'success!\');\nconsole.log();`);

const dealId = 3;
const port = 8086;

// const myURL = `/foo`;
const myURL = `/${dealId}/snapshots`;
const fullURL = `http://localhost:${port}` + myURL;
const ASTInstrumentedWithUserInputSrcFunc = requireFromString(ASTInstrumentedWithUserInputSrc);

// describe("Instrumentation Tests", () => {
// it("Coverage instrumenter test", () => {
let app = ASTInstrumentedWithUserInputSrcFunc.app;
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

setTimeout(async() => {
	const userInputParser = async function() {
		let userInputs = expressUserInputInstrumenter.getGlobalStorage();
		console.log(`userInputs: ${JSON.stringify(userInputs)}`);
	}

	await request.get(fullURL);
	await request.get(fullURL);
	await request.get(fullURL);

	try {
		let res = await request.get(fullURL);
		userInputParser();
		console.log('**********');
	} catch (e) {
		console.log(e);
		console.trace();
	}
}, 1000);