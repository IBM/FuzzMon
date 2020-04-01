// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const Utils = require('../common/utils');
const MyMath = require('../common/math');
const ParamVal = require('../entities/entities').ParamVal;
const Type = require('../entities/entities').Type;
const InputSequence = require('../entities/entities').InputSequence;
const config = require('../config');
const logger = require('../common/logger');
const SimpleGenerator = require('./simpleGenerator');

class MutationMetadata {
    constructor(mutationLevel, numberOfMutations, mutationTag) {
        this.mutationLevel = mutationLevel;
        this.mutationTag = mutationTag;
        this.numberOfMutations = numberOfMutations;
        this.probOfTypeIgnore = 0.001;
    }

    static getDefault() {
        let mutationLevel = config.mutation.defaultMutationMetadata.numberOfMutations;
        let numberOfMutations = config.mutation.defaultMutationMetadata.numberOfMutations;
        let mutationTag = config.mutation.defaultMutationMetadata.mutationTag;
        return new MutationMetadata(mutationLevel, numberOfMutations, mutationTag);
    }
}

/**
 * Class responsible for generating mutations given an input
 */
class AbstractMutator {
    /**
     * Constructs the object.
     *
     * @param      {Project}  project  Instance of the Project class, containing all of the ASTs, the graphs, etc.
     */
    constructor(name) {
        if (!this._mutateInput) {
            throw Error('Function `mutateInput` should exist in all classes that extend the AbstractMutator');
        }

        this.name = name;

        this.distribution = (value, index) => MyMath.cauchyDistribution(index);

        this.typeToFuncsMap = {
            'string': [],
            'number': [],
            'hexNumber': [],
            'boolean': [],
            'undefined': [],
            '*': [],
            'object': []
                // `null` is not included as typeof null === 'object'
        };

        this.tagToFuncsMap = {
            '*': [],
            'generic': [],
            'shellInjection': [],
            'directoryTraversal': [],
            'JScodeInjection': [],
            'evalInjection': []
        };

        this.funcToTagsMap = {};

        this.allMutationFunctions = this.typeToFuncsMap['*'];

        this.simpleTypesList = Object.keys(this.typeToFuncsMap); // a small optimization
    }

    init(expert, project) {
        this.expert = expert;
        this.project = project;
    }

    generateMetaData(resultsList, origMutationMetadata) {
        // decide using the call graph which tag to set
        return origMutationMetadata ? origMutationMetadata : MutationMetadata.getDefault();
    }

    // 'priority' is in [0,100]. Where 0 is the top of the list and 100 is at the bottom
    addMutationFunction(types, tags, funcPtr, priority = 0) {
        if (priority < 0 || priority > 100) {
            throw Error('Priority should be in the range of [0, 100]');
        }

        types = types instanceof Array ? types : [types];
        tags = tags instanceof Array ? tags : [tags];

        types.map(type => {
            let relevantFunctionsList = this.typeToFuncsMap[type];
            if (!relevantFunctionsList) {
                throw Error('Type ' + type + ' is not supported!');
            }
            let normalizedIndex = (priority / 100) * relevantFunctionsList.length;
            relevantFunctionsList.insert(normalizedIndex, funcPtr);

            let normalizedIndexForAll = (priority / 100) * this.typeToFuncsMap['*'].length;
            this.typeToFuncsMap['*'].insert(normalizedIndex, funcPtr);
        });

        tags.map(tag => {
            let relevantFunctionsList = this.tagToFuncsMap[tag];
            if (!relevantFunctionsList) {
                throw Error('Tag ' + tag + ' is not supported!');
            }
            // In the tags, we do not discriminate one function to another
            relevantFunctionsList.push(funcPtr);
            this.tagToFuncsMap['*'].push(funcPtr);

            if (this.funcToTagsMap[funcPtr]) {
                this.funcToTagsMap[funcPtr].add(tag);
            } else {
                this.funcToTagsMap[funcPtr] = new Set().add(tag);
            }
        });
    }

    /**
     * Mutates ignoring the type of the variable
     */
    _ignoreTypeAndMutate(input, mutationMetadata) {
        try {
            return (this.allMutationFunctions
                .filter(func => '*' === mutationMetadata.mutationTag ||
                    this.funcToTagsMap[func].has(mutationMetadata.mutationTag))
                .weightedRandomItem(this.distribution))(input);
        } catch (e) {
            logger.error('Error in _ignoreTypeAndMutate:' + e);
            return SimpleGenerator.generateRandomInput();
        }
    }

    mutateArray(value, type, mutationMetadata) {
        // let res = [];
        let inputClone = JSON.parse(JSON.stringify(value));
        if (Math.random() < config.mutation.object.array.probabilityOfPropertyDeletion) {
            inputClone.removeAt(Math.randomInt(inputClone.length));
        }

        if (Math.random() < config.mutation.object.array.probabilityOfPropertyAddition) {
            inputClone.insert(Math.randomInt(inputClone.length), SimpleGenerator.generateRandomInput());
        }
        return inputClone;
    }

    /**
     * Mutates the input of type object
     *
     * @param      {<type>}  input          The input
     * @param      {number}  mutationLevel  The level of mutation. How bad we want to "wreck" the input
     * @param      {Array}   inputType      The type of the input. Sometimes, we're not sure regarding the type 
     *                                      of a certain variable. In this case, inputType contains more than one entry.
     * @return     {Array}   List of various mutations on the given input
     */
    mutateObject(value, type, mutationMetadata) {
        if (!value || !type) {
            return (Math.random() > 0.99) ? SimpleGenerator.generateRandomInput() : null;
        } else if (typeof value === 'object' && Object.keys(value).length === 0) {
            return {}; // otherwise, it creates too much unwanted noise
        }
        if (Math.random() > config.mutation.object.probabilityOfGenericObjectMutation) {
            let mutationFunctionsList = this.typeToFuncsMap['object'];
            let mutationFunction = mutationFunctionsList.weightedRandomItem(this.distribution);
            return mutationFunction(value);
        }
        let flatType = type.flattenJSON();
        // let res = [];
        // for (let i = 0; i < mutationMetadata.numberOfMutations; ++i) {
        let randomJSONPath = flatType.getRandomJSONPath(true /*already flat*/ );
        let randomJSONPathBak = JSON.parse(JSON.stringify(randomJSONPath));
        let oldValue = value.getNestedProp(randomJSONPath);
        randomJSONPath = JSON.parse(JSON.stringify(randomJSONPathBak));
        let oldType = type.getNestedProp(randomJSONPath);
        let newRandomPropVal = (Math.random() > mutationMetadata.probOfTypeIgnore) ?
            this.mutateUsingGivenType(oldValue, oldType, mutationMetadata) :
            this._ignoreTypeAndMutate(oldValue, mutationMetadata);
        let inputClone = JSON.parse(JSON.stringify(value));
        randomJSONPath = JSON.parse(JSON.stringify(randomJSONPathBak));
        inputClone.setNestedProp(randomJSONPath, newRandomPropVal);
        // res.push(inputClone);
        // }

        if (Array.isArray(value)) {
            if (Math.random() > config.mutation.object.probabilityToIgnoreArrayType) {
                return [].concat(res, this.mutateArray(value, type, mutationMetadata));
            }
        }

        if (Math.random() < config.mutation.object.probabilityOfPropertyDeletion) { // with a low probability we delete the property
            // let inputClone = JSON.parse(JSON.stringify(value));
            let keysList = Object.keys(inputClone);
            delete inputClone[keysList.randomItem()]; // TODO: test this
        }

        if (Math.random() < config.mutation.object.probabilityOfPropertyAddition) { // with even lower probability we add a new property and fill it with junk
            // let inputClone = JSON.parse(JSON.stringify(value));
            let randomString = Math.randomString(Math.randomInt(10) + 1);
            inputClone[randomString] = SimpleGenerator.generateRandomInput();
        }
        return inputClone;
    }

    mutateUsingGivenType(value, type, mutationMetadata) {
        let isObject = !(this.simpleTypesList.some(_type => type === _type));
        if (isObject) {
            try {
                return this.mutateObject(value, type, mutationMetadata /*, _flatType*/ );
            } catch (e) {
                // logger.error(e);
                return SimpleGenerator.generateRandomInput();
            }
        } else {
            // try {
            let mutationFunctionsList = this.typeToFuncsMap[type]
                .filter(func => '*' === mutationMetadata.mutationTag || this.funcToTagsMap[func].has(mutationMetadata.mutationTag));
            if (!mutationFunctionsList) {
                throw Error('Type is not supported: ' + type);
            }
            if (mutationFunctionsList.length === 0) {
                return value;
            }
            let mutationFunction = mutationFunctionsList.weightedRandomItem(this.distribution);
            return mutationFunction(value);
            // } catch (e) {
            // 	logger.error(e);
            // 	logger.exitAfterFlush();
            // }
        }
    }

    deleteInput(inputSequence, inputSequenceList) {
        if (inputSequence && 1 < inputSequence.size) {
            let randomNum = Math.randomInt(inputSequence.size);
            inputSequence.removeFrom(randomNum);
            inputSequenceList.push(inputSequence);
        }
    }

    addInput(inputSequence, inputSequenceList, mutationMetadata) {
        // Please note that isFromUserInput is updated during the clone procedure
        if (inputSequence.size < config.maxSizeOfGeneralizedInput) {
            let randomIdxOfItem = Math.randomInt(inputSequence.size - 1);
            let randomIdxToInsertTo = Math.randomInt(inputSequence.size);
            let itemToAdd = this._mutateInput(inputSequence.at(randomIdxOfItem), mutationMetadata);
            inputSequence.insertTo(randomIdxToInsertTo, itemToAdd);
            inputSequenceList.push(inputSequence);
        }
    }

    mutateInput(inputSequence, inputSequenceList, mutationMetadata) {
        // This will mutatate a random **Single** input from the input sequence.
        let index = Math.randomInt(inputSequence.size - 1);
        let inputToMutate = inputSequence.at(index); // no need to call `clone` as `_mutateInput` returns a new instance
        let newInput = this._mutateInput(inputToMutate, mutationMetadata);
        inputSequence.setAt(index, newInput);
        inputSequenceList.push(inputSequence);
    }

    mutateInputSequence(inputSequence, mutationMetadata) {
        var inputSequenceList = [];
        for (let i = 0; i < mutationMetadata.numberOfMutations; ++i) {
            // please note that `inputSequenceClone` is a *clone*
            // *And* that isFromUserInput is updated during the clone procedure
            let inputSequenceClone = undefined;
            try {
                inputSequenceClone = inputSequence.clone();
            } catch (e) {
                logger.error(e);
                continue;
            }

            if (config.mutation.inputMayBeLargerThanOneCall) {
                this.inputSequenceMutationFuncsList = [this.mutateInput, this.addInput, this.deleteInput];
            } else {
                this.inputSequenceMutationFuncsList = [this.mutateInput];
            }
            let functionPtr = this.inputSequenceMutationFuncsList.weightedRandomItem(this.distribution);
            // sometimes the mutation fail and its ok.
            try {
                functionPtr.call(this, inputSequenceClone, inputSequenceList, mutationMetadata);
            } catch (e) {
                logger.error(e);
            }

        }
        return inputSequenceList;
    }

    _mutateSingleParamVal(pVal, mutationMetadata) {
        return new ParamVal(pVal.name, this.mutateUsingGivenType(pVal.value, pVal.type, mutationMetadata));
    }
}

module.exports.AbstractMutator = AbstractMutator;
module.exports.MutationMetadata = MutationMetadata;