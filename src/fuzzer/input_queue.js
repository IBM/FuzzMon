// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const Path = require('./path').Path;
const config = require('../config');
const logger = require('../common/logger');
require('../common/utils');

class QueueObject {
	constructor(inputsSequence, path, mutationMetadata) {
		this.inputsSequence = inputsSequence;
		this.path = path;
		this.mutationMetadata = mutationMetadata;
		this._isInTmpWorkingSet = false;
	}

	toString() {
		return 'inputsSequence: ' + this.inputsSequence.toString() + '\n\tcoverage: ' + this.path.toString();
	}

	getEntryPoints() {
		return this.inputsSequence.map(gi => gi.entryPoint);
	}
}

/**
 * @class      InputQueue Represents an input queue object, as stated in the AFL white paper.
 *                        This DS contains coverages of all the paths we ran up to this point,
 *                        taking into consideration the optimization stated at section 4 of the AFL whitepaper (see shrinkQueue)
 */
class InputQueue {
	/**
	 * Constructs the object.
	 */
	constructor() {
		this.size = 0;
		this.queue = [];
		this.entryPoints = [];
	}

	at(idx) {
		if (idx < 0 || (idx > (this.size - 1))) {
			throw Error('Invalid value of `idx` ' + idx);
		}
		return this.queue[idx];
	}

	/**
	 * Determines if a given path is already covered by the items we have in our queue.
	 * Please note that we take into consideration the scores of the coverages
	 * !One more thing! The {path} param is of type `Converage`, while the items in this queue are of type QueueObject
	 * 
	 * @param      {Coverage} path  The path to check whether it is covered.
	 * @return     {boolean}  True iff covered.
	 */
	isCovered(path) {
		for (let qObj of this.queue) {
			if (path.isSubset(qObj.path)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Adds an item to the queue
	 *
	 * @param      {QueueObject}  new_input  The object to add to the queue
	 */
	enqueue(new_input) {
		if (new_input) {
			this.queue.push(new_input);
			++this.size;
		}
	}

	dequeue() {
		throw Error('This method should never be called! Only the shrinking mechanism should delete item from the queue!');
	}

	/**
	 * Helper function. Returns the QueueObject with the bigger score.
	 *
	 * @param      {QueueObject}  queueObj1     QueueObject object
	 * @param      {QueueObject}  queueObj2     QueueObject object
	 * @return     {QueueObject}  The QueueObject with the bigger score.
	 */
	_maxScoreCallback(queueObj1, queueObj2) {
		let accScore = queueObj1.path.getScore() / queueObj1.inputsSequence.size;
		let curScore = queueObj2.path.getScore() / queueObj2.inputsSequence.size;
		if (accScore === curScore) { // if the scores are the same, we take the path with the better coverage
			// return [queueObj1, queueObj2].randomItem();
			return (queueObj1.path.getCoveragePercentage() > queueObj2.path.getCoveragePercentage()) ? queueObj1 : queueObj2;
		}
		return (accScore > curScore) ? queueObj1 : queueObj2;
	}

	/**
	 * Retrieves the QueueItem with the best score
	 *
	 * @return     {QueueItem}  Item from the queue with the best score
	 */
	dequeue_best() {
		/// TODO: think of uncommenting this code
		// let weightFunc = (qObj) => {
		// 	if (!qObj || !qObj.inputsSequence) {
		// 		return 0;
		// 	}
		// 	let gisWithBody = qObj.inputsSequence
		// 		.filter(genInput => genInput && genInput.bodyVal && genInput.bodyVal.value);

		// 	let res = 0;
		// 	if (gisWithBody && gisWithBody.length > 0) {
		// 		// we prefer gis's with body
		// 		let res = gisWithBody.map(genInput => Object.keys(genInput.bodyVal.value).length ? 1 : 0).sum() / qObj.inputsSequence.size;
		// 		// console.log('res:', res);
		// 		return res;
		// 	} else {
		// 		res = Math.random() / 2;
		// 	}
		// 	return res;
		// }

		switch (this.size) {
			case 0:
				return null;
			case 1:
				return this.queue[0];
		}
		// let epsList = this.queue.map(qObj => qObj.getEntryPoints()).flatten().getUniqByCmpFunc(ep => ep.entryName);
		// if (!epsList) {
		// 	throw Error('Entry points list is not valid');
		// }
		// let chosenEP = epsList.randomItem();
		// if (!chosenEP) {
		// 	throw Error('Invalid chosen entry point');
		// }
		// let qObjsMatchingEP = this.queue.filter(qObj =>
		// 	qObj.inputsSequence.some(gi => gi.entryPoint.eq(chosenEP)));
		// return qObjsMatchingEP.randomItem();
		// return this.queue.randomItem();

		// return this.queue.weightedRandomItem(weightFunc);
		let randomNum = Math.random();
		return randomNum > 0.8 ? this.queue.reduce(this._maxScoreCallback) : this.queue.randomItem();
	}

	/**
	 * Returns a string representation of the object.
	 *
	 * @return     {string}  String representation of the object.
	 */
	toString() {
		var outStr = '';
		for (var obj of this.queue) {
			outStr += obj.toString() + '\n';
		}
		return outStr;
	}

	/**
	 * Helper function. Retrieves the QueueObject with the best score for the given tuple index.
	 *
	 * @param      {int}  tupleIdx  Index of the entry in the path we would like to be set
	 * @return     {QueueObject}  QueueObject with the entry at {tupleIdx} set and the maximal score.
	 */
	_findBestEntryForTuple(tupleIdx) {
		if (tupleIdx < 0) {
			throw Error('Tuple index should be a non-negative number');
		} else if (tupleIdx > Path.MAX_COVERAGE_SIZE - 1) {
			throw Error('Tuple index should be at most ' + (Path.MAX_COVERAGE_SIZE));
		}
		// A small optimization - if we have only a single item in the queue, it's always the best (and worst) one
		if (1 == this.size) {
			return this.queue[0];
		}

		let ret = this.queue
			.filter(queueObj => (queueObj.path.coverage[tupleIdx] !== 0) && (!queueObj._isInTmpWorkingSet));
		if (ret.length !== 0) {
			// return ret.randomItem();
			return ret.reduce(this._maxScoreCallback, ret[0]);
		} else {
			return null;
		}
	}

	/**
	 * Determines if all items in list are in the working set.
	 *
	 * @return     {boolean}  True iff all items are in the working set.
	 */
	_isAllInWorkingSet() {
		return this.size === this.queue.filter(item => item._isInTmpWorkingSet).length;
	}

	/**
	 * Reduces the size of the queue by removing redundant coverages
	 * The actual algorithm explained in the code below (it's pretty self explanatory),
	 * and in the AFL whitepaper here: http://lcamtuf.coredump.cx/afl/technical_details.txt
	 * in section `4) Culling the corpus`
	 */
	shrinkQueue() {
		if (this.size < config.inputQueue.SHRINK_THRSHOLD) {
			return;
		}
		logger.info('Size before: ' + this.size);
		this.queue.forEach(item => {
			item._isInTmpWorkingSet = false;
		});

		let workingSetSize = Path.MAX_COVERAGE_SIZE;

		// `Working set` as stated here:
		// http://lcamtuf.coredump.cx/afl/technical_details.txt
		// in section 4) Culling the corpus
		// 
		// from Buffer docs: If {fill} is undefined, the Buffer will be zero-filled.
		let workingSet = new Uint8Array(workingSetSize);
		let isAnythingInWorkingSet = false;
		for (let i = 0;
			(i < workingSetSize) && (-1 !== workingSetSize) && !this._isAllInWorkingSet();) {
			let bestEntryForTuple = this._findBestEntryForTuple(i);
			if (bestEntryForTuple) {
				bestEntryForTuple._isInTmpWorkingSet = true;
				workingSet.or(bestEntryForTuple.path.coverage);
				// find next index where workingSet[i] == 0
				let nextI = workingSet.indexOf(0, i /*fromIndex*/ );
				// console.log('nextI:', nextI, 'num of items in WS:', this.queue.filter(qObj => qObj._isInTmpWorkingSet).length);
				if (-1 === nextI) {
					break;
				} else {
					i = nextI;
					isAnythingInWorkingSet = true;
				}
			} else {
				++i;
			}
		}

		// remove all items in queue that are not in the working set
		if (!isAnythingInWorkingSet) {
			let randomIdx = Math.randomInt(this.size);
			this.queue = this.queue.filter((qObj, index) => qObj.inputsSequence.isFromUserInput || index === randomIdx);
		} else {
			this.queue = this.queue.filter(qObj => qObj._isInTmpWorkingSet || qObj.inputsSequence.isFromUserInput);
		}
		this.size = this.queue.length;
		logger.info('Size after: ' + this.size);
	}
}

// InputQueue.prototype.isUniqPath = function(bitmap) {
// 	return true;
// 	return false;
// };

// InputQueue.prototype.size = 0;


module.exports = {
	InputQueue,
	QueueObject
};