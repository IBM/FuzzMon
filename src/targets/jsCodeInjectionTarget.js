// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const AbstractTarget = require('./abstractTarget');
const config = require('../config');
const child_process = require('child_process');

class JSCodeInjectionTarget extends AbstractTarget {
    constructor() {
        super('JSCodeInjectionTarget');
    }

    init() {
        // making sure that the target file does not exist
        if (require('fs').existsSync(config.JSCodeInjectionFilePath)) {
            require('fs').unlinkSync(config.JSCodeInjectionFilePath);
        }
    }

    getInstrumenters() {
        return [];
    }

    getTargetFunctions() {
        return [];
    }

    isTargetReached(resultsList) {
        if (!require('fs').existsSync(config.JSCodeInjectionFilePath)) {
            return false;
        }
        return config.JSCodeInjectionFileContent === require('fs').readFileSync(config.JSCodeInjectionFilePath, 'utf-8');
    }

    eq(rhs) {
        // return (this.filename === rhs.filename) && (this.targetFilePath == rhs.targetFilePath) && (this.targetFileAstObj == rhs.targetFileAstObj);
    }
}

module.exports = JSCodeInjectionTarget;