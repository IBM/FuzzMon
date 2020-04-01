const express = require('express');
const app = express();
const url = require('url');
const Flatted = require('flatted');

var a = 2;
var callbackfunction = () => ++a;

function callbackfunction2(someinput) {
	// another instance of shitty sanitization
	if (/^(?:\w+)(?:\.\w{2,})+(?:\/.*)?/.test(someinput)) {
		throw Error('Malicious input!');
	}
	return someinput;
}

function moo(input) {
	return Number(input) * 2;
}

function baz(callback, inputFromUser) {
	try {
		let callbackRes = callback(inputFromUser);
		if (('' + callbackRes).length > 5) {
			let moo_res = moo(callbackRes);
			return moo_res;
		}
	} catch (e) {

	}
}

function bar(inputFromUser) {
	// shitty sanitization goes here
	if (!inputFromUser || -1 < inputFromUser.indexOf('this is a vary malicious command')) {
		baz(a, 'some constant');
	} else {
		let bar_res = [(input)=>'0xff' + input].map(a => baz(a, inputFromUser)).reduce((acc, cur) => acc + cur, 0);
		return bar_res;
	}
}

var x = 3;

function foo(inputFromUser, dealId) {
	if (dealId > 120) {
		baz(() => --x, '#' + inputFromUser); // making inputFromUser a comment
		return baz(callbackfunction2, inputFromUser + '3');
	} else if (x > 0) {
		--x;
		return foo(inputFromUser, dealId);
	};
	if (0 <= x) {
		return bar(inputFromUser);
	}
}

var funcA = (req, res, next) => {
	var dealId = Number(req.params.dealId);
	if (dealId < foo(req.query.evilUserInput, dealId)) {
		if (dealId > 2) {
			if (a >= 5) {
				console.log('success!');
				res.send('success!');
				return;
			}
		}
	}
	++a;
	res.send('failed!');
}

app.get(/trololo.*/, function(req, res, next) {
	try {
		res.send(req.route.path.toString());
	} catch (e) {
		res.send(e);
	}
});

app.get('/:dealId/snapshots', function appGet(req, res, next) {
	return funcA(req, res, next);
});

app.get('/foo', (req, res, next) => {
	// console.log(`foo middleware`);
	++a;
	foo();
	res.status(200).send('bar');
});

app.get('/', (req, res) => {
	foo();
	return res.send('Hello World!')
});
// console.log('CWD:', process.cwd());
const port = 8086;
exports.server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));
exports.app = app;