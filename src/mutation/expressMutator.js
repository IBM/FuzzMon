// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const AbstractMutator = require('./abstractMutator').AbstractMutator;
const HttpMutator = require('.').HttpMutator;
const HttpRequest = require('../plugins/httpPlugin').HttpRequest;
const Middleware = require('../plugins/expressPlugin').Middleware;
const randexp = require('randexp').randexp;

class ExpressMutator extends HttpMutator {
    constructor() {
        super('ExpressMutator');
    }

    _mutatePath(input, mutationMetadata) {
        return (input.originalPath instanceof RegExp) ? randexp(input.originalPath) : input.originalPath;
    }

    _mutateRouteParamVals(input, mutationMetadata) {
        return input.routeParamVals.map(pVal => super._mutateSingleParamVal(pVal, mutationMetadata));
    }

    _mutateInput(input, mutationMetadata) {
        return new Middleware(input.filename, // filename
            super._mutateMethod(input, mutationMetadata), // method
            input.originalPath, // originalPath
            this._mutatePath(input, mutationMetadata), // path
            input.funcsPtrs, // funcsPtrs
            super._mutateHttpHeaders(input, mutationMetadata), // headers
            super._mutateCookies(input, mutationMetadata), // cookie
            super._mutateParamVals(input, mutationMetadata), // paramVals
            this._mutateRouteParamVals(input, mutationMetadata), // routeParamVals
            super._mutateBodyVal(input, mutationMetadata)); // bodyVal
    }
}

module.exports = ExpressMutator;