// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

// Please note that 'path' and 'Path' are two different things
// 'path' is a nodejs module, and 'Path' is our own module 
const path = require('path');
const AST = require('./ast').AST;
const CallGraph = require('./callGraph').CallGraph;
const CFGGraph = require('./cfgGraph').CFGGraph;
const TernWrapper = require('./ternWrapper').TernWrapper;
const Utils = require('../common/utils');
const config = require('../config');
const logger = require('../common/logger');

/**
 * Bundle of all the relevant ASTs, CallGraph, VarGraph, etc.
 *
 * @class      Project
 */
class Project {
	/**
	 * Constructs the object.
	 *
	 * @param      {[string]} listOfFiles            List of file names
	 * @param      {string}   targetFileName         The name of the file that contains the target line(s)
	 * @param      {string}   entryFileNames          The name of the file where the execution should start from
	 * @param      {[AbstractTarget]}   targetsList  List of targets
	 * @param      {string}   entryPoints            The entry point name, i.e., the entry function name
	 */
	constructor(listOfFiles, targetsList, entryFilenames) {
		this.isInitialized = false;

		// not setting whether a file is  entry or targets file here. we're doing it in `init`
		this.astObjList = listOfFiles.map(filename => new AST(path.resolve(filename)));
		this.targetsList = targetsList || [];
		// overriten by this.plugin if entryPoints is null or undefined
		this.entryFilenames = entryFilenames || [];
		// making sure the entry points' filenames are the full paths
		this.entryFilenames = entryFilenames.map(efn => path.resolve(efn));

		this.ternWrapper = new TernWrapper();

		// This is used for instrumentation. Once a source is instrumented, the line 
		// numbers (on which we rely on for additional instrumentation) change
		// this.linesMapping = [];
		// this.inverseLinesMapping = [];
	}

	/**
	 * Initializes the project
	 */
	async init() {
		this.astObjList.forEach(astObj => {
			try {
				astObj.init();
				logger.info('AST: done initializing', astObj.filename);
				return astObj;
			} catch (e) {
				return null;
			}
		});

		this.astObjList = this.astObjList.filter(astObj => astObj); // filtering out all the nulls
		if (config.callGraph.staticallyInitializeCallGraph) {
			this.astObjList.map(astObj => this.ternWrapper.addFile(astObj.filename, astObj.sourceCode));
		}

		// We will need the full path to the file here. If you ask yourself 'Why?' See 'hookRequire.set' in runner.js  
		// this.astObjList.map(astObj =>
		// 	this.linesMapping[astObj.filename] = Utils.range(0, astObj.sourceCode.split('\n').length)
		// );

		// this.astObjList.map(astObj =>
		// 	this.inverseLinesMapping[astObj.filename] = Utils.range(1, astObj.sourceCode.split('\n').length + 1)
		// );

		// no try-catch here to bubble the exception up the call hierarchy 
		// this.cfgGraph = new CFGGraph(this.astObjList);
		// if (config.createCFG) {
		// this.cfgGraph.init();
		// }

		this.callGraph = new CallGraph(this);
		await this.callGraph.init(this);
		// this.varGraph = new VarGraph(this.astObjList);
		// await this.varGraph.init(this);

		this.astObjList = this.astObjList.map(astObj => {
			astObj.isEntryFile = this.entryFilenames.some(filename => filename === astObj.filename);
			astObj.isTargetFile = this.targetsList.some(target => target.filename === astObj.filename);
			return astObj;
		});

		this.isInitialized = true;
	}
}

exports.Project = Project;