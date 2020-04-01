// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const SimpleGenerator = require('./simpleGenerator');
const config = require('../config');

require('../common/utils');

/**
 * Class responsible for generating mutations given an input
 */
class GenericMutator {
	/**
	 * Removes a random range from string.
	 *
	 * @param      {string}  input   The input
	 * @return     {number}  Mutated input
	 */
	static removeRangeInString(input) {
		if (!input) {
			return '';
		}
		input = input + ''; // making sure it's a string
		var start = Math.randomInt(input.length - 1);
		var end = Math.randomInt(input.length - 1, start + 1);
		return input.substring(start, end);
	}

	static insertNullTerminator(input) {
		input = input + ''; // making sure it's a string
		if (Math.random() > 0.3) {
			input.insertTo(Math.randomInt(input.length), '\x00');
		}
		return input;
	}

	static appendChar(input) {
		input = input + ''; // making sure it's a string
		return input + Math.randomString(1);
	}

	static prependChar(input) {
		input = input + ''; // making sure it's a string
		return Math.randomString(1) + input;
	}

	/**
	 * Swaps two random characters in a string
	 *
	 * @param      {string}  input   The input
	 * @return     {number}  Mutated input
	 */
	static swapChars(input) {
		input = input + ''; // making sure it's a string
		var inputLength = input.length;
		var idx1 = Math.randomInt(inputLength);
		var idx2 = Math.randomInt(inputLength);
		return input.split('')
			.swap(idx1, idx2)
			.join('');
	}

	/**
	 * Flips a random character in a string
	 *
	 * @param      {string}  input   The input
	 * @return     {number}  Mutated input
	 */
	static flipChar(input) {
		input = input + ''; // making sure it's a string
		let newChar = (Math.random() > 0.999) ?
			String.fromCharCode(0x30A0 + Math.random() * (0x60 /*=0x30FF-0x30A0+1*/ )) : // unicode character
			Math.random()
			.toString(36)
			.substring(7, 8); // ascii character
		return input.setCharAt(Math.randomInt(input.length - 1), newChar);
	}

	static flipBit(input) {
		if (Math.random() > 0.8) {
			return !!!input; // Who on earth would use this syntax? 
		}
	}

	/**
	 * Returning `undefined`
	 *
	 * @param      {?}  input   The input
	 */
	static undefine(input) {
		return undefined;
	}

	/**
	 * Returning `null`
	 *
	 * @param      {?}  input   The input
	 */
	static nullify(input) {
		return null;
	}

	/**
	 * Mutates a numeric input
	 *
	 * @param      {number}  input   The input
	 * @return     {number}  Mutated input
	 */
	static numBasicMathOp(input) {
		if (Math.random() > 0.5) {
			return input + (Math.random() > 0.9 ? 1 : -1);
		} else if (Math.random() > 0.5) {
			return input - (Math.random() > 0.9 ? 1 : -1);
		} else if (Math.random() > 0.5) {
			return input * (Math.random() * (Math.random() > 0.9 ? 1 : -1));
		} else if (Math.random() > 0.5) {
			return input / (Math.random() * (Math.random() > 0.9 ? 1 : -1));
		}
		return input;
	}

	static reverseNumber(input) {
		return Number(('' + input).split('').reverse().join(''));
		// var reversed = 0;
		// while (input != 0) {
		// 	reversed *= 10;
		// 	reversed += input % 10;
		// 	input -= input % 10;
		// 	input /= 10;
		// }

		// return reversed;
	}

	static numberToFloat(input) {
		return input * Math.random();
	}

	static numberToInt(input) {
		return Math.round(input);
	}

	static numberToHexString(input) {
		if (!input) {
			input = Math.randomInt(config.mutation.maxRandomInt);
		}
		return '0x' + (input).toString(16);
	}

	static numberToOctalString(input) {
		if (!input) {
			input = Math.randomInt(config.mutation.maxRandomInt);
		}
		return (input).toString(8);
	}

	static init(mutatorInstance) {
		mutatorInstance.addMutationFunction('string', 'generic', GenericMutator.removeRangeInString, 0);
		mutatorInstance.addMutationFunction('string', 'generic', GenericMutator.prependChar, 0);
		mutatorInstance.addMutationFunction('string', 'generic', GenericMutator.appendChar, 0);
		mutatorInstance.addMutationFunction('string', 'generic', GenericMutator.nullify, 0);
		mutatorInstance.addMutationFunction('string', 'generic', GenericMutator.insertNullTerminator, 0);
		mutatorInstance.addMutationFunction('string', 'generic', GenericMutator.swapChars, 0);
		mutatorInstance.addMutationFunction('string', 'generic', GenericMutator.flipChar, 0);

		mutatorInstance.addMutationFunction('hexNumber', 'generic', GenericMutator.removeRangeInString, 0);
		mutatorInstance.addMutationFunction('hexNumber', 'generic', GenericMutator.nullify, 0);
		mutatorInstance.addMutationFunction('hexNumber', 'generic', GenericMutator.swapChars, 0);
		mutatorInstance.addMutationFunction('hexNumber', 'generic', GenericMutator.numBasicMathOp, 0);

		mutatorInstance.addMutationFunction('number', 'generic', GenericMutator.nullify, 0);
		mutatorInstance.addMutationFunction('number', 'generic', GenericMutator.numberToInt, 0);
		mutatorInstance.addMutationFunction('number', 'generic', GenericMutator.numberToFloat, 0);
		mutatorInstance.addMutationFunction('number', 'generic', GenericMutator.numBasicMathOp, 0);
		mutatorInstance.addMutationFunction('number', 'generic', GenericMutator.reverseNumber, 0);
		mutatorInstance.addMutationFunction('number', 'generic', GenericMutator.numberToOctalString, 0);
		mutatorInstance.addMutationFunction('number', 'generic', GenericMutator.numberToHexString, 0);

		mutatorInstance.addMutationFunction('boolean', 'generic', GenericMutator.nullify, 0);
		mutatorInstance.addMutationFunction('boolean', 'generic', GenericMutator.flipBit, 0);

		mutatorInstance.addMutationFunction('undefined', 'generic', GenericMutator.nullify, 0);
		mutatorInstance.addMutationFunction('undefined', 'generic', SimpleGenerator.generateRandomInput, 0);
	}
}

module.exports = GenericMutator;