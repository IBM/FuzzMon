// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const fs = require('fs');
const path = require('path');
const esprima = require('esprima');
const escodegen = require('escodegen');
const AST = require('../static_analysis/ast').AST;
const logger = require('../common/logger');

require('../common/utils');

var origStdout = process.stdout.write;
var origStderr = process.stderr.write;

/**
 * Turns on/off the output of stderr/stdout.
 * This might be useful if the target program produces lots of prints
 *
 * @param      {boolean}  isIOEnabled  Indicates if stdout/stderr should be blocked or not
 */
function setIO(isIOEnabled) {
	if (isIOEnabled) {
		process.stdout.write = origStdout;
		process.stderr.write = origStderr;
	} else {
		origStdout = process.stdout.write;
		origStderr = process.stderr.write;
		process.stdout.write = null;
		process.stderr.write = null;
	}
}

/**
 * Class for hook require.
 */
class HookRequire {
	/**
	 * "Registers" the instrumenters so that they'll run on the next call to require
	 *
	 * @param      {Project}                 project            Instance of the Project class (@see project.js)
	 * @param      {[AbstractInstrumenter]}  instrumentersList  List of instrumenters to apply.
	 */
	static set(project, instrumentersList) {
		require.extensions['.js'] = function(module, filename) {
			if (!fs.existsSync(filename)) {
				console.log('Couldn\'t find', filename);
				logger.exitAfterFlush(1);
			}
			let sourceASTIdx = project.astObjList.findIndex(astObj => filename === astObj.filename);
			if (sourceASTIdx < 0) {
				let sourceCode = fs.readFileSync(filename, 'utf8');
				sourceCode = sourceCode.stripBom();
				module._compile(sourceCode, filename);
				return;
			}
			let origAST = project.astObjList[sourceASTIdx];
			let instrumentedASTSrc = null;
			try {
				let instrumetedAST = instrumentersList
					.reduce((instrumetedAST, instrumenter) =>
						instrumenter.instrument(instrumetedAST),
						origAST);
				if (instrumetedAST.astRoot) {
					instrumetedAST = instrumetedAST.astRoot;
				}
				instrumentedASTSrc = escodegen.generate(instrumetedAST);
				project.astObjList[sourceASTIdx].reset();
				project.astObjList[sourceASTIdx].process();
			} catch (e) {
				throw Error('Error in `require.extensions` ' + e.toString());
			}
			module._compile(instrumentedASTSrc, filename);
		};
	}

	/**
	 * Rescinds the influence of the instrumenters for the file with the given name
	 *
	 * @param      {Project} project   Instance of the Project class (@see project.js)
	 * @param      {string}  filename  The name of the file that we'd like to use w/o instrumenters
	 */
	static _deleteModule(moduleName) {
		// console.log('moduleName:', moduleName);
		if (!moduleName) {
			return;
		}
		var resolvedName = require.resolve(moduleName);
		if (path.extname(resolvedName) !== '.js') {
			return;
		}
		var nodeModule = require.cache[resolvedName];
		if (nodeModule) {
			delete require.cache[resolvedName];
			nodeModule.children
				.filter(child => require.resolve(child.filename) !== resolvedName)
				.map(child =>
					HookRequire._deleteModule(child.filename)
				);
		}
	}

	static clearCache(listOfFiles) {
		let moduleNames = Object.keys(require.cache)
			.map(cacheFilename => require.resolve(cacheFilename));
		if (listOfFiles) {
			moduleNames = moduleNames
				.filter(cacheFilename => listOfFiles.includes(cacheFilename));
		}
		moduleNames.map(m => HookRequire._deleteModule(m));
	}
}

/**
 * Abstract class representing a single runner
 *
 * @class      AbstractRunner (name)
 */
class AbstractRunner {
	/**
	 * Constructs the object.
	 *
	 * @param      {Project}                 project            Instance of the Project class (@see project.js)
	 * @param      {string}                  entryFilename      The name of the entry file
	 * @param      {[AbstractInstrumenter]}  instrumentersList  List of instrumenters to apply.
	 */
	constructor(project, expert, entryFilename, instrumentersList) {
		console.log('Created AbstractRunner');
		this.entryFilename = entryFilename;
		this.project = project;
		this.expert = expert;
		this.instrumentersList = (instrumentersList instanceof Array) ? instrumentersList : [instrumentersList];
		this.instrumentersList = this.instrumentersList.filter(i => i); // making sure all instruments are defined
		this.hModule = null;
	}

	/**
	 * Initializes the runner
	 */
	async init() {
		console.log('Called init of AbstractRunner');
		let listOfFiles = this.project.astObjList.map(astObj => require.resolve(astObj.filename));
		HookRequire.clearCache(listOfFiles);
		this.instrument();
		this.hModule = await this.load();
		if (!this.hModule) {
			throw Error('Invalid hModule');
		}
	}

	/**
	 * Runs an already instrumented and loaded module
	 *  
	 * @param      {GeneralizedInput}  generalizedInput  The input we'd like to run the entry point with
	 * @note This method is abstract and should be overriden in the derived calss
	 */
	async run(generalizedInput) {
		throw Error('Run should be implemented in derived classes');
	}

	/**
	 * Halts the running instance
	 * 
	 * @note This method is abstract and should be overriden in the derived calss
	 */
	stop() {
		throw Error('Stop should be implemented in derived classes');
	}

	/**
	 * Saves a current working directory.
	 * Some programs want to run from their native direcotry. 
	 * This is used to ensure they can do it w/o harming the execution of this project.
	 */
	saveCurAbsState() {
		this.savedDir = process.cwd();
		this.curRequireFileName = require.main.filename;
	}

	/**
	 * Changes the current directory
	 */
	changeDir(path) {
		process.chdir(path);
	}

	/**
	 * Changes the file name in `require.main.filename`
	 */
	changeRequireFilename(filename) {
		require.main.filename = filename;
	}

	/**
	 * Restores the current directory
	 */
	restoreDir() {
		if (this.savedDir) {
			process.chdir(this.savedDir);
			this.savedDir = null;
		}
		if (this.curRequireFileName) {
			require.main.filename = this.curRequireFileName;
			this.curRequireFileName = null;
		}
	}

	/**
	 * Instruments the source code in the given project, and loads it *without* running
	 *
	 * @param      {Project}                 project              Instance of the Project class, containing all of the ASTs, the graphs, etc.
	 * @param      {[AsbtractInstrumenter]}  instrumentersList    List of instrumenters to apply on the source code
	 * @return Handle to the loaded module
	 */
	instrument() {
		HookRequire.set(this.project, this.instrumentersList);
	}

	/**
	 * Loads the project we're working on w/o running it (just calls `require`)
	 *
	 * @return     {Function}  Handle returned from `require`
	 */
	async load() {
		let fullPath = path.resolve(this.entryFilename);
		this.saveCurAbsState();
		this.changeDir(path.dirname(fullPath));
		this.changeRequireFilename(fullPath);
		let handle = await require(fullPath);
		this.restoreDir();
		return handle;
	}
}



exports.AbstractRunner = AbstractRunner;
exports.HookRequire = HookRequire;
exports.setIO = setIO;