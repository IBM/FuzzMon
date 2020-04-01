// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const graphlib = require('graphlib');
const Flatted = require('flatted');
const path = require('path');

const logger = require('../common/logger');
const Utils = require('../common/utils');
const config = require('../config');
/**
 * Representing a call graph between functions
 */
class CallGraph extends graphlib.Graph {
    /**
     * Constructs the object.
     *
     * @param      {[AST]}  astObjList  List of all ASTs in the project
     */
    constructor(project) {
        super({
            directed: true,
            compound: true,
            multigraph: true
        });
        this.project = project;
        this.astObjList = project.astObjList;
        this.funcCallsToIgnore = exports.BUILTIN_FUNC_NAMES;
        this.dynamicDataRaw = new Set();
        this.dynamicDataRawLength = new Set();
        this.serializedGraphFileName = `${config.callGraph.serializedGraphFilename}_${require('path').basename(this.project.entryFilenames[0])}.txt`
    }

    // deserialize(content) {
    // 	if ('string' === typeof(content)) {
    // 		content = JSON.parse(content);
    // 	}
    // 	this.setGraph(content.value);
    // 	content.nodes.map((entry) => {
    // 		this.setNode(entry.v, entry.value);
    // 		if (entry.parent) {
    // 			this.setParent(entry.v, entry.parent);
    // 		}
    // 	});
    // 	content.edges.map((entry) => {
    // 		this.setEdge({
    // 			v: entry.v,
    // 			w: entry.w,
    // 			name: entry.name
    // 		}, entry.value);
    // 	});
    // }

    serialize() {
        return graphlib.json.write(this);
    }

    // _formatDynamicDataFromErrorTrace(dynamicData) {
    // 	return dynamicData
    // 		.filter(callsToFunc => {
    // 			// a little optimization
    // 			let callsToFuncLength = callsToFunc.length;
    // 			if (this.dynamicDataRawLength.has(callsToFuncLength)) {
    // 				if (this.dynamicDataRaw.has(callsToFunc)) {
    // 					return false;
    // 				}
    // 			}
    // 			this.dynamicDataRawLength.add(callsToFuncLength);
    // 			this.dynamicDataRaw.add(callsToFunc);
    // 			return true;
    // 		})
    // 		.map(callsToFunc =>
    // 			callsToFunc.split('\n')
    // 			.slice(1)
    // 			.filter(stackEntry => ['at <anonymous>', 'Timeout.setTimeout', 'module.js', 'timers.js'].every(str => !stackEntry.includes(str)))
    // 			.map(line => /at (.*?) \((.*?)\:(\d+)\:(\d+)\)/g.exec(line) || line) // for lines like: "at getCallStack2 (C:\test.js:6:15)""
    // 			.map(line => line instanceof Array ? line : /at (.*?)\:(\d+)\:(\d+)/g.exec(line)) // for lines like: "at C:\test.js:41:3"
    // 			// doesn't work in the case of [1].map(a => bar())
    // 			.map(item => item.slice(1)) // removing the call to the function that gathers info from the call stack (pointer to Utils.getCallStack)
    // 			.filter(item => (item.length !== 3) ? item : [].concat('anonymous', item))
    // 			.map(item => {
    // 				let filename = item[1];
    // 				let lineNumber = Number(item[2]) - 1;
    // 				let name = item[0];
    // 				let columnNumber = Number(item[3]);
    // 				return {
    // 					name: name,
    // 					filename: filename,
    // 					line: lineNumber,
    // 					column: columnNumber
    // 				};
    // 			})
    // 		)
    // 		.filter(n => n)
    // 		.flatten();
    // }

    _formatNodeStr(funcPtr) {
        return {
            "label": funcPtr.name,
            "loc": [funcPtr.loc.start.line, funcPtr.loc.end.line],
            // "nodeValue": "",
            "filename": require('path').basename(funcPtr.filename),
            // "funcPtr": funcPtr,
            "isTarget": funcPtr.isTarget
        }
    }

    ignoreFilenameAndSearchForFunc(funcPtr) {
        let nodeInGraph = super.nodes().find(nodeIdInGraph => {
            let curNodeInGraph = super.node(nodeIdInGraph);
            return curNodeInGraph && funcPtr.name === curNodeInGraph.name;
        });
        if (nodeInGraph) {
            return nodeInGraph;
        }

        this.project.astObjList.map(astObj => {
            nodeInGraph = astObj.getAllFunctions()
                .find(funcInAST => {
                    return funcInAST.name === funcPtr.name;
                });
            if (nodeInGraph) {
                return;
            }
        });
        return nodeInGraph;
    }

    enhanceFromDynamicData(dynamicData) {
        let visitedNodes = [];
        let wasGraphAltered = false;
        dynamicData
            .map(item => {
                if (!item || (!item.func && !item.caller)) {
                    throw Error('Something went wrong. Both callee and caller cannot be anonymous');
                } else if (item && item.func && !item.caller) {
                    return; // the case where the function was called from top level. thus, the caller is null
                } else if (item && item.func && item.func.name && item.caller && item.caller.name) {
                    let astObj = this.astObjList.find(astObj => astObj.filename === item.filename);
                    if (!astObj) return;

                    let caller = item.caller;
                    let callee = item.func;

                    let callerUid = this._genFuncUid(item.filename, caller.name);
                    let calleeUid = this._genFuncUid(item.filename, callee.name);

                    let callerFunction = super.node(callerUid);
                    let calleeFunction = super.node(calleeUid);

                    if (!callerFunction) { // if caller is not already in the graph
                        // TODO: handle the case where a function from a file X calls a function from a file Y
                        callerFunction = astObj.getAllFunctions().find((funcInAST) => funcInAST.name === caller.name);
                        callerFunction && super.setNode(callerUid, callerFunction);
                        wasGraphAltered = true;
                    }
                    if (!calleeFunction) { // if callee is not already in the graph
                        // TODO: handle the case where a function from a file X calls a function from a file Y
                        calleeFunction = astObj.getAllFunctions().find((funcInAST) => funcInAST.name === callee.name);
                        calleeFunction && super.setNode(calleeUid, calleeFunction);
                        wasGraphAltered = true;
                    }

                    // as a last resort we ignore the name of the file and search for the function manually
                    // in the graph
                    // Should we maybe search in our astObjList instead?
                    if (!callerFunction) {
                        callerUid = this.ignoreFilenameAndSearchForFunc(caller);
                    }
                    if (!calleeFunction) {
                        calleeUid = this.ignoreFilenameAndSearchForFunc(callee);
                    }

                    if (!callerUid) {
                        // Sometimes you're on top, sometimes you hit bottom
                        // logger.error(`Invalid caller ${item.filename}:${caller.name}`);
                        return;
                    }
                    if (!calleeUid) {
                        // Sometimes you're on top, sometimes you hit bottom
                        logger.error(`Invalid callee ${item.filename}:${callee.name}`);
                        return;
                    }

                    visitedNodes.push(callerUid);
                    visitedNodes.push(calleeUid);

                    if (!super.hasEdge(callerUid, calleeUid)) {
                        super.setEdge(callerUid, calleeUid);
                        wasGraphAltered = true;
                    }
                }
            });

        if (wasGraphAltered) {
            this.calcDistances();
            this.addZeroWeightEdgesBetweenSameFuncs();
        }
        return visitedNodes;
    }

    addZeroWeightEdgesBetweenSameFuncs() {
        const listOfNodes = this.nodes().map(nodeId => this.node(nodeId));
        const funcsGroupedByLoc = listOfNodes
            .groupBy(func => func.filename + func.loc.start.line + func.loc.end.line);

        for (var key of funcsGroupedByLoc.keys()) {
            let funcs = funcsGroupedByLoc.get(key);
            if (funcs.length <= 1) {
                continue;
            }
            if (funcs.length !== 2) {
                throw Error(`Invalid number of objects: ${funcs.length} pointing to the same function in ${funcs[0].filename}:${funcs[0].loc.start.line}`);
            }
            let funcIds = funcs.map(func => this._fuzzMonFuncToUid(func));
            let func0 = funcIds[0];
            let func1 = funcIds[1];
            super.setEdge(func0, func1);
            super.setEdge(func1, func0);
        }
    }

    calcDistances() {
        this.distances = graphlib.alg.dijkstraAll(this, (e) => this.node(e.v).node === this.node(e.w).node ? 0 : 1);
        Object.keys(this.distances).map(funcUid =>
            Object.keys(this.distances[funcUid]).map(dstFuncUid =>
                this.distances[funcUid][dstFuncUid].isTarget = super.node(dstFuncUid).isTarget
            ));
    }

    _addFuzzMonFuncToGraph(fuzzMonFunc) {
        let uid = this._fuzzMonFuncToUid(fuzzMonFunc);
        super.setNode(uid, fuzzMonFunc);
    }

    setTarget(fuzzMonFunc) {
        this._addFuzzMonFuncToGraph(fuzzMonFunc); // making sure the function is already in the graph
        let wasNotTarget = !fuzzMonFunc.isTarget;
        fuzzMonFunc.isTarget = true;
        if (wasNotTarget) {
            this.calcDistances();
        }
    }

    _getCalleeFuncByLoc(astObj, loc) {
        let topFuncDefNode = astObj.getNodeByLine(astObj.astRoot, loc.start.line)[0];
        if (!topFuncDefNode) {
            return;
        }
        let calleeFunction = astObj.getContainingFunction(topFuncDefNode);
        return calleeFunction;
    }

    _genFuncUid(filename, functionName) {
        return functionName.includes('anonymous_') ?
            functionName :
            `${path.basename(filename).replace('.', '')}__${functionName}`;
    }

    _fuzzMonFuncToUid(funcObj) {
        return this._genFuncUid(funcObj.filename, funcObj.name);
    }

    async searchForFuncRefInTern(astObj, callee /*, calleeName*/ ) {
        try {
            callee.loc = [callee.loc];
            let calleeFuncDef = await this.ternWrapper.getDef(astObj.filename, callee);
            callee.loc = callee.loc[0];
            return calleeFuncDef;
        } catch (e) {
            // TODO: do something
        }
    }

    async initFromStaticAnalysis(project) {
        // now we add the edges as well
        this.ternWrapper = project.ternWrapper;
        for (let astObj of this.astObjList) {
            var allFuncCallsInAST = astObj.searchDown(astObj.astRoot, 'CallExpression');
            for (let call of allFuncCallsInAST) {
                let callerFunction = undefined;
                try {
                    callerFunction = astObj.getContainingFunction(call);
                } catch (e) {
                    logger.error(e);
                }
                if (!callerFunction) {
                    continue;
                }
                let calleeName = astObj.getCalleeName(call); // can be blah.getX
                if ((!calleeName) || this.funcCallsToIgnore.includes(calleeName)) {
                    continue;
                }
                let calleeFuncDef = await this.searchForFuncRefInTern(astObj, call.callee, calleeName);
                if (calleeFuncDef) {
                    // please note that we use 'endsWith' and not '===' because tern sometimes (not sure when)
                    // trims the name of the file
                    let relevantAST = this.astObjList.find(astObj => astObj.filename.endsWith(calleeFuncDef.file));
                    if (!relevantAST) {
                        continue;
                    }
                    let calleeFunction = this._getCalleeFuncByLoc(relevantAST, {
                        'start': calleeFuncDef.start
                    });

                    if (!calleeFunction) {
                        continue;
                    }
                    let calleeFunctionUid = this._fuzzMonFuncToUid(calleeFunction);
                    let callerFunctionUid = this._fuzzMonFuncToUid(callerFunction);

                    super.setEdge(callerFunctionUid, calleeFunctionUid);
                }
            }
        }
    }

    /**
     * Initiates the call graph from the ast object list we got in the constructor
     */
    async init(project) {
        this.project = project;

        if (!config.callGraph.staticallyInitializeCallGraph) {
            return;
        }
        console.log('Initializing call graph (this migh take a while...)');
        // first, adding all functions to the call graph w/o the edges between them
        project.astObjList
            .map(astObj => astObj.getAllFunctions()
                .map(func => super.setNode(this._fuzzMonFuncToUid(func), func)));

        await this.initFromStaticAnalysis(project);
    }

    // funcPtrToEdgeId(filename, funcPtr) {
    // 	return {
    // 		label: filename + ':' + funcPtr.loc.start.line
    // 	};
    // }

    /**
     * Returns a string representation of the object.
     */
    toString() {
        let outJSON = this.serialize();
        outJSON.nodes.forEach(node => node.value = this._formatNodeStr(node.value));
        outJSON.edges.forEach(e => e.value = {
            "label": ""
        });
        return JSON.stringify(outJSON, null, 2);
    }

    saveToFile() {
        require('fs').writeFileSync(this.serializedGraphFileName, this.toString());
    }
}

/**
 * Representation of a single function
 */
class Function {
    constructor(name, loc, filename, node, isTarget = false) {
        this.name = name;
        this.loc = loc;
        this.filename = filename;
        this.node = node;
        this.isTarget = isTarget;
        // this.shortName = Function.getShortName(this.name);
    }

    toString() {
        return `${this.name}(${this.filename})`;
    }
}

exports.CallGraph = CallGraph;
exports.Function = Function;
exports.BUILTIN_FUNC_NAMES = ['decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'eval',
    'isFinite', 'isNaN', 'Number', 'parseFloat', 'parseInt', 'String', 'unescape',
    'console.log', 'require'
];