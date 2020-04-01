// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const Utils = require('../common/utils');
const MyMath = require('../common/math');
const ParamVal = require('../entities/entities').ParamVal;
const BodyVal = require('../entities/entities').BodyVal;
const Type = require('../entities/entities').Type;
const InputSequence = require('../entities/entities').InputSequence;
const config = require('../config');
const logger = require('../common/logger');
const AbstractGenerator = require('./abstractGenerator');

var distribution = (value, index) => MyMath.cauchyDistribution(index);

/**
 * Class responsible for generating mutations given an input
 */
class SimpleGenerator extends AbstractGenerator {
	constructor() {
		super();
	}

	init(expert, project) {
		this.expert = expert;
		this.project = project;
	}

	static getRandomPrimitiveType() {
		return ['string', 'number', 'boolean'].randomItem();
	}

	static getRandomType() {
		return ['string', 'number', 'boolean', 'object'].randomItem();
	}

	static generateRandomObject() {
		let depth = 0;
		return Utils.randomListOfStrings(Math.randomInt(5) + 1, Math.randomInt(5) + 1)
			.reduce((obj, item) => {
				obj[item] =
					depth > config.mutation.object.maxDepth ?
					'' :
					SimpleGenerator.generateRandomInputFromType(SimpleGenerator.getRandomType());
				++depth;
				return obj;
			}, {});
	}

	static generateRandomInputFromType(type) {
		if (!type) {
			return SimpleGenerator.generateRandomInputFromType(SimpleGenerator.getRandomType());
		}
		if ('object' === typeof(type)) { // the "type" here is the structure of the JSON
			if (Object.keys(type).length === 0) {
				let randObj = this.generateRandomObject();
				return randObj;
			} else {
				let newObject = Array.isArray(type) ? [] : {};
				for (let key in type) {
					newObject[key] = SimpleGenerator.generateRandomInputFromType(type[key]);
				}
				return newObject;
			}
		}

		switch (type) {
			case 'string':
				return (Math.randomString(Math.randomInt(20) + 1));
			case 'number':
				return (Math.random() * 500);
			case 'boolean':
				return (Math.random() > 0.5 ? true : false);
			case 'object':
				return this.generateRandomObject();
			case 'hexNumber':
				return Math.randomString(Math.randomInt(20) + 1, 16);
			default:
				throw Error('Unsupported type:' + type);
		}
	}

	static generateRandomPrimitive() {
		return SimpleGenerator.generateRandomInputFromType(SimpleGenerator.getRandomPrimitiveType());
	}

	static generateRandomInput() {
		return SimpleGenerator.generateRandomInputFromType(SimpleGenerator.getRandomType());
	}

	// static generateInput(entryPoint) { 
	// 	let newParamVals = null;
	// 	let newBody = null;
	// 	if (config.mutation.mutateOnGenInputParams) {
	// 		newParamVals = SimpleGenerator.generateNewParamValsForEntryPoint(entryPoint);
	// 	} else if (config.mutation.mutateOnGenInputBody) {
	// 		newBody = SimpleGenerator.generateNewBodyValsForEntryPoint(entryPoint);
	// 	} else {
	// 		throw Error('Either `mutateOnGenInputBody` or `mutateOnGenInputParams` should be set in the config file!');
	// 	}

	// 	if (!newBody) {
	// 		new BodyVal({}, {})
	// 	} else if (!newParamVals) {
	// 		newParamsVals = entryPoint.enteryParams.map(param => new ParamVal(param));
	// 	}

	// 	return new GeneralizedInput(entryPoint, newParamVals, newBody);
	// }

	// static generateNewParamValsForEntryPoint(entryPoint) {
	// 	return entryPoint.enteryParams.map(param => new ParamVal(param, SimpleGenerator.generateRandomInputFromType(param.type)));
	// }

	// static generateNewBodyValsForEntryPoint(generalizedInput) {

	// 	if (!generalizedInput || !generalizedInput.bodyVal || !generalizedInput.bodyVal.type || 0 === Object.keys(generalizedInput.bodyVal.type).length) {
	// 		return new BodyVal({}, {});
	// 		// return this.generateRandomObject();
	// 	}
	// 	// TODO: think if generalizedInput.bodyVal.type (JSON) should be cloned somehow
	// 	return new BodyVal(SimpleGenerator.generateRandomInputFromType(generalizedInput.bodyVal.type), generalizedInput.bodyVal.type /*, generalizedInput.bodyVal.flatType*/ );
	// }
}

module.exports = SimpleGenerator;