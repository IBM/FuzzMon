// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const AbstractTarget = require('./abstractTarget');
const config = require('../config');

class ShellInjectionTarget extends AbstractTarget {
	constructor(filename) {
		super('ShellInjectionTarget');
		this.filename = filename;
		this.funcNameToFuzzMonNameMap = {
			'exec': '_fuzzMonExec',
			'execFile': '_fuzzMonExecFile',
			'fork': '_fuzzMonFork',
			'spawn': '_fuzzMonSpawn',
			'execFileSync': '_fuzzMonExecFileSync',
			'execSync': '_fuzzMonExecSync',
			'spawnSync': '_fuzzMonSpawnSync'
		};

		this.targetFunctions = {
			'child_process': ['exec', 'execFile', 'fork', 'spawn', 'execFileSync', 'execSync', 'spawnSync']
		};
	}

	getInstrumenters() {
		return [];
	}

	getTargetFunctions() {
		if (!this.targetFuncsList) {
			this.targetFuncsList = this.targetASTNodes.map(item =>
					item.nodePtrs.map(nodePtr => item.ast.getContainingFunction(nodePtr)))
				.flatten()
		}
		return this.targetFuncsList;
	}

	renameFuncsInAST(astObj) {
		return Object.keys(this.targetFunctions).map(targetModuleName =>
				this.targetFunctions[targetModuleName].map(targetFuncName =>
					astObj.renameCallToFunc(targetModuleName, targetFuncName, this.funcNameToFuzzMonNameMap[targetFuncName])
				)
			)
			.flatten();
	}

	init(project) {
		this.project = project;
		this.initGlobalFuncs();
		this.targetASTNodes = this.project.astObjList.map(astObj => {
			return {
				ast: astObj,
				nodePtrs: this.renameFuncsInAST(astObj)
			}
		});

		// making sure that the executable to run is in position 
		if (!require('fs').existsSync(config.shellInjectionCommand)){
			throw Error(`${config.shellInjectionCommand} executable file not found. Shell injection will not work.`);
		}

		// making sure that the target file does not exist
		if (require('fs').existsSync(config.shellInjectionTargetFilePath)) {
			require('fs').unlinkSync(config.shellInjectionTargetFilePath);
		}
	}

	isTargetReached(resultsList) {
		return global['ShellInjectionTarget_success'];
	}

	initGlobalFuncs() {
		global['_fuzzMonCheckShellInjectionSuccess'] = () => {
			global['ShellInjectionTarget_success'] = require('fs').existsSync(config.shellInjectionTargetFilePath);
		}
			// const touchRegExp = /.*touch ([^\s;|&]+)[ ]*.*/g;
			// let match = touchRegExp.exec(command);
			// if (match.length === 0) {
			// 	global['ShellInjectionTarget_success'] = false;
			// } else {
			// 	let filename = match[1];
			// 	let exists = require('fs').existsSync(filename);
			// 	if (exists) {
			// 		global['ShellInjectionTarget_success'] = exists;
			// 		return;
			// 	}
			// }

			// const echoRegExp = /.*echo.*>[ ]*([^\s;&|]+).*/g;
			// match = touchRegExp.exec(command);
			// if (match.length === 0) {
			// 	global['ShellInjectionTarget_success'] = false;
			// } else {
			// 	let filename = match[1];
			// 	let exists = require('fs').existsSync(filename);
			// 	if (exists) {
			// 		global['ShellInjectionTarget_success'] = exists;
			// 		return;
			// 	}
			// }
			// global['ShellInjectionTarget_success'] = false;
			// }

		global['_fuzzMonExec'] = (command, options, callback) => {
			let res = require('child_process').exec(command, options, callback);
			global['_fuzzMonCheckShellInjectionSuccess']();
			return res;
		}

		global['_fuzzMonExecFile'] = (args, options, callback) => {
			let res = require('child_process').execFile(file, args, options, callback);
			global['_fuzzMonCheckShellInjectionSuccess']();
			return res;
		}

		global['_fuzzMonFork'] = (modulePath, args, options) => {
			let res = require('child_process').fork(modulePath, args, options);
			// TODO: IMPLEMENT. THIS IS FOR JS ONLY
			global['_fuzzMonCheckShellInjectionSuccess']();
			return res;
		}

		global['_fuzzMonSpawn'] = (command, args, options) => {
			let res = require('child_process').spawn(command, args, options);
			// TODO: implement
			// global['_fuzzMonCheckShellInjectionSuccess'](command);
			return res;
		}

		global['_fuzzMonExecFileSync'] = (file, args, options) => {
			let res = require('child_process').execFileSync(file, args, options);
			// TODO: implement
			// global['_fuzzMonCheckShellInjectionSuccess']();
			return res;
		}

		global['_fuzzMonExecSync'] = (command, options) => {
			let res = require('child_process').execSync(command, options);
			global['_fuzzMonCheckShellInjectionSuccess']();
			return res;
		}

		global['_fuzzMonSpawnSync'] = (command, args, options) => {
			let res = require('child_process').spawnSync(command, args, options);
			// TODO: implement
			// global['_fuzzMonCheckShellInjectionSuccess']();
			return res;
		}

		global['ShellInjectionTarget_success'] = false;
	}

	eq(rhs) {
		return false;
	}
}



module.exports = ShellInjectionTarget;