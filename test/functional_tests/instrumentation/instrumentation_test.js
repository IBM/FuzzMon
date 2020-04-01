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
const CoverageInstrumenter = require(path.join(JSFuzzSrcDir, 'instrumenters', 'coverageInstrumenter'));

global.config = require(path.join(JSFuzzSrcDir, 'config'));
config.coverageBits = 4;

let counter = 0;

if (!process.env.CLOSUREMOD_DIR) {
	console.log('Not initialized `CLOSUREMOD_DIR` environment variable!');
	process.exit();
}

const requireFromString = (src, filename) => {
	var Module = module.constructor;
	var m = new Module();
	m._compile(src, filename);
	return m.exports;
}

// RUNNING TOY EXAMPLE:
const BASE_DIR = path.join(JSFuzzDir, 'test', 'functional_tests', 'instrumentation');
const filesList = [path.join(BASE_DIR, 'instrumentation_test_toy_example.js')];

const targetFileName = filesList[0];
const entryFileName = filesList[0];

const EPname1 = 'testFunc';
const entryParamEP1 = new EntryParam('input', 'string');
const EP_1 = new EntryPoint(entryFileName, EPname1, [entryParamEP1]);
const targetsList = [];

let project = new Project(filesList, targetsList, [EP_1]);
project.init();
const targetAST = project.astObjList[0];

const toyExampleInstrumentor = new ToyExampleInstrumenter();
const coverageInstrumentor = new CoverageInstrumenter();
coverageInstrumentor.createRandomID = () => ++counter;

toyExampleInstrumentor.init(project);
coverageInstrumentor.init(project);

const CoverageInstrumenterTestInputToExpectedResultsMap = [{
	input: 0,
	exptectedRes: 8,
	expectedCovVec: Uint8Array.from([1, 0, 1, 2, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0])
}, {
	input: 50,
	exptectedRes: 58,
	expectedCovVec: Uint8Array.from([1, 0, 1, 3, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1])
}, {
	input: 123,
	exptectedRes: 131,
	expectedCovVec: Uint8Array.from([1, 0, 1, 3, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1])

}, {
	input: Infinity,
	exptectedRes: Infinity,
	expectedCovVec: Uint8Array.from([1, 0, 1, 3, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1])
}, {
	input: -Infinity,
	exptectedRes: -Infinity,
	expectedCovVec: Uint8Array.from([1, 0, 2, 2, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0])
}, {
	input: 'hello',
	exptectedRes: 'hello323',
	expectedCovVec: Uint8Array.from([1, 0, 1, 2, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0])
}];

describe("Instrumentation Tests", () => {
	const ASTInstrumentedWithCoverage = coverageInstrumentor.instrument(targetAST);
	const ASTInstrumentedWithCoverageSrc = escodegen.generate(ASTInstrumentedWithCoverage.astRoot);
	const ASTInstrumentedWithCoverageSrcFunc = requireFromString(ASTInstrumentedWithCoverageSrc, 'tmpFilename');
	it("Coverage instrumenter test", async () => {
		for (let i = 0; i < CoverageInstrumenterTestInputToExpectedResultsMap.length; ++i) {
			coverageInstrumentor.resetGlobalStorage();
			const input = CoverageInstrumenterTestInputToExpectedResultsMap[i].input;
			const exptectedRes = CoverageInstrumenterTestInputToExpectedResultsMap[i].exptectedRes;
			const expectedCovVec = CoverageInstrumenterTestInputToExpectedResultsMap[i].expectedCovVec;
			let res = await ASTInstrumentedWithCoverageSrcFunc(input);
			let covVec = coverageInstrumentor.getGlobalStorage();
			expect(res).to.equal(exptectedRes);
			expect(covVec.isEqual(expectedCovVec)).to.equal(true);
		}
	});

	it("New instrumenter test", () => {
		const ASTInstrumentedWithAll = toyExampleInstrumentor.instrument(ASTInstrumentedWithCoverage);
		const ASTInstrumentedWithAllSrc = escodegen.generate(ASTInstrumentedWithCoverage.astRoot);
		const ASTInstrumentedWithAllSrcFunc = requireFromString(ASTInstrumentedWithAllSrc, 'tmpFilename');
		let res = ASTInstrumentedWithAllSrcFunc();
		expect(res).to.equal('gabaza');
 	});
});