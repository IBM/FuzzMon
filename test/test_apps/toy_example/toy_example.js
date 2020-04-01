'use strict';

const not_a_toy_example = require('./not_a_toy_example');

function beh(a) {
	// console.log(a);
}

function blah(input2) {
	let c = input2 + 2;
	if (input2 + c > 24) {
		if (meh(input2 / 9) > 0) {
			console.log('trololo');
		}
	}
}

function meh(input) {
	let a = 2;
	a = input;
	let b = 2;
	let e = 3;
	let c = 0;
	beh(e);
	let zz = function gabaza() {
		x = 2;
	}

	if (a > 3) {
		b = 3;
		if (a + b < 13) {
			c = 2;
			e = 5;
		}
	}
	zz();
	c += a + b;
	e += 4;
	if (a + b +
		c > 18) {
		if ((c > 10) && (a + b < 10)) {
			e += 4;
			return 1;
		}
	}
	if (false) {
		var x = 2;
	}
	return 0;
}

exports.meh = meh;
exports.blah = blah;