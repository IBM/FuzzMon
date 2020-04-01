// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

require('../common/math');
const config = require('../config');
const MyMath = require('../common/math');
/**
 * Class representing a single execution path
 */
class Path {
    /**
     * Constructs the object.
     *
     * @param      {Project}          project              Instance of the Project class, containing all of the ASTs, the graphs, etc.
     * @param      {Buffer}           coverage             The coverage from a single execution
     * @param      {[string:number]}  interestingVarsCount List of tuples containing a (variable id : number of times this variable appeared in the current execution)
     */
    constructor(project, coverage, visitedNodes) {
        this.project = project;
        this.coverage = coverage.map(c => MyMath.roundUint8ToNextPowerOfTwo(c));
        this.visitedNodes = visitedNodes.unique();
        this.score = null;
    }

    /**
     * Returns the score of the current path
     */
    getScore() {
        if (!this.score) {
            // 	if (config.callGraph.dynamicallyInitializeCallGraph) {
            // 		// We get here if we can't set 'funcname.caller' because of stupid 'strict mode' 
            // 		// or such
            // 		let distancesInGraph = this.project.callGraph.distances;
            // 		this.score = this.visitedNodes.min(curNodeUid => {
            // 			let allDstNodes = distancesInGraph[curNodeUid];
            // 			return Object.keys(allDstNodes).min(dstNodeId =>
            // 				allDstNodes[dstNodeId].isTarget ?
            // 				allDstNodes[dstNodeId].distance :
            // 				Infinity
            // 			)
            // 		});
            // 		this.score = 1 / this.score;
            // } else {
            this.score = this.getCoveragePercentage();
        }
        // }

        return this.score;
    }

    /**
     * Returns a number that can indicate how much the current path covered
     * 
     * @note We do not actually know what is the whole coverage (that's the point of a fuzzer)
     *      so we take the percentage from the size of the coverage buffer (a const)
     *
     * @return     {number}  % of the coverage covered
     */
    getCoveragePercentage() {
        if (!this.coveragePercentage) {
            this.coveragePercentage = this.coverage.reduce((acc, cur) => acc + (cur > 0 ? 1 : 0), 0);
        }
        return this.coveragePercentage;
    }

    /**
     * Determines if a given path is a subset of the current path
     *
     * @param      {Path}   rhsPath  The other path
     * @return     {boolean}  True iff the other path is a subset of the current one
     */
    isSubset(rhsPath) {
        if (!(rhsPath instanceof Path)) {
            throw Error('Invalid input to isSubset');
        }
        if (this.coverage.length !== rhsPath.coverage.length) {
            throw Error('BitMaps should be of same size!');
        }
        for (var i = 0; i < this.coverage.length; ++i) {
            if (rhsPath.coverage[i] > this.coverage[i]) {
                return false;
            }
        }
        return true;
    }
}
Path.MAX_COVERAGE_SIZE = 1 << config.coverageBits;

exports.Path = Path;
exports.Path.MAX_COVERAGE_SIZE = Path.MAX_COVERAGE_SIZE;