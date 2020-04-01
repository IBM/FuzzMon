// run this with --allow-natives-syntax
%NeverOptimizeFunction(testWithFunctionCaller); 
%NeverOptimizeFunction(testWithStackTrace); 
%NeverOptimizeFunction(withFunctionCaller); 
%NeverOptimizeFunction(withStackTrace);

const TIMES_TO_RUN = 100000;

function withStackTrace() {
	(new Error()).stack;
}

function withFunctionCaller() {
	withFunctionCaller.caller;
}

function testWithStackTrace() {
	var t0 = Date.now();
	for (let i = 0; i < TIMES_TO_RUN; ++i) {
		withStackTrace();
	}
	var t1 = Date.now();
	console.log('testWithStackTrace:', (t1 - t0));
}

function testWithFunctionCaller() {
	var t0 = Date.now();
	for (let i = 0; i < TIMES_TO_RUN; ++i) {
		withFunctionCaller();
	}
	var t1 = Date.now();
	console.log('testWithFunctionCaller:', (t1 - t0));
}

console.log(testWithStackTrace());
console.log(testWithFunctionCaller());