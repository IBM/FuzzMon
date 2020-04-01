// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const logger = require('../common/logger');
const path = require('path');
const esprima = require('esprima');
const escodegen = require('escodegen');

const JSFuzzDir = process.env.JSFUZZ_DIR;
const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');
const AST = require('../static_analysis/ast').AST;

require('../common/utils');

/**
 * Namespace for instrumenters
 */
class Instrumenter {
	static createRandomInstGlobalObjName() {
		return 'id_' + Math.floor(Math.random() * 500000).toString(16);
	}
}

Instrumenter.InstrType = Object.freeze({
	LINE_NUM: 1,
	AST_NODE_PTR: 2
});

Instrumenter.InstrRelation = Object.freeze({
	prepend: 'PREPEND',
	append: 'APPEND'
});

/**
 * Abstract class representinga single instrumenter
 */
Instrumenter.AbstractInstrumenter = class {
	/**
	 * Does not construct an object!
	 * This class is abstract and cannot be instanciated!
	 */
	constructor(name) {
		if (!this.initGlobalStorage) {
			throw Error(`'initGlobalStorage' should be implemented in derived classes`);
		}

		if (!this.getGlobalStorage) {
			throw Error(`'getGlobalStorage' should be implemented in derived classes`);
		}

		if (!this.collectInstrumentationData) {
			throw Error(`'collectInstrumentationData' should be implemented in derived classes`);
		}

		if (!this.resetGlobalStorage) {
			throw Error(`'resetGlobalStorage' should be implemented in derived classes`);
		}

		this.name = name; // for debugging
	}

	init( /*project*/ ) {
		throw Error(`'init' should be implemented in the derived classes`);
	}

	clearInstrumentationData() {
		this.outInstrumentationData && delete this.outInstrumentationData;
	}

	instrumentationValueToNodeArray(value) {
		try {
			let valueAST = esprima.parse(value).body;
			valueAST = valueAST instanceof Array ? valueAST : [valueAST];
			valueAST = valueAST
				// First, we unravel the ExpressionStatement
				.map(vAST => 'ExpressionStatement' === vAST.type ? vAST.expression : vAST)
				// Now, we unravel the SequenceExpression
				.map(vAST => 'SequenceExpression' === vAST.type ? vAST.expressions : vAST)
				.flatten();
			return valueAST;
		} catch (e) {
			throw Error('Failed to turn value:' + value + ' into AST');
		}
	}

	instrumentationValueToSeqExpression(value) {
		let valueAST = this.instrumentationValueToNodeArray(value);

		if (valueAST.length > 1) {
			valueAST = {
				"type": "SequenceExpression",
				"expressions": valueAST
			}
		} else {
			valueAST = valueAST[0];
		}
		return valueAST;
	}

	instrumentUsingASTNodePtr(nodePtr, instrRelation, value) {
		let cloneNodePtr = null;

		if (Instrumenter.InstrRelation.append !== instrRelation &&
			Instrumenter.InstrRelation.prepend !== instrRelation) {
			throw Error('Invalid relation: ' + instrRelation);
		}
		// First, we handle the case of 
		// switch (a) {
		// 	case 'foo':
		// 	a++;
		// 	break;
		// 	Where SwitchCase.consequent is an array
		if (nodePtr instanceof Array) {
			let valueAST = this.instrumentationValueToNodeArray(value);
			if (Instrumenter.InstrRelation.prepend === instrRelation) {
				valueAST.map(valAST => {
					nodePtr.unshift(valAST);
					valAST.parent = nodePtr;
				});
			} else {
				valueAST.map(valAST => {
					nodePtr.push(valAST);
					valAST.parent = nodePtr;
				});
			}
		} else if (nodePtr && ((nodePtr.parent && nodePtr.parent.body) || ('BlockStatement' === nodePtr.type))) {
			// Now we handle the case of a BlockStatement
			// or a node inside a "BlockStatement"
			let targetNodePtrArray = ('BlockStatement' === nodePtr.type) ?
				nodePtr.body :
				nodePtr.parent.body;
			let idx = targetNodePtrArray.length > 0 ?
				targetNodePtrArray.indexOf(nodePtr) :
				0;
			let valueAST = this.instrumentationValueToSeqExpression(value);

			if (Instrumenter.InstrRelation.append === instrRelation) {
				idx = (-1 === idx) ? targetNodePtrArray.length - 1 : idx;
				targetNodePtrArray.insert(idx, valueAST);
			} else {
				idx = (-1 === idx) ? 0 : Math.max(--idx, 0);
				targetNodePtrArray.insert(idx, valueAST);
			}
		} else {
			throw Error('Should have not gotten here!');
			// Not sure that we ever get here
			// let tmpParent = nodePtr.parent;
			// let valueAST = this.instrumentationValueToSeqExpression(value);
			// delete nodePtr.parent;
			// cloneNodePtr = Object.assign({}, nodePtr);
			// for (let i in nodePtr) {
			// 	delete nodePtr[i];
			// }
			// nodePtr.type = 'LogicalExpression';
			// nodePtr.operator = '||';
			// nodePtr.right = cloneNodePtr;
			// nodePtr.left = valueAST;
			// valueAST.parent = nodePtr;
			// nodePtr.parent = tmpParent;
		}
	}

	/**
	 * Instruments the given source code using the data passed as param
	 *
	 * @param      {[string]}  source        The source code
	 * @param      {<type>}    filename      Name of the file
	 * @param      {number}    linesMapping  Mapping between the original lines, and the ones after instrumentation. 
	 *                                       The original lines are the indices, and the new lines are the values in the array.
	 * @return     {string}  Instrumented source code
	 */
	instrument(astToInstrument) {
		console.log('Applying', this.name, 'instrumenter on file:', astToInstrument.filename);
		try {
			if (!astToInstrument) {
				throw Error('astToInstrument is invalid');
			}

			let instrumentationData = this.collectInstrumentationData();
			if (0 === instrumentationData.length) {
				return astToInstrument;
			}
			instrumentationData
				.filter(instrData => instrData.astObj.filename === astToInstrument.filename) // we'd like to instrument only a single file at a time
				.map(instrData =>
					this.instrumentUsingASTNodePtr(instrData.astNodePtr, instrData.instrRelation, instrData.value)
				);
			return astToInstrument;
		} catch (e) {
			console.log(e);
			logger.exitAfterFlush();
		}
	}

	toString() {
		return 'Instrumenter type: ' + this.name;
	}
};

/**
 * Class representing data to assist the instrumentation process. 
 * Each instrumenter will create a list of such classes
 */
Instrumenter.InstrumentationData = class {
	/**
	 * Constructs the object.
	 *
	 * @param      {string}         astObj       Name of the file
	 * @param      {number}         lineNum        The number of the line where we'd like to add the instrumentation
	 * @param      {string}         value          Value is the instrumentation data we add to the source code. It's the actual code.
	 * @param      {Instrumenter.InstrRelation}  instrRelation  Either Instrumenter.InstrRelation.before or Instrumenter.InstrRelation.after. Determines whether the
	 *                                             instrumentation shuold be added before, or after the given line number 
	 */
	constructor(astObj, astNodePtr, value, instrRelation = Instrumenter.InstrRelation.prepend) {
		this.astObj = astObj;
		this.astNodePtr = astNodePtr;
		this.value = value;
		if ((instrRelation !== Instrumenter.InstrRelation.prepend) && (instrRelation !== Instrumenter.InstrRelation.append)) {
			throw Error('Invalid option for instrRelation in InstrumentationData: ' + instrRelation);
		}
		this.instrRelation = instrRelation;
	}

	toString() {
		return 'InstrumentationData: ' + this.value + ' (' + this.lineNum + ') [' + this.filename + ']';
	}
};

module.exports = Instrumenter;
