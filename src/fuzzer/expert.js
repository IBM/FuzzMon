// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const config = require('../config');

const FunctionCallPlugin = require('../plugins').FunctionCallPlugin;
const HttpPlugin = require('../plugins').HttpPlugin;
const ExpressPlugin = require('../plugins/expressPlugin').ExpressPlugin;

const FunctionCallRunner = require('../runners').FunctionCallRunner;
const ExpressRunner = require('../runners').ExpressRunner;
const HttpRunner = require('../runners').HttpRunner;

const Instrumenter = require('../instrumenters');

const FunctionCallMutator = require('../mutation').FunctionCallMutator;
const HttpMutator = require('../mutation').HttpMutator;
const ExpressMutator = require('../mutation').ExpressMutator;

const ShellInjectionMutator = require('../mutation').ShellInjectionMutator;
const DirectoryTraversalMutator = require('../mutation').DirectoryTraversalMutator;
const GenericMutator = require('../mutation').GenericMutator;
const TypeAwareMutator = require('../mutation').TypeAwareMutator;
const RadamasaMutator = require('../mutation').RadamasaMutator;
const DictionaryMutator = require('../mutation').DictionaryMutator;
const EvalMutator = require('../mutation').EvalMutator;

const HttpGenerator = require('../mutation').HttpGenerator;
const FunctionCallGenerator = require('../mutation').FunctionCallGenerator;

class AbstractExpert {
	constructor(name, pluginType, runnerType, mutatorType, generator, contextlessMutatorsList) {
		this.name = name; // for debugging purposes
		this.runnerType = runnerType /*ExpressRunner || FunctionCallRunner*/ ;
		this.pluginType = pluginType;
		this.mutatorType = mutatorType;
		this.plugin = new this.pluginType();
		this.mutator = new mutatorType();
		this.generator = generator; // all static methods in here, so no need to instantiate
		contextlessMutatorsList.map(mut => mut.init(this.mutator));
		// [GenericMutator].map(mut => mut.init(this.mutator));
		// [GenericMutator, ShellInjectionMutator, DirectoryTraversalMutator].map(mut => mut.init(this.mutator));
		// [RadamasaMutator, DictionaryMutator, ShellInjectionMutator, GenericMutator, TypeAwareMutator].map(mut => mut.init(this.mutator));
		// [EvalMutator].map(mut => mut.init(this.mutator));
		// [ShellInjectionMutator].map(mut => mut.init(this.mutator));
		// [/*RadamasaMutator, */DictionaryMutator, ShellInjectionMutator, GenericMutator, TypeAwareMutator].map(mut => mut.init(this.mutator));
		this.coverageInstrumenter = new Instrumenter.CoverageInstrumenter();
		if (config.callGraph.dynamicallyInitializeCallGraph) {
			this.callGraphBuilderInstrumenter = new Instrumenter.CallGraphBuilderInstrumenter();
		}
	}

	enhanceProject(project) {
		if (this.plugin) {
			if (this.plugin.getEntryPoints) {
				project.entryPoints = [].concat(
					project.entryPoints,
					this.plugin.getEntryPoints()
					.filter(newEP => !project.entryPoints.some(projEP => projEP.eq(newEP))));
			}

			if (this.plugin.targetsList) {
				project.targetsList = [].concat(
					project.targetsList,
					this.plugin.getEntryPoints()
					.filter(newEP => !project.targetsList.some(projEP => projEP.eq(newEP))));
			}
		}
	}

	/**
	 * Initializes all the instrumenters
	 */
	initInstrumentersWithProject(project) {
		this.coverageInstrumenter.init(project);
		if (config.callGraph.dynamicallyInitializeCallGraph) {
			this.callGraphBuilderInstrumenter.init(project);
		}
	}

	init(project) {
		this.plugin && this.plugin.init(project);
		this.mutator && this.mutator.init(this, project);
	}
}

exports.BasicFunctionCallExpert = class BasicFunctionCallExpert extends AbstractExpert {
	constructor() {
		super('BasicExpert',
			FunctionCallPlugin,
			FunctionCallRunner,
			FunctionCallMutator,
			FunctionCallGenerator,
			[GenericMutator]);
	}
}

exports.BasicEvalExpert = class BasicEvalExpert extends AbstractExpert {
	constructor() {
		super('BasicEvalExpert',
			FunctionCallPlugin,
			FunctionCallRunner,
			FunctionCallMutator,
			FunctionCallGenerator,
			[EvalMutator]);
	}
}

exports.BasicHttpExpert = class BasicHttpExpert extends AbstractExpert {
	constructor() {
		super('BasicHttpExpert',
			HttpPlugin,
			HttpRunner,
			HttpMutator,
			HttpGenerator,
			[GenericMutator]);
	}
}


exports.BasicExpressExpert = class BasicExpressExpert extends AbstractExpert {
	constructor() {
		super('BasicExpressExpert',
			ExpressPlugin,
			ExpressRunner,
			ExpressMutator,
			HttpGenerator,
			[GenericMutator]); // ,
		// new MutationMetadata(0.8, 0.9, 0.6, 5, 4));
	}
}

exports.BasicShellInjectionExpert = class BasicShellInjectionExpert extends AbstractExpert {
	constructor() {
		super('BasicShellInjectionExpert',
			FunctionCallPlugin,
			FunctionCallRunner,
			FunctionCallMutator,
			FunctionCallGenerator,
			[ShellInjectionMutator]); // ,
		// new MutationMetadata(0.8, 0.9, 0.6, 5, 4));
	}
}

exports.BasicPathTraversalExpert = class BasicPathTraversalExpert extends AbstractExpert {
	constructor() {
		super('BasicPathTraversalExpert',
			FunctionCallPlugin,
			FunctionCallRunner,
			FunctionCallMutator,
			FunctionCallGenerator,
			[DirectoryTraversalMutator]); // ,
		// new MutationMetadata(0.8, 0.9, 0.6, 5, 4));
	}
}

// exports.BasicShellInjectionMutator = class BasicShellInjectionMutator extends AbstractExpert {
// 	constructor() {
// 		super('BasicShellInjectionMutator',
// 			FunctionCallPlugin,
// 			FunctionCallRunner,
// 			ShellInjectionMutator,
// 			FunctionCallGenerator);
// 	}
// }
