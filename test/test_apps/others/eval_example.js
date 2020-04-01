
var evaluate = require('static-eval');
var parse = require('esprima').parse;


function one(my_input) {
	// console.log('1:', my_input);
	var my_input_with_brackets = my_input.endsWith("()") ? my_input : my_input + "()";
	var ast = parse(my_input_with_brackets).body[0].expression;
	var b = true
	
	if (!ast){
		b = false
		ast = parse(my_input).body[0].expression;
	}
	var value = evaluate(ast);
	// console.log(value)
	if (value) {
		if (b){
			console.log('The Input:', my_input_with_brackets);
		} else {
			console.log('The Input:', my_input);
		}
		console.log('The evaluation result:', value);
	} 
}

exports.main = (my_input) => {
	one(my_input);
}
// exports.main(';/tmp/create_file');