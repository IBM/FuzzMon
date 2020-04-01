// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const opn = require('opn');
const fs = require('fs');
const path = require('path');

const Project = require('./static_analysis/project').Project;
const Fuzzer = require('./fuzzer/fuzzer').Fuzzer;
const HookRequire = require('./runners/abstractRunner').HookRequire;
const InputSequence = require('./entities/entities').InputSequence;
const logger = require('./common/logger');
const config = require('./config');
const CallGraph = require('./static_analysis/callGraph').CallGraph;
const FuzzMonRunner = require('./runners').FuzzMonRunner;

/**
 * Controls the data flow and uses chain of responsibility DP to delegate the call to the next appropriate controller
 *
 * @class      AbstractController (name)
 */
class AbstractController {
	/**
	 * Constructs the object.
	 *
	 * @param      {String}  controllerType  The controller name. Used for debugging only.
	 */
	constructor(controllerType) {
		console.log('Initializing', controllerType, 'controller');
		this.controllerType = controllerType;
	}

	/**
	 * Decided on what should the next controller be, instanciates it, and returns the new instance 
	 * 
	 * @note This method is abstract and should be overridden in the derived class
	 * @returns Instance of the controller that should be called after this one 
	 */
	next() {
		throw Error('Derived controllers should override `next`!');
	}

	static async exec(initialController) {
		while (initialController) {
			initialController.init && await initialController.init();
			initialController.run && await initialController.run();
			initialController = initialController.next();
		}
	}
}

/**
 * Controller responsible for some preprocessing - static analysis, initialization of important things etc.  
 *
 * @class      PreprocessingController (name)
 */
class PreprocessingController extends AbstractController {
	/**
	 * Constructs the object.
	 *
	 * @param      {[String]}          filesList    List of files to process
	 * @param      {Plugin}            pluginType   The plugin type (e.g., ExpressPlugin)
	 * @param      {[AbstractTarget]}  targetsList  List of classes of type (derived from) AbstractTarget
	 * @param      {[EntryPoint]}      entryFilenames?????????? 
	 */
	constructor(filesList, targetsList, entryFilenames, expertType, initialInput) {
		super('PreprocessingController');
		this.State = {};
		this.State.project = new Project(filesList, targetsList, entryFilenames);
		this.State.expert = new expertType(this.State.project);
		this.initialInput = initialInput || [];
	}

	/**
	 * Initializes the current controller
	 */
	async init() {
		if (!process.env.CLOSUREMOD_DIR) {
			throw Error('Not initialized `CLOSUREMOD_DIR` environment variable!');
		}
		await this.State.project.init();
		console.log('Initialized project');

		this.State.expert.init(this.State.project);
		console.log('Initialized expert');

		this.State.expert.enhanceProject(this.State.project);
		console.log('Enhanced project');

		this.State.expert.initInstrumentersWithProject(this.State.project);
		console.log('Initialized instrumenters with project');
	}

	/**
	 * Decided on what should the next controller be, instanciates it, and returns the new instance 
	 * 
	 * @returns Instance of the controller that should be called after this one 
	 */
	next() {
		let entryFilename = this.State.project.entryFilenames[0];
		this.State.initialInput = this.initialInput;
		this.State.entryFilename = entryFilename;
		
		if (config.userInput.userInputRequired || config.userInput.readInputFromFile) {
			return new UserInteractionController(this.State);
		} else {
			return new DataGatheringFromUserInputController(this.State);
		}
	}
}

/**
 * Controller responsible for gathering data from interaction with the user
 *
 * @class      UserInteractionController (name)
 */
class UserInteractionController extends AbstractController {
	/**
	 * Constructs the object.
	 *
	 * @param      {Project}  project        Instance of the Project class (@see project.js)
	 * @param      {String}   entryFilename  The entry filename
	 */
	constructor(State) {
		super('UserInteractionController');
		this.entryFilename = State.entryFilename;
		this.runner = new State.expert.runnerType(State.project,
			State.expert,
			this.entryFilename,
			State.expert.plugin.getUserInputInstrumneters());
		this.State = State;
	}

	init() {
		if (config.userInput.readInputFromFile && config.userInput.userInputRequired) {
			throw Error(`Both 'readInputFromFile' and 'userInputRequired' cannot be set simultaneousely`);
		}

		if (config.userInput.userInputRequired && !config.userInput.openBrowserToGetUserInput) {
			throw Error(`Not yet implemented: userInputRequired is set while openBrowserToGetUserInput is not set`);
		}
		this.serializedUserInputFilename = config.userInput.inputFilename + path.basename(this.entryFilename);
		if (config.userInput.readInputFromFile && !fs.existsSync(this.serializedUserInputFilename)) {
			throw Error(`${this.serializedUserInputFilename} doesn't exist. Cannot read input from file.`);
		}
	}

	/**
	 * Runs the current controller
	 */
	async run() {
		let rawUserInput = null;
		if (config.userInput.readInputFromFile) {
			rawUserInput = JSON.parse(fs.readFileSync(this.serializedUserInputFilename));
		} else if (config.userInput.userInputRequired && config.userInput.openBrowserToGetUserInput) {
			await this.runner.init();
			await opn(((config.http.isSSL ? 'https' : 'http') + '://localhost:' + this.State.expert.plugin.port), {
				app: config.userInput.browserApp
			});
			await this.runner.stop();

			rawUserInput = await this.State.expert.plugin.getRawUserInput();
		} else {
			throw Error(`Should have not gotten here`);
		}

		config.userInput.writeUserInputToFile &&
			fs.writeFileSync(this.serializedUserInputFilename, JSON.stringify(rawUserInput));

		this.initialInput = this.State.expert.plugin.formatRawInputFromUser(this.entryFilename, rawUserInput);
	}

	next() {
		this.State.initialInput = [].concat(this.State.initialInput, this.initialInput);
		return new DataGatheringFromUserInputController(this.State);
	}
}

class DataGatheringFromUserInputController extends AbstractController {
	constructor(State) {
		super("DataGatheringFromUserInputController");
		this.runner =
			new State.expert.runnerType(State.project, State.expert, State.entryFilename, [].concat(
				config.callGraph.dynamicallyInitializeCallGraph ? State.expert.callGraphBuilderInstrumenter : [],
				State.expert.plugin.getDynamicDataEnhancementInstrumenters()));
		this.fuzzMonRunner = new FuzzMonRunner(this.runner);
		this.State = State;
	}

	async init() {
		await this.fuzzMonRunner.init();
	}

	async run() {
		// HACK 
		this.State.initialInput.forEach(input => input.filename = this.State.entryFilename);
		// HACK 
		
		let callGraphDynamicDataList = [];
		await Promise.all(this.State.initialInput.map(async(input) => {
			let res = await this.fuzzMonRunner.runOnInput(input);
			this.State.expert.plugin.enhanceProjectWithDynamicData();
			
			if (config.callGraph.dynamicallyInitializeCallGraph) {
				let callGraphDynamicData = this.State.expert.callGraphBuilderInstrumenter.getGlobalStorage();
				callGraphDynamicDataList.push(callGraphDynamicData);
				this.State.expert.callGraphBuilderInstrumenter.resetGlobalStorage();
			}
		}));
		await this.fuzzMonRunner.stop();
		this.State.callGraphDynamicDataList = callGraphDynamicDataList;
	}

	next() {
		return new DataEnhancementController(this.State);
	}
}

/**
 * Controller responsible for enhancing the statically collected data with data collected from the user's interaction
 *
 * @class      DataEnhancementController (name)
 */
class DataEnhancementController extends AbstractController {
	/**
	 * Constructs the object.
	 *
	 */
	constructor(State) {
		super('DataEnhancementController');
		this.State = State;
	}

	sliceInitInputIntoSlots(initialInputList) {
		if (config.minArraySlotSize > config.maxArraySlotSize) {
			throw Error(`maxArraySlotSize should always be larger or equal to minArraySlotSize`);
		}
		let initialInputSequenceList = [];
		initialInputList.sort((inputA, inputB) => inputA.idx - inputB.idx);
		let initialInputListSize = initialInputList.length;
		if (0 === initialInputListSize) {
			return [];
		} else if (config.minArraySlotSize > initialInputListSize) {
			return initialInputList.map(input => new InputSequence([input], true));
		}
		let i = Math.min(Math.randomInt(config.maxArraySlotSize, config.minArraySlotSize), initialInputListSize);
		let j = 0;
		for (;;) {
			let inputsSlot = [];
			for (let k = j; k < i; ++k) {
				if (k >= initialInputListSize) {
					break;
				}
				inputsSlot.push(initialInputList[k].clone());
				// creating input singleton:
				initialInputList[k] = new InputSequence([initialInputList[k]], true);
			}
			initialInputSequenceList.push(new InputSequence(inputsSlot, true));
			if (i >= initialInputListSize) {
				break;
			}
			j = i;
			i = Math.min(i + Math.randomInt(config.maxArraySlotSize, config.minArraySlotSize), initialInputListSize);
		}
		return initialInputSequenceList;
	}

	/**
	 * Initializes the current controller
	 */
	async init() {
		this.State.callGraphDynamicDataList.map(callGraphDynamicData =>
			this.State.project.callGraph.enhanceFromDynamicData(callGraphDynamicData)
		);

		logger.info('************************');
		logger.info('*** Input from user: ***');
		for (let a of this.State.initialInput) {
			logger.info(a.toString());
		}
		logger.info('************************');
		this.State.initialInput = this.sliceInitInputIntoSlots(this.State.initialInput);
		logger.info('************************');
		logger.info('*** Input from user after slicing: ***');
		for (let a of this.State.initialInput) {
			logger.info(a.toString());
		}
		logger.info('************************');
	}

	/**
	 * Decided on what should the next controller be, instanciates it, and returns the new instance 
	 * 
	 * @returns Instance of the controller that should be called after this one 
	 */
	next() {
		return new TargetFinderController(this.State);

	}
}

class TargetFinderController extends AbstractController {
	constructor(State) {
		super('TargetFinderController');
		this.State = State;
	}

	init() {
		// this is a good place to call the linter (once there is a good one)
		this.State.project.targetsList.forEach(tl => tl.init(this.State.project));
		this.State.project.targetsList
			.map(target => {
				let targetFuncs = target
					.getTargetFunctions()
					.map(targetFunc => this.State.project.callGraph.setTarget(targetFunc));
			});
	}

	next() {
		return new FuzzingController(this.State);
	}
}

/**
 * Controller responsible for running the actual fuzzer
 *
 * @class      FuzzingController (name)
 */
class FuzzingController extends AbstractController {
	/**
	 * Constructs the object.
	 *
	 * @param      {Project}         project     Instance of the Project class (@see project.js)
	 * @param      {AbstractRunner}  runnerType  *type* of the runner that is derived from 
	 * 											 AbstractRunner (@see runner.js) e.g., FunctionCallRunner, or ExpressRunner
	 */
	constructor(State) {
		super('FuzzingController');
		this.State = State;
		this.State.fuzzer = new Fuzzer(State.project, State.expert);
	}

	/**
	 * Initializes the current controller
	 */
	async init() {
		this.State.expert.mutator.init(this.State.expert, this.State.project);
		await this.State.fuzzer.init();
		// Setting the 'isDstFunc' property of the functions in the call graph
		// State.project.targetsList
		// 	.map(target => {
		// 		State.project.astObjList
		// 			.filter(astObj => target.filename === astObj.filename)
		// 			.map(astObj => target.lineNumbers
		// 				.map(lineNum => {
		// 					let inFunc = astObj.isInFunction(lineNum);
		// 					if (inFunc) {
		// 						inFunc.isDstFunc = true;
		// 						State.project.callGraph.dstFuncs.push(inFunc);
		// 					} else {
		// 						console.log('Invalid lineNumber:', lineNum, 'in:', astObj.filename);
		// 						logger.exitAfterFlush(1);
		// 					}
		// 				}))
		// 	});
	}

	/**
	 * Runs the current controller
	 */
	async run() {
		await this.State.fuzzer.run(this.State.initialInput);
	}

	/**
	 * Decided on what should the next controller be, instanciates it, and returns the new instance 
	 * 
	 * @returns Instance of the controller that should be called after this one 
	 */
	next() {
		return null;
	}
}

exports.InitController = PreprocessingController;
exports.Controller = AbstractController;