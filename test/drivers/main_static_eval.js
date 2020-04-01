// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
'use strict';
const opn = require('opn');
const fs = require('fs');
const glob = require("glob-all");
const path = require('path');

let JSFuzzDir = process.env.JSFUZZ_DIR;
JSFuzzDir = JSFuzzDir.replace('\r', '');
const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');

const ParamVal = require(path.join(JSFuzzSrcDir, './entities/entities')).ParamVal;
const InputSequence = require(path.join(JSFuzzSrcDir, './entities/entities')).InputSequence;
const FunctionCall = require(path.join(JSFuzzSrcDir, './plugins/functionCallPlugin')).FunctionCall;
const PathTraversalTarget = require(path.join(JSFuzzSrcDir, './targets')).PathTraversalTarget;
const JSCodeInjectionTarget = require(path.join(JSFuzzSrcDir, './targets')).JSCodeInjectionTarget;
const InitController = require(path.join(JSFuzzSrcDir, './controller')).InitController;
const Controller = require(path.join(JSFuzzSrcDir, './controller')).Controller;
const BasicEvalExpert = require(path.join(JSFuzzSrcDir, './fuzzer/expert')).BasicEvalExpert;
const config = require(path.join(JSFuzzSrcDir, './config'));
const logger = require(path.join(JSFuzzSrcDir, './common/logger'));
config.userInputRequired = false;

if (!process.env.CLOSUREMOD_DIR) {
	console.log('Not initialized `CLOSUREMOD_DIR` environment variable!');
	process.exit();
}

const BASE_DIR = path.join(JSFuzzDir, 'test', 'test_apps', 'static-eval');

const targetFileName = path.join(BASE_DIR, 'index.js');

const entryFileName = targetFileName;
let filesList = glob.sync([
	path.join(BASE_DIR, '**/*.js'),
]);
filesList.push(targetFileName);

const targetsList = [new JSCodeInjectionTarget()];
const expertType = BasicEvalExpert;

function parseExpression(src) {
    return esprima.parse(src).body[0].expression;
}

const esprima = require('esprima');

const KERNEL_SOURCE = `require('fs').writeFileSync('${config.JSCodeInjectionFilePath}', '${config.JSCodeInjectionFileContent}')`;
// const KERNEL_AST = parseExpression(KERNEL_SOURCE);

const initialInput = [KERNEL_SOURCE]
	.map(val => new FunctionCall(filesList[0], 'testFunc', [new ParamVal('input', val)]));

if (!filesList.every(fname => fs.existsSync(fname))){
	console.log('Not all files specified in filesList exist:', filesList);
	process.exit(1);
} /*else if (!targetsList.every(target => fs.existsSync(target.filename))) {
	console.log('Not all files specified in targetsList exist:', targetsList.map(t => t.filename));
	process.exit(1);
}*/

async function run() {
	/* `\🐼/` */
	try {
		let controller = new InitController(filesList, targetsList, [entryFileName], expertType, initialInput);
		await Controller.exec(controller);
	} catch (e) {
		console.log('EVERYTHING CRASHED WITH ERROR:');
		console.log(e);
	}
	/* 🐢~~~ */
}

run();
// } catch (e) {
// 	console.log(e);
// 	console.trace();
// }