// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const logger = require("../common/logger");
require("../common/utils"); // Creates the insert method for the generalized input sequence. 

const isHexNumTest = /^[0-9a-fA-F]+$/;
class Type {
	static isStringJSON(string) {
		try {
			return JSON.parse(string);
		} catch (e) {
			return false;
		}
	}

	static determineType(rawItem) {
		let rawItemType = typeof(rawItem);
		switch (rawItemType) {
			case 'string':
				{
					let json = Type.isStringJSON(rawItem);
					if (json) {
						return Type.determineType(json);
					} else if (isHexNumTest.test(rawItem)) {
						return 'hexNumber';
					} else {
						return rawItemType;
					}
				}
				break; // making the linter happy
			case 'number':
			case 'boolean':
			case 'null':
			case 'undefined':
				return rawItemType;
			case 'object':
				{
					switch (rawItem) {
						case null:
							return 'null';
						case undefined:
							return 'undefined';
					}
					let rawItemCopy = JSON.parse(JSON.stringify(rawItem));
					if (rawItemCopy instanceof Array) {
						rawItemCopy = rawItemCopy.map(item => Type.determineType(item));
					} else {
						Object.keys(rawItemCopy).map(key => rawItemCopy[key] = Type.determineType(rawItemCopy[key]));
					}
					return rawItemCopy;
				}
			default:
				throw Error('Unsupported type: ' + rawItemType + '\nraw string representation: ' + rawItem);
		}
	}
}

/**
 * Class representing the value of a single param
 *
 * @class      ParamVal (name)
 */
class ParamVal {
	/**
	 * Constructs the object.
	 *
	 * @param      {EntryParam}  paramPtr  Reference to an instance of EntryParam.
	 * @param      {?}           value     The value of the param pointed by paramPtr.
	 * @param      {?}           newType   The type of the param pointed by paramPtr. This is used when the mutator changes the type of paramPtr.
	 *                                     If left blank, newType == paramPtr.type;
	 */
	constructor(name, value, type) {
		this.name = name;
		this.value = value;
		this.type = type || Type.determineType(value);
	}

	/**
	 * Creates a new instance of the object with same properties than original.
	 *
	 * @return     {ParamVal}  Copy of this object.
	 */
	clone() {
		return new ParamVal(this.name, JSON.parse(JSON.stringify(this.value)), JSON.parse(JSON.stringify(this.type)));
	}

	/**
	 * Returns a string representation of the object.
	 *
	 * @return     {string}  String representation of the object.
	 */
	toString() {
		let paramValueStr = null;
		if (typeof(this.type) === 'object') {
			paramValueStr = JSON.stringify(this.value);
		} else {
			if (!this.value) {
				paramValueStr = '';
			} else {
				switch (this.type) {
					case 'string':
					case 'hexNumber':
						paramValueStr = this.value;
						break;
					case 'number':
						paramValueStr = this.value.toString();
						break;
					case 'boolean':
						paramValueStr = this.value + '';
						break;
					default:
						throw Error('Unsupported type: ' + this.type);
				}
			}
		}
		return 'ParamVal ' + this.name + ': ' + paramValueStr + ' (' + this.type + ')';
	}
}

class BodyVal {
	constructor(value, type, /*flatType*/ /*flattened type object. used for optimization*/ ) {
		this.value = value;
		this.type = type || Type.determineType(value);
		// this.flatType = flatType || type.flattenJSON();
	}

	clone() {
		try {
			// this.value can be null/undefined because of the mutation
			let newValue = {};
			let newType = {};
			// let newFlatType = {};
			if (this.value && this.type /*&& this.flatType*/ ) {
				newValue = JSON.parse(JSON.stringify(this.value));
				newType = JSON.parse(JSON.stringify(this.type));
				// newFlatType = JSON.parse(JSON.stringify(this.flatType));
			}
			return new BodyVal(newValue, newType /*, newFlatType*/ );
		} catch (e) {
			logger.error(e);
			logger.exitAfterFlush();
		}
	}

	toString() {
		return 'BodyVal: ' + JSON.stringify(this.value);
	}
}

class AbstractInput {
	constructor() {
		if (!this.getFilename) {
			throw Error('`filename` method is required in an input object');
		}
		if (!this.clone) {
			throw Error('`clone` method is required in an input object');
		}

		if (!this.toString) {
			throw Error('`toString` method is required in an input object');
		}
	}
}

/**
 * A class that encapsulates a sequence of objects of type `GeneralizedInput`
 * 
 * @class      InputSequence (name)
 * @note This could as well be a simple list, but this was it's more organized 
 */
class InputSequence {
	/**
	 * Constructs the object.
	 *
	 * @param      {[GeneralizedInput]}  inputSequence  List of objects of type GeneralizedInput
	 */
	constructor(inputSequence, isFromUserInput = false) {
		this.inputSequence = inputSequence || [];
		this.isFromUserInput = isFromUserInput;
	}

	/**
	 * Inserts a given generalized input to a certain location in the *ordered* list 
	 *
	 * @param      {number}            index             The index where `generalizedInput` will be inserted to 
	 * @param      {GeneralizedInput}  generalizedInput  An instance of the class GeneralizedInput
	 */
	insertTo(index, generalizedInput) {
		if (generalizedInput instanceof Array) {
			// assuming this.inputSequence is not too big i.e., it's << 10K items
			// reference: https://stackoverflow.com/questions/5080028/what-is-the-most-efficient-way-to-concatenate-n-arrays
			this.inputSequence.insert(index, ...generalizedInput);
		} else {
			this.inputSequence.insert(index, generalizedInput);
		}
	}

	/**
	 * Removes a single generalized input from the given index.
	 *
	 * @param      {number}  index   The index to remove the generalized input from
	 */
	removeFrom(index) {
		this.inputSequence.removeAt(index);
	}

	at(index) {
		return this.inputSequence[index];
	}

	setAt(index, value) {
		this.inputSequence[index] = value;
	}

	map(func) {
		return this.inputSequence.map(func);
	}

	some(func) {
		return this.inputSequence.some(func);
	}

	filter(func) {
		return this.inputSequence.filter(func);
	}

	/**
	 * Returns the size of the generalized input
	 */
	get size() {
		return this.inputSequence.length;
	}

	/**
	 * Creates a new instance of the object with same properties than original.
	 *
	 * @return     {InputSequence}  Copy of this object.
	 */
	clone() {
		return new InputSequence(this.inputSequence.map(input => input.clone()), false);
	}

	toString() {
		return 'isFromUserInput: ' + this.isFromUserInput +
			' InputSequence(' + this.size + '): ' +
			this.inputSequence.map(gis => gis.toString()).join('\n');
	}
}

/**
 * Class representing a single parameter to a single entry point.
 *
 * @class      EntryParam (name)
 */
class EntryParam {
	/**
	 * Constructs the object.
	 *
	 * @param      {String}  name    The name of the entry point param
	 * @param      {String}  type    The type of the param. If an object, it should have a json format
	 * @param      {number}  weight  Level of importance of this param. Will be used during mutation.
	 */
	constructor(name, type, extraInfo, weight = 1) {
		this.name = name;
		this.type = type;
		this.extraInfo = extraInfo;
		this.weight = weight;
	}

	/**
	 * Returns a string representation of the object.
	 *
	 * @return     {string}  String representation of the object.
	 */
	toString() {
		return 'EntryParam: ' + this.name + ' ' + this.type;
	}

	eq(rhs) {
		return (this.name === rhs.name) &&
			(this.type == rhs.type);
	}
}

/**
 * Class representation of a single entry point to the project
 *
 * @class      EntryPoint (name)
 */
class EntryPoint {
	/**
	 * Constructs the object.
	 *
	 * @param      {String}        filename      Name of the file of the entry point
	 * @param      {String}        entryName     Name of the entry point. 
	 * 									         In case of a simple run it's a name of function. In case of express it's a path s.a. '/api/deal'
	 * @param      {[EntryParam]}  enteryParams  Parameters required for the entry point. This is a list of instances of the class EntryParam. 
	 * @param      {?}             extraInfo     In case it is required some additional info, this is the place for it
	 * @param      {number}        entryWeight   Level of importance of the entry point. Will be used during the mutation.
	 */
	constructor(filename, entryName, enteryParams, extraInfo, entryWeight = 0.1) {
		this.filename = filename;
		this.entryName = entryName;
		this.enteryParams = enteryParams || [];
		this.extraInfo = extraInfo;
		this.entryWeight = entryWeight; // enteryParams.length ? enteryParams.length : entryWeight;
	}

	/**
	 * Returns a string representation of the object.
	 *
	 * @return     {string}  String representation of the object.
	 */
	toString() {
		return 'EntryPoint: ' +
			this.entryName + ' (' + (this.enteryParams ? this.enteryParams.map(p => p.toString()).join(', ') : 'nothing') +
			') [' + this.filename + ']\n\t' + (this.extraInfo ? this.extraInfo.toString() : '');
	}

	eq(rhs) {
		return (this.filename === rhs.filename) &&
			(this.entryName === rhs.entryName) // && 
			// (this.entryParams #######)
	}
};

exports.EntryPoint = EntryPoint;
exports.EntryParam = EntryParam;
exports.ParamVal = ParamVal;
exports.InputSequence = InputSequence;
exports.Type = Type;
exports.BodyVal = BodyVal;
exports.AbstractInput = AbstractInput;