// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const Utils = require('../common/utils');
const MyMath = require('../common/math');
const Type = require('../entities/entities').Type;
const config = require('../config');
const logger = require('../common/logger');
const AbstractMutator = require('.').AbstractMutator;
const path = require('path');

const dirTravesalPath = '/../../../../../../../../../../..' + config.dirTravesalTestFilePath;

// Ascii
const parentDirStr = '../';
const parentDirRegex = /\.\.\//g;

// Hex
const hexParentDirStr = "2e2e2f";
const hexParentDirRegex = /2e2e2f/g;

// Base 64
const base64ParentDirStr = "Li4v";
const base64ParentDirRegex = /Li4v/g;

const nullTerminator = '\x00';

/**
 * Class responsible for generating mutations given an input
 */
class DirectoryTraversalMutator {
	/* 
	Each function receives an input,
	*/
	static addDirTravesalPath(input) {
		input = input + ''; // making sure it's a string
		
		let rnd = Math.randomInt(4);
		if (0 == rnd) {
			return input + dirTravesalPath;
		} else if (1 == rnd) {
			return dirTravesalPath + input; 
		} else  if (2 == rnd) {
			return dirTravesalPath; 
		} else if (3 == rnd) {
			return input + dirTravesalPath + nullTerminator;
		}
		return input;
	}

	static addParentDirStr(input) {
		input = input + ''; // making sure it's a string
		return input.insertSubstrTo(Math.randomInt(input.length), parentDirStr);
	}

	static addHexParentDirStr(input) {
		input = input + ''; // making sure it's a string
		return input.insertSubstrTo(Math.randomInt(input.length), hexParentDirStr);
	}

	static addBase64ParentDirStr(input) {
		input = input + ''; // making sure it's a string
		return input.insertSubstrTo(Math.randomInt(input.length), base64ParentDirStr);
	}

	static changeBaseFromAscii(input) {
		input = input + ''; // making sure it's a string
		// The '../' substring exist, thus we will change it to hex or base64
		if (input && input.indexOf && input.indexOf(parentDirStr) != -1) {
			if (Math.random() < 0.5) {
				return input.replace(parentDirRegex, base64ParentDirStr);
			} else {
				return input.replace(parentDirRegex, hexParentDirStr);
			}
		}
		// the '../' substring doesn't exist, and we will simply add it..
		return DirectoryTraversalMutator.addParentDirStr(input);
	}

	static changeBaseFromHex(input) {
		input = input + ''; // making sure it's a string
		// The '2e2e2f' substring exist, thus we will change it to ascii or base64
		if (input && input.indexOf && input.indexOf(hexParentDirStr) != -1) {
			if (Math.random() < 0.7) {
				return input.replace(hexParentDirRegex, parentDirStr);
			} else {
				return input.replace(hexParentDirRegex, base64ParentDirStr);
			}
		}

		// the '2e2e2f' substring doesn't exist, and we will simply add it..
		return DirectoryTraversalMutator.addHexParentDirStr(input);
	}

	static changeBaseFromBase64(input) {
		input = input + ''; // making sure it's a string
		var parentDirIndex = input.indexOf(base64ParentDirStr);
		// The 'Li4v' substring exist, thus we will change it to ascii or hex
		if (parentDirIndex != -1) {
			if (Math.random() < 0.7) {
				return input.replace(base64ParentDirRegex, parentDirStr);
			} else {
				return input.replace(base64ParentDirRegex, hexParentDirStr);
			}
		}
		// the 'Li4v' substring doesn't exist, and we will simply add it..
		return DirectoryTraversalMutator.addBase64ParentDirStr(input);
	}

	static changeBase(input) {
		input = input + ''; // making sure it's a string
		// Changes from one bases with different probabilites..
		if (Math.random() < 0.2) {
			return DirectoryTraversalMutator.changeBaseFromAscii(input);
		} else if (Math.random() < 0.6) {
			return DirectoryTraversalMutator.changeBaseFromHex(input);
		}
		return DirectoryTraversalMutator.changeBaseFromBase64(input);
	}

	static RemoveParentDir(input) {
		input = input + ''; // making sure it's a string
		// Changes from one bases with different probabilites..
		if (Math.random() < 0.4) {
			return input.replace(parentDirRegex, "");
		} else if (Math.random() < 0.7) {
			return input.replace(hexParentDirRegex, "");
		}
		return input.replace(base64ParentDirRegex, "");
	}

	static init(mutatorInstance) {
		mutatorInstance.addMutationFunction('string', 'directoryTraversal', DirectoryTraversalMutator.changeBase, 0);
		mutatorInstance.addMutationFunction('string', 'directoryTraversal', DirectoryTraversalMutator.addHexParentDirStr, 0);
		mutatorInstance.addMutationFunction('string', 'directoryTraversal', DirectoryTraversalMutator.addBase64ParentDirStr, 0);
		mutatorInstance.addMutationFunction('string', 'directoryTraversal', DirectoryTraversalMutator.addParentDirStr, 0);
		mutatorInstance.addMutationFunction('string', 'directoryTraversal', DirectoryTraversalMutator.addDirTravesalPath, 0);

		mutatorInstance.addMutationFunction('hexNumber', 'directoryTraversal', DirectoryTraversalMutator.addBase64ParentDirStr, 100);
		mutatorInstance.addMutationFunction('hexNumber', 'directoryTraversal', DirectoryTraversalMutator.addHexParentDirStr, 100);
		mutatorInstance.addMutationFunction('hexNumber', 'directoryTraversal', DirectoryTraversalMutator.changeBase, 100);
		mutatorInstance.addMutationFunction('hexNumber', 'directoryTraversal', DirectoryTraversalMutator.addParentDirStr, 100);
		mutatorInstance.addMutationFunction('hexNumber', 'directoryTraversal', DirectoryTraversalMutator.addDirTravesalPath, 100);
	}
}

module.exports = DirectoryTraversalMutator;