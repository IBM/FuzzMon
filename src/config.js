// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const path = require('path');
const os = require('os');

const config = {
	createCFG: false,
	coverageBits: 6,
	minArraySlotSize: 2,
	maxArraySlotSize: 4,
	dirTravesalTestFilePath: path.join(os.tmpdir().replace('\r', ''), 'filename123.txt'),
	dirTraversalFileContent: 'this is my secret string',
	shellInjectionCommand: path.join(os.tmpdir().replace('\r', ''), 'create_file'),
	shellInjectionTargetFilePath: path.join(os.tmpdir().replace('\r', ''), 'fuzzMonShellInjectionTest'),
	JSCodeInjectionFilePath: 'fuzzMonJSCodeInjectionTest',
	JSCodeInjectionFileContent: '123',
	maxSizeOfGeneralizedInput: 10,
	userInput: {
		// browserApp: '/opt/google/chrome/chrome',
		browserApp: 'firefox',
		userInputRequired: false,
		openBrowserToGetUserInput: false,
		readInputFromFile: false,
		writeUserInputToFile: false,
		inputFilename: 'serializedUserInput_'
	},
	log: {
		filename: path.join(process.env.JSFUZZ_DIR.replace('\r', ''), 'my_log.txt'),
		level: 'trace'
	},
	callGraph: {
		dynamicallyInitializeCallGraph: false,
		staticallyInitializeCallGraph: true,
		serializedGraphFilename: path.join(process.env.JSFUZZ_DIR.replace('\r', ''), 'serializedGraph_'),
		loadCallGraphFromFile: true
	},
	inputQueue: {
		SHRINK_THRSHOLD: 1000,
		enforceMinInputQueueSize: true,
		minInputQueueSize: 1,
		probabilityOfAddingAlreadyCoveredInputIntoInputQueue: 0.01
	},
	mutation: {
		inputMayBeLargerThanOneCall: false,
		maxRandomInt : 9000,
		defaultMutationMetadata: {
			numberOfMutations: 10,
			mutationLevel: 5,
			mutationTag: '*',
		},
		probabilityOfCreatingAMutationMetadata: 0.1,
		object: {
			// should be 0 if we're looking for a vulnerability like JS sandbox escape
			probabilityOfGenericObjectMutation: 0,
			maxDepth: 5,
			probabilityOfPropertyDeletion: 0.1,
			probabilityOfPropertyAddition: 0.1,
			probabilityToIgnoreArrayType: 0.1,
			array: {
				probabilityOfPropertyDeletion: 0.1,
				probabilityOfPropertyAddition: 0.1
			}
		},
		http: {
			probabilityOfMutatingMethod: 0.1,
			probabilityOfMutatingHeader: 0.5
		}
	},
	http: {
		webServerPort: 8086,
		isSSL: true,
		maxNumOfParamsPerRequest: 6,
		headers: {
			'Accept-Encoding': 'gzip, deflate, br',
			'Content-Type': 'application/json',
			'Accept-Language': 'en-US,en;q=0.9,he;q=0.8,ru;q=0.7',
			'Connection': 'keep-alive',
			'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
			// Disable cache
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': 0
		},
		timeout: {
			response: 1000, // ms
			deadline: 1500 // ms
		}
	}
};
module.exports = config;