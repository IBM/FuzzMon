const http = require('http');
const url = require('url');

exports.server = null;


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

exports.run = function() {
	exports.server = http.createServer(async function foo(req, res) {
		let userInputURL = url.parse(req.url, true);
		let params = userInputURL.query;
		if (!params['foo']) {
			res.end();
			return;
		}
		if (!Number(params['foo'])) {
			res.end();
			return;
		}
		if (params['foo'] && meh(Number(params['foo'])) == 1) {
			res.write('success!');
		} else {
			res.write('yalla bye!');
		}
		res.end();
	}).listen(8086);
}
exports.stop = function() {
	exports.server.close();
}

exports.run();