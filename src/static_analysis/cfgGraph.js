// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const fs = require('fs');
var path = require('path');
const child_process = require('child_process');
const graphlib = require('graphlib');
const logger = require('../common/logger');

class CFGNode {
	constructor(nodeType, nodeValue, rawNodeLoc, rawFilename) {
		this.nodeType = nodeType;
		this.nodeValue = nodeValue;
		this.nodeLoc = /\{(\d+), (\d+)\}/g.exec(rawNodeLoc).slice(1);
		this.nodeLoc = {
			line: this.nodeLoc[0],
			column: this.nodeLoc[1],
			toString: function() {
				return '[' + this.line + ',' + this.column + ']';
			}
		};
		this.filename = /\[(.*?)\\.*]/g.exec(rawFilename)[1];
	}
	toString() {
		return this.nodeType + ' ' + this.nodeValue + ' ' + this.nodeLoc.toString() + ' ' + this.filename;
	}
}

class CFGGraph extends graphlib.Graph {
	constructor(astObjList) {
		super({
			directed: true,
			compound: true,
			multigraph: true
		});
		this.astObjList = astObjList;
		this.CLOSURE_MEDIATOR_JAR = 'ClosureMediator.jar';
		this.PATH_TO_CLOSURE_MEDIATOR = path.join(process.env.CLOSUREMOD_DIR, this.CLOSURE_MEDIATOR_JAR);
		this.JAR_EXEC_CMD = 'java -jar ';
		this.TMP_FILENAME = '/tmp/tempFilename232384384848293.json';
		this.CLOSUREMEDIATOR_EXEC_CMD = this.JAR_EXEC_CMD + this.PATH_TO_CLOSURE_MEDIATOR + ' JSON CFG ' + this.TMP_FILENAME;
	}

	initFromJSON(graphLibFileContentJSON) {
		graphLibFileContentJSON.nodes.map((entry) => {
			super.setNode(entry.v, entry.value);
			if (entry.parent) {
				super.setParent(entry.v, entry.parent);
			}
		});
		graphLibFileContentJSON.edges.map((entry) => {
			super.setEdge({
				v: entry.v,
				w: entry.w,
				name: entry.name
			}, entry.value);
		});
	}

	init() {
		logger.info('Initializing CFG');
		let jsFileNames = this.astObjList.map(astObj => astObj.filename).join(' ');
		let cmdToExec = this.CLOSUREMEDIATOR_EXEC_CMD + ' ' + jsFileNames;
		logger.info('Now running', cmdToExec);
		child_process.execSync(cmdToExec);
		let graphLibFileContent = fs.readFileSync(this.TMP_FILENAME, 'ascii');
		let graphLibFileContentJSON = JSON.parse(graphLibFileContent);
		this.initFromJSON(graphLibFileContentJSON);
	}

	// dotToGraphNodes(dotFileLines) {
	// 	dotFileLines
	// 		.filter(line => !line.includes('->') && !line.includes('ROOT') && !line.includes('{-1, -1}')) // removing all nodes of type ROOT {-1, -1}
	// 		.map(node => (/(node\d+) \[.*label="(.*)\];/g.exec(node.trim())))
	// 		.filter(node => node) // the regex introduced some nulls
	// 		.map(node => node.slice(1)) // skip the first item, which is the line the regex worked on
	// 		.map(node => [node[0]].concat(node[1].split('\\n')))
	// 		.map(node => (node.length === 4) ?
	// 			super.addGraphNode(new CFGNode(node[1], null, node[2], node[3]), node[0]) :
	// 			super.addGraphNode(new CFGNode(node[1], node[3], node[2], node[4]), node[0]));
	// }

	// dotToGraphEdges(dotFileLines) {
	// 	dotFileLines
	// 		.filter(line => line.includes('->') && !line.includes('ROOT') && !line.includes('{-1, -1}')) // removing all nodes of type ROOT {-1, -1}
	// 		.map(line => /(node\d+) -> (node\d+).*weight=(.*?)[,|\]]/g.exec(line.trim()))
	// 		.filter(line => line) // the regex introduced some nulls
	// 		.map(line => super.addGraphEdge(line[1], line[2], line[1] + line[2] + line[3], line[3]));
	// }

	// dotToGraph(dotFileContent) {
	// 	var dotFileLines = dotFileContent.split('\n').slice(1); // removing the "digraph blah {" from the top line
	// 	this.dotToGraphNodes(dotFileLines);
	// 	this.dotToGraphEdges(dotFileLines);
	// }

	toString() {
		return super.getGraphEdges()
			.map(e => {
				let startNode = e.getNodeStart()
					.getContent();
				let endNode = e.getNodeEnd()
					.getContent();

				return '{0} ^{2}-> {1}'.format(
					startNode.toString() + '',
					endNode.toString() + '',
					e.getWeight());
			})
			.join('\n');
	}
}

exports.CFGGraph = CFGGraph;