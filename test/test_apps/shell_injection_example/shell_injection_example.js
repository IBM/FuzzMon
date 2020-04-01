const child_process = require('child_process');

function one(my_input) {
	child_process.execSync(my_input);
}

function two(my_input) {
	one('cat ' + my_input);
}

function three(my_input) {
	if (my_input.includes('\'') || my_input.includes('\"') || my_input.includes(' ')) {
		throw Error('Invalid input. Are you trying to execute something?');
	} else {
		two(my_input);
	}
}

var four = function(three_cb, my_input) {
	if (my_input.length < 5 || my_input.length > 30) {
		throw Error('Invalid length');
	} else {
		three_cb(my_input);
	}
}

function five(my_input) {
	if (typeof(my_input) !== 'string') {
		throw Error('Invalid input type');
	} else {
		four(three, my_input);
	}
}

exports.main = (my_input) => {
	five(my_input);
}
// exports.main(';/tmp/create_file');