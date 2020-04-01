// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const QueueObject = require('./input_queue').QueueObject;
const InputQueue = require('./input_queue').InputQueue;
const Path = require('./path').Path;
const InputSequence = require('../entities/entities').InputSequence;
const config = require('../config');
const logger = require('../common/logger');
const FuzzMonRunner = require('../runners').FuzzMonRunner;
const MutationMetadata = require('../mutation').MutationMetadata;

require('../common/math');
const Utils = require('../common/utils');

var counter = 1;

let cummCoverage = new Uint8Array(1 << config.coverageBits);
class Fuzzer {
	/**
	 * Constructs the object.
	 *
	 * @param      {Project}  project        An *initialized* project object
	 * @param      {[?]}  initialInputs      List of initial inputs
	 * @param      {Mutator}  mutator        The mutator object
	 */
	constructor(project, expert) {
		this.isInitialized = false;
		this.project = project;
		this.expert = expert;
		this.mutator = this.expert.mutator;
		this.generator = this.expert.generator;
		this.runnerType = this.expert.runnerType;
		this.LOG_FREQUENCY = 10;
		this.entryFilenames = project.entryFilenames;
		this.inputQueue = new InputQueue();
		this.prevScore = -Infinity;
	}

	/**
	 * Initialized the fuzzer
	 */
	async init() {
		let instrumenters = [].concat(
			this.project.targetsList.map(target => target.getInstrumenters()).flatten(),
			this.expert.coverageInstrumenter,
			config.callGraph.dynamicallyInitializeCallGraph ? this.expert.callGraphBuilderInstrumenter : []
		);
		instrumenters.map(instr => instr.clearInstrumentationData());
		this.runnersList = this.entryFilenames
			.unique()
			.map(filename => new this.runnerType(this.project, this.expert, filename, instrumenters));

		this.fuzzMonRunner = new FuzzMonRunner(this.runnersList);
		// Please note that `init` can take some time, as it might be starting an express instance
		await this.fuzzMonRunner.init();
		this.isInitialized = true;
	}

	/**
	 * Prints intermediate results from the fuzzer's run every 1K iterations
	 */
	printIntermediateResult(inputSequence, path, resultsList) {
		var isSuccess = this.project.targetsList.some(target => target.isTargetReached(resultsList));
		let newScore = path.getScore() / inputSequence.size;
		if (isSuccess || (0 === (counter % this.LOG_FREQUENCY)) || (newScore > this.prevScore)) {
			this.prevScore = newScore;
			logger.info('IQ size: ' + this.inputQueue.size);
			logger.info('Counter: ' + counter);
			logger.info('Running on input: ' + inputSequence.toString());
			logger.info('Score: ' + newScore);
			logger.info('% of nz in coverage:' + path.getCoveragePercentage());
			if (isSuccess) {
				console.log('Success! In ' + counter + ' steps');
				logger.info('Success! In ' + counter + ' steps');
				logger.exitAfterFlush(0);
			}
			logger.info('############');
		}
	}

	/**
	 * Runs the program on multiple inputs
	 *
	 * @param      {[?]}  inputsList  List of inputs to run the program with
	 */
	async runOnInputSequenceList(inputSequenceList, origMutationMetadata = null) {
		for (let inputSequence of inputSequenceList) {
			// ++counter;
			this.expert.coverageInstrumenter.resetGlobalStorage();
			if (config.callGraph.dynamicallyInitializeCallGraph) {
				this.expert.callGraphBuilderInstrumenter.resetGlobalStorage();
			}
			this.project.targetsList.map(target => target.getInstrumenters().map(instr => instr.resetGlobalStorage()));

			let resultsList = await this.fuzzMonRunner.runOnInputSequence(inputSequence);
			counter += inputSequence.size;
			let lastCoverage = this.expert.coverageInstrumenter.getGlobalStorage();

			let visitedNodes = [];
			if (config.callGraph.dynamicallyInitializeCallGraph) {
				let pathCallGraph = this.expert.callGraphBuilderInstrumenter.getGlobalStorage();
				visitedNodes = this.project.callGraph.enhanceFromDynamicData(pathCallGraph);
			}

			let path = new Path(this.project, lastCoverage, visitedNodes);
			cummCoverage.or(lastCoverage);

			// NOTE: inputSequence.isFromUserInput is required here because we do not want to skip anything
			// that comes from the user
			if ((!inputSequence.isFromUserInput) && this.inputQueue.isCovered(path) &&
				Math.random() > config.inputQueue.probabilityOfAddingAlreadyCoveredInputIntoInputQueue) {
				continue;
			}

			this.printIntermediateResult(inputSequence, path, resultsList);
			let intputQueueObject = new QueueObject(inputSequence, path);

			// if (Math.random() > config.mutation.probabilityOfCreatingAMutationMetadata) {
			intputQueueObject.mutationMetadata = this.mutator.generateMetaData(resultsList, origMutationMetadata);
			// } else {
			// 	intputQueueObject.mutationMetadata = origMutationMetadata ||
			// 		this.mutator.generateMetaData(resultsList, origMutationMetadata); // origMutationMetadata can sometimes be null
			// }

			this.inputQueue.enqueue(intputQueueObject);
		}
	}

	/**
	 * Runs the fuzzer
	 */
	async run(initialInputsList, timeout = Infinity) {
		let hasExecutionTimeExpired = false;
		if (timeout < Infinity) {
			setTimeout(() => {hasExecutionTimeExpired = true;}, timeout);
		}

        // first, run the initial input
        logger.info('Running on initial input');
        await this.runOnInputSequenceList(initialInputsList, MutationMetadata.getDefault());
        if (0 === this.inputQueue.size) {
            throw Error('Initial input queue should not be empty');
        }
        logger.info('Done running on initial input');

        let queueTooSmall = this.inputQueue.size < config.inputQueue.minInputQueueSize;
        for (let i = 1; !hasExecutionTimeExpired; ++i) {
            try {
                let inputsSequenceList = null;
                let mutationMetadata = null;
                // adding some random data so that the queue will not be too empty
                if (config.inputQueue.enforceMinInputQueueSize && (this.inputQueue.size < config.inputQueue.minInputQueueSize)) {
                    if (!queueTooSmall) {
                        queueTooSmall = true;
                        logger.info('Creating some random input to fill up the queue');
                    }
                    let itemFromQueue = this.inputQueue.at(Math.randomInt(this.inputQueue.size));
                    let newInput = this.generator.generateInput(itemFromQueue);
                    inputsSequenceList = [new InputSequence([newInput])];
                } else {
                    if (queueTooSmall) {
                        queueTooSmall = false;
                        logger.info('Queue is large enough. Now playing around with the items in the queue');
                    }
                    try {
                        this.inputQueue.shrinkQueue();
                    } catch (e) {
                        logger.exitAfterFlush(e);
                    }
                    let queueObject = this.inputQueue.dequeue_best();
                    if (!queueObject) {
                        logger.info('queuObject in undefined or null');
                        logger.info(this.inputQueue.size);
                        logger.exitAfterFlush('Failed to retrieve a valid queue object');
                    }
                    mutationMetadata = queueObject.mutationMetadata;
                    try {
                        inputsSequenceList =
                            this.mutator.mutateInputSequence(queueObject.inputsSequence, mutationMetadata);
                    } catch (e) {
                        console.trace();
                        console.log(e);
                        logger.exitAfterFlush(`Mutation failed: ${e}`);
                    }
                }
                await this.runOnInputSequenceList(inputsSequenceList, mutationMetadata);
            } catch (e) {
                logger.error(e);
                logger.exitAfterFlush('Fuzzer crashed: ' + e);
            }
        }
	}
}

exports.Fuzzer = Fuzzer;
