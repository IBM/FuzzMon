const myFSNameGoesHere = require('fs');
let i = 0;

function test(path) {
	++i;
	if (i < 10) {
		return;
	}
	if (i + i > 22) {
		myFSNameGoesHere.unlinkSync(path);
	}
}

module.exports.test = test;