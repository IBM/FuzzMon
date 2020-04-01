// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

class AbstractGenerator {
	constructor() {
		if (!this.generateInput) {
			throw Error('Function `generateInput` should exist in all classes that extend the AbstractGenerator');
		}
	}
}

module.exports = AbstractGenerator;