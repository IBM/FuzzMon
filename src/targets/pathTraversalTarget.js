// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const AbstractTarget = require('./abstractTarget');
const config = require('../config');
const child_process = require('child_process');

class PathTraversalTarget extends AbstractTarget {
    constructor() {
        super('PathTraversalTarget');
        this.funcNameToFuzzMonNameMap = {
            'execFile': '_fuzzMonExecFile',
            'execFileSync': '_fuzzMonExecFileSync',
            'appendFile': '_fuzzMonAppendFile',
            'appendFileSync': '_fuzzMonAppendFileSync',
            'writeFile': '_fuzzMonWriteFile',
            'writeFileSync': '_fuzzMonWriteFileSync',
            'readFile': '_fuzzMonReadFile',
            'readFileSync': '_fuzzMonReadFileSync',
            'open': '_fuzzMonOpen',
            'openSync': '_fuzzMonOpenSync',
            'unlink': '_fuzzMonUnlink',
            'unlinkSync': '_fuzzMonUnlinkSync',
        }

        this.targetFunctions = {
            'child_process': ['execFile', 'execFileSync'],
            'fs': ['appendFile', 'appendFileSync', 'writeFile', 'writeFileSync', 'readFile', 'readFileSync', 'open', 'openSync', 'unlink', 'unlinkSync']
        };
    }

    getInstrumenters() {
        return [];
    }

    renameFuncsInAST(astObj) {
        return Object.keys(this.targetFunctions).map(targetModuleName =>
                this.targetFunctions[targetModuleName].map(targetFuncName =>
                    astObj.renameCallToFunc(targetModuleName, targetFuncName, this.funcNameToFuzzMonNameMap[targetFuncName])
                )
            )
            .flatten();
    }

    init(project) {
        this.project = project;
        this.initGlobalFuncs();
        this.targetASTNodes = this.project.astObjList.map(astObj => {
            return {
                ast: astObj,
                nodePtrs: this.renameFuncsInAST(astObj)
            }
        });

        // making sure the required file exists
        console.log(config.dirTravesalTestFilePath);
        if (!require('fs').existsSync(config.dirTravesalTestFilePath)) {
            require('fs').writeFileSync(config.dirTravesalTestFilePath, config.dirTraversalFileContent);
        }
    }

    getTargetFunctions() {
        if (!this.targetFuncsList) {
            this.targetFuncsList = this.targetASTNodes.map(item =>
                    item.nodePtrs.map(nodePtr => item.ast.getContainingFunction(nodePtr)))
                .flatten()
        }
        return this.targetFuncsList;
    }

    isTargetReached(resultsList) {
        return PathTraversalTarget.success;
    }

    initGlobalFuncs() {
        global['_fuzzMonCheckSuccess'] = (path) => {
            try {
                let content = require('fs').readFileSync(path, 'utf-8').trim();
                if (content === config.dirTraversalFileContent) {
                    PathTraversalTarget.success = true;
                    return content;
                }
            } catch (e) {
                // invalid path, or file doesn't exist. do nothing
            }
        }

        // child_process
        global['_fuzzMonExecFile'] = (file, args, options, callback) => {
            ['cat', 'ls', 'rm'].includes(file) && args.map(arg =>
                // readFileSync doesn't work well with null-byte strings, but execFile does
                global['_fuzzMonCheckSuccess'](arg.split('\x00')[0])
            );
            return require('child_process').execFile(file, args, options, callback);
        }

        global['_fuzzMonExecFileSync'] = (file, args, options) => {
            global['_fuzzMonCheckSuccess'](file);
            return require('child_process').execFileSync(file, args, options);
        }

        // fs
        global['_fuzzMonAppendFile'] = (path, data, options, callback) => {
            global['_fuzzMonCheckSuccess'](path);
            return require('fs').execFileSync(path, data, options, callback);
        }

        global['_fuzzMonAppendFileSync'] = (path, data, options) => {
            global['_fuzzMonCheckSuccess'](path);
            return require('fs').appendFileSync(path, data, options);
        }

        global['_fuzzMonWriteFile'] = (file, data, options, callback) => {
            global['_fuzzMonCheckSuccess'](file);
            return require('fs').writeFile(file, data, options, callback);
        }

        global['_fuzzMonWriteFileSync'] = (file, data, options) => {
            global['_fuzzMonCheckSuccess'](file);
            return require('fs').writeFileSync(file, data, options);
        }

        global['_fuzzMonReadFile'] = (path, options, callback) => {
            global['_fuzzMonCheckSuccess'](path);
            return require('fs').readFile(path, options, callback);
        }

        global['_fuzzMonReadFileSync'] = (path, options) => {
            global['_fuzzMonCheckSuccess'](path);
            return require('fs').readFileSync(path, options);
        }

        global['_fuzzMonOpen'] = (path, flags, mode, callback) => {
            global['_fuzzMonCheckSuccess'](path);
            return require('fs').open(path, flags, mode, callback);
        }

        global['_fuzzMonOpenSync'] = (path, flags, mode) => {
            global['_fuzzMonCheckSuccess'](path);
            return require('fs').openSync(path, flags, mode);
        }

        global['_fuzzMonUnlink'] = (path, callback) => {
            global['_fuzzMonCheckSuccess'](path);
            return require('fs').unlink(path, callback);
        }

        global['_fuzzMonUnlinkSync'] = (filename, listener) => {
            global['_fuzzMonCheckSuccess'](filename);
            return require('fs').unlinkSync(filename, listener);
        }
    }

    eq(rhs) {
        // return (this.filename === rhs.filename) && (this.targetFilePath == rhs.targetFilePath) && (this.targetFileAstObj == rhs.targetFileAstObj);
    }
}

PathTraversalTarget.success = false;
// this.targetFilePath = config.dirTravesalTestFilePath;

module.exports = PathTraversalTarget;