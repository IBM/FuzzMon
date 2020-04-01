// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab


const SimpleGenerator = require('./simpleGenerator');
const execSync = require('child_process').execSync;

require('../common/utils');

class RadamasaMutator {
	static mutate(value) {
		if (!value) {
			return value;
		}
		let newValue = value;
		try {
			let res = execSync(`echo '${value}' | /gpfs/haifa-p4/01/FuzzTesting/js/bennyz/radamsa/bin/radamsa -n 1`).toString();
			try {
				newValue = JSON.parse(res);
			} catch (e) {
				newValue = res;
			}
		} catch (e) {
			console.log(e);
		}
		return newValue;
	}

	static init(mutatorInstance) {
		mutatorInstance.addMutationFunction('string', 'generic', RadamasaMutator.mutate, 0);
		mutatorInstance.addMutationFunction('number', 'generic', RadamasaMutator.mutate, 0);
		mutatorInstance.addMutationFunction('hexNumber', 'generic', RadamasaMutator.mutate, 0);
		mutatorInstance.addMutationFunction('hexNumber', 'generic', RadamasaMutator.mutate, 0);
	}
}

module.exports = RadamasaMutator;