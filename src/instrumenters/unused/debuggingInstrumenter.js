// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');

/**
 * Instrumenter used to determine whether an execution reached a certain set of lines
 */
class DebuggingInstrumenter extends Instrumenter.AbstractInstrumenter {
// 	constructor(filesAndLinesToInstrument) {
// 		super('DebuggingInstrumenter');
// 		this.filesAndLinesToInstrument = filesAndLinesToInstrument;
// 	}

// 	init(/*project*/) {
// 		/*left blank on purpose*/
// 	}

// 	initGlobalStorage() {}

// 	getGlobalStorageName() {}

// 	getGlobalStorage() {}

// 	collectInstrumentationData() {
// 		console.log('collectInstrumentationData in DebuggingInstrumenter');
// 		return Object.keys(this.filesAndLinesToInstrument).map(filename =>
// 			this.filesAndLinesToInstrument[filename].map(targetLine =>
// 				new Instrumenter.InstrumentationData(filename, targetLine,
// 					'console.log("JSFUZZ DEBUG: {0}:{1}")'.format(filename, targetLine),
// 					Instrumenter.InstrRelation.after))
// 		).flatten();
// 	}

// 	resetGlobalStorage() {
// 		this.initGlobalStorage();
// 	}
}

module.exports = DebuggingInstrumenter;