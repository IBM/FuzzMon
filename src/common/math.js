// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const Random = require("random-js");
const seed = Random.engines.mt19937().autoSeed();
const random = new Random(seed);

const AlphaNumeric = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ASCII = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Rounds a uint8 up to the next higher power of two, with zero remaining at
 * zero. About 5x faster than Math.* ops and we abuse this function a lot.
 *
 * From the bit twiddling hacks site:
 * http://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
 */
function roundUint8ToNextPowerOfTwo(value) {
	value -= 1;
	value |= value >>> 1;
	value |= value >>> 2;
	value |= value >>> 4;
	value += 1;
	return value;
}

/*
 * f(x; x0, b) = (1 / pi) * (b / ((x - x0) ^ 2 + b^2))
 */
function cauchyDistribution(x, gamma = 1, x0 = 0) {
	return (1 / Math.PI) * (gamma / (Math.pow(x - x0, 2) + Math.pow(gamma, 2)));
}


Object.defineProperty(Math, 'randomInt', {
	value: function(max, min) {
		min = min || 0;
		return random.integer(min, max);
	},
	enumerable: false
});

Object.defineProperty(Math, 'randomString', {
	value: function(length/*, base = 36*/) {
		return random.string(length);
	},
	enumerable: false
});

Object.defineProperty(Math, 'randomAlphaNumeric', {
	value: function(length/*, base = 36*/) {
		// return Math.random().toString(base).substring(2, length + 2);
		return random.string(length, AlphaNumeric);
	},
	enumerable: false
});

Object.defineProperty(Math, 'randomASCII', {
	value: function(length/*, base = 36*/) {
		return random.string(length, ASCII);
	},
	enumerable: false
});

exports.roundUint8ToNextPowerOfTwo = roundUint8ToNextPowerOfTwo;
exports.cauchyDistribution = cauchyDistribution;