const evaluate = require('.');
const esprima = require('esprima');
const escodegen = require('escodegen');

function testFunc(input) {
	evaluate(input);
}
module.exports.testFunc = testFunc;