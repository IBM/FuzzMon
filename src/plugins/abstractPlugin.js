// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

class AbstractPlugin {
	constructor(name) {
		this.name = name;
	}

	init() {
		throw Error('`init` method should be implemented in the derived class');
	}

	enhanceProjectWithDynamicData() {
		throw Error('`enhanceProjectWithDynamicData` method should be implemented in the derived class');
	}

	getUserInputInstrumneters() {
		throw Error('`getUserInputInstrumneters` method should be implemented in the derived class');
	}

	getDynamicDataEnhancementInstrumenters() {
		throw Error('`getDynamicDataEnhancementInstrumenters` method should be implemented in the derived class');
	}
}

module.exports = AbstractPlugin;