// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

/**
 * A class representating an abstract target
 *
 * @class      AbstractTarget (name)
 */
class AbstractTarget {
	/**
	 * Constructs the object.
	 *
	 * @param      {String}  filename    Name of the file where the target is located
	 * @param      {String}  targetType  The target type. Used for debugging purposes only.
	 */
	constructor(targetType) {
		this.targetType = targetType;
	}

	/**
	 * Initializes the current target
	 * 
	 * @note This method is abstract and should be overriden in the derived calss
	 */
	init(project) {
		throw Error('Init method must be overriden!');
	}

	/**
	 * Returns the list of instrumenters used to identify whether the target was reached 
	 *
	 * @return     {[AbstractInstrumenter]}  List of instrumenters, derived from AbstractInstrumenter. 
	 */
	getInstrumenters() {
		return this.instrumentersList;
	}

	getTargetFunctions() {
		throw Error('`getTargetFunctions` method must be implemted in derived class!');
	}

	/**
	 * Returns true iff the current target is reached
	 *
	 * @note This can be overriden to meet more complex requirements
	 */
	isTargetReached(resultsList) {
		return this.instrumentersList.some(instr => instr.getGlobalStorage().some(n => n));
	}

	/**
	 * Returns a string representation of the object.
	 *
	 * @return     {string}  String representation of the object.
	 */
	toString() {
		return this.targetType + ' instrumenters:' + this.instrumentersList.map(instr => instr.toString()).join(';');
	}

	eq(rhs) {
		throw Error('Implement `eq` in the derived class!');
	}
}

module.exports = AbstractTarget;