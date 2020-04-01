// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
'use strict';

const config = require('../config');
const utils = require("../common/utils")

// Changed file name dest for easier debugging.. return this to old file after done..
const shellInjectionCommands = [`echo injected > ${config.shellInjectionTargetFilePath}`, `touch ${config.shellInjectionTargetFilePath}`];

// The actual command injection
// HACK
const jsInjectionCommand = shellInjectionCommands[0]; // `require('child_process').execSync("echo injected! > ${config.shellInjectionTargetFilePath}");`

// This are a seperators that are used against input sanitizers that are not checking everything.
const tabString = '\t'
const whitespaceString = ' '
const whitespaceRegex = /\s/g
const unixSeparatorString = '$IFS$9';
const semicolonString = ';';
const andString = '&';
const andExpression = '&&';
const pipeString = '|';
const pipeRegex = /\|/g
const backtickString = '`';
const separatorsArray = [unixSeparatorString, semicolonString,
	andString, pipeString,
	tabString, whitespaceString,
	andExpression, backtickString
];

const backticksCommands = ['`' + config.shellInjectionCommand + '`'];
const dollarCommands = ['$(' + config.shellInjectionCommand + ')']; 
// const backticksCommands = [` \`echo injected > ${config.shellInjectionTargetFilePath}\` `, ` \`touch ${config.shellInjectionTargetFilePath}\` `];
// const dollarCommands = [` $( injected > ${config.shellInjectionTargetFilePath}) `, ` $(touch ${config.shellInjectionTargetFilePath}) `];

// Null terminator of strings
const nullTerminator = '\x00'

/**
 * Class responsible for generating mutations given an input
 */
class ShellInjectionMutator {

	// -------- "reset" input functions --------
	// Returns the original injection code (back to the starting point)
	static getShellInjectionCode(input) {
		return shellInjectionCommands.randomItem();
	}

	static getJSInjectionCode(input) {
		return jsInjectionCommand;
	}

	// ---------- Addition of injection code to the given input functions -------
	static injectBefore(input, str2inject) {
		input = input + ''; // making sure it's a string
		return str2inject + ';' + input;
	}

	static injectAfter(input, str2inject) {
		input = input + ''; // making sure it's a string
		return input + ';' + str2inject;
	}

	static injectAtRandomLocation(input, str2inject) {
		input = input + ''; // making sure it's a string
		return input.insertSubstrTo(Math.randomInt(input.length), str2inject);
	}

	static injectShellCode(input) {
		var rand = Math.random();
		if (rand < 0.5) {
			return ShellInjectionMutator.injectBefore(input, shellInjectionCommands.randomItem());
		} else if (rand < 0.95) {
			return ShellInjectionMutator.injectAfter(input, shellInjectionCommands.randomItem());
		}
		return ShellInjectionMutator.injectAtRandomLocation(input, shellInjectionCommands.randomItem());
	}

	static injectJSCode(input) {
		var rand = Math.random();
		if (rand < 0.5) {
			return ShellInjectionMutator.injectBefore(input, jsInjectionCommand);
		} else if (rand < 0.95) {
			return ShellInjectionMutator.injectAfter(input, jsInjectionCommand);
		}
		return ShellInjectionMutator.injectAtRandomLocation(input, jsInjectionCommand);
	}

	static injectCode(input) {
		var rand = Math.random();
		if (rand < 0.9) {
			return ShellInjectionMutator.injectShellCode(input);
		}
		return ShellInjectionMutator.injectJSCode(input);
	}

	// ------------ Addition of special sperators to the given input ---------
	static insertSepartorBefore(input) {
		input = input + ''; // making sure it's a string
		return separatorsArray.randomItem() + input;
	}

	static insertSepartorAfter(input) {
		input = input + ''; // making sure it's a string
		return input + separatorsArray.randomItem();
	}

	static insertSeparatorAtRandomLocation(input) {
		input = input + ''; // making sure it's a string
		return input.insertSubstrTo(Math.randomInt(input.length), separatorsArray.randomItem());
	}

	static addSeparator(input) {
		input = input + ''; // making sure it's a string
		let rand = Math.random();
		//Low probability because separator before and in middle of input is usually not to good
		if (rand < 0.1) {
			return ShellInjectionMutator.insertSepartorBefore(input);
		} else if (rand < 0.2) {
			return ShellInjectionMutator.insertSeparatorAtRandomLocation(input);
		}
		return ShellInjectionMutator.insertSepartorAfter(input);
	}

	// --------- Replacement of special separators -----------
	static replaceSepartors(input) {
		input = input + ''; // making sure it's a string
		let rand = Math.random();
		if (rand < 0.3) {
			return input.replace(whitespaceRegex, semicolonString);
		} else if (rand < 0.6) {
			return input.replace(pipeRegex, unixSeparatorString);
		}
		return input.replace(whitespaceRegex, unixSeparatorString);
	}

	// -------------- Inject Backticks/$() code --------------------
	static injectBackticksCode(input) {
		input = input + ''; // making sure it's a string
		var rand = Math.random();
		if (rand < 0.6) {
			return input + backticksCommands.randomItem();
		}
		const sepWithBacktick = separatorsArray.randomItem() + backticksCommands.randomItem();
		return input + sepWithBacktick;
	}

	static injectDollarCode(input) {
		input = input + ''; // making sure it's a string
		var rand = Math.random();
		if (rand < 0.6) {
			return input + dollarCommands.randomItem();
		}
		const doubleDollarCmd = dollarCommands.randomItem() + dollarCommands.randomItem()
		return input + doubleDollarCmd;
	}

	// ----------------- Change encoding ----------------------------
	static changeEncoding(input) {
		input = input + ''; // making sure it's a string
		var rand = Math.random();
		if (rand < 0.1) {
			return Buffer.from(input).toString('ucs2');
		} else if (rand < 0.2) {
			return Buffer.from(input).toString('utf16le');
		} else if (rand < 0.3) {
			return Buffer.from(input).toString('latin1');
		} else if (rand < 0.4) {
			return Buffer.from(input).toString('hex');
		} else if (rand < 0.6) {
			return Buffer.from(input).toString('base64');
		} else if (rand < 0.8) {
			return Buffer.from(input).toString('utf-8');
		}
		return Buffer.from(input).toString('ascii');
	}

	static init(mutatorInstance) {
		mutatorInstance.addMutationFunction('string', 'shellInjection', ShellInjectionMutator.injectCode, 0);
		mutatorInstance.addMutationFunction('string', 'shellInjection', ShellInjectionMutator.getShellInjectionCode, 0);
		mutatorInstance.addMutationFunction('string', 'shellInjection', ShellInjectionMutator.getJSInjectionCode, 0);
		mutatorInstance.addMutationFunction('string', 'shellInjection', ShellInjectionMutator.addSeparator, 0);
		mutatorInstance.addMutationFunction('string', 'shellInjection', ShellInjectionMutator.replaceSepartors, 0);
		mutatorInstance.addMutationFunction('string', 'shellInjection', ShellInjectionMutator.injectBackticksCode, 0);
		mutatorInstance.addMutationFunction('string', 'shellInjection', ShellInjectionMutator.changeEncoding, 0);
	}
}

module.exports = ShellInjectionMutator;