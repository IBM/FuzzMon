// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const Instrumenter = require('./instrumenter');
const Utils = require('../common/utils');

/**
 * Instrumenter which aims to dynamically detect properties of objects, and their types
 */
class ExpressAllRoutesInstrumenter extends Instrumenter.AbstractInstrumenter {
	constructor() {
		super("ExpressAllRoutesInstrumenter");
	}

	init(project) {
		this.project = project;
	}

	initGlobalStorage() {
		this.globalStorageName = 'listOfAllRoutsInExpress_unique_name_1337';
		global[this.globalStorageName] = [];
		this.expressGetAllRoutesFuncName = Instrumenter.createRandomInstGlobalObjName();
		global[this.expressGetAllRoutesFuncName] = Utils.expressGetAllRoutes;
	}

	getGlobalStorage() {
		return global[this.globalStorageName];
	}

	collectInstrumentationData() {
		this.initGlobalStorage();
		if (!this.outInstrumentationData) {
			// looking for 'app' in 'app = express();''
			this.outInstrumentationData = this.project.astObjList.map(astObj => {
					let expressRequireNode = astObj.getAllRequires().find(requireNode => requireNode.arguments.every(arg => arg.value === 'express'));
					if (!expressRequireNode) {
						// no express require in this file
						return;
					} else if (!expressRequireNode.parent) {
						console.log('Invalid expressRequireNode.parent in file:', astObj.filename, 'loc:', expressRequireNode.loc);
						return;
					} else if (!expressRequireNode.parent.id) {
						console.log('Invalid expressRequireNode.parent.id in file:', astObj.filename, 'loc:', expressRequireNode.loc);
						return;
					} else if (!expressRequireNode.parent.id.name) {
						console.log('Invalid expressRequireNode.parent.id.name in file:', astObj.filename, 'loc:', expressRequireNode.loc);
						return;
					}
					expressRequireNode = expressRequireNode.parent;
					let exprObjName = expressRequireNode.id.name;
					let expressInstances = astObj.searchDown(astObj.astRoot, 'CallExpression', ['callee', 'name'], exprObjName).map(n => n.parent);
					if ((!expressInstances) || (0 === expressInstances.length)) {
						console.log('Invalid expressInstances');
						return;
					}
					let expressInstancesNames = expressInstances
						.filter(instrOfExpr => instrOfExpr && instrOfExpr.id && instrOfExpr.id.name)
						.map(instrOfExpr => instrOfExpr.id.name);
					if ((!expressInstancesNames) || (0 === expressInstancesNames.length)) {
						console.log('Invalid expressInstancesNames');
						return;
					}
					return expressInstancesNames.map(expInstName => {
						return new Instrumenter.InstrumentationData(
							astObj,
							astObj.astRoot.body,
							'({0} && {0}._router && {0}._router.stack && {0}._router.stack.forEach({1}.bind(null, [])));'.format(expInstName, this.expressGetAllRoutesFuncName),
							Instrumenter.InstrRelation.append);
					});
				}).filter(n => n)
				.flatten();
		}

		return this.outInstrumentationData;
	}

	resetGlobalStorage() {
		global[this.globalStorageName] = [];
	}
}

module.exports = ExpressAllRoutesInstrumenter;