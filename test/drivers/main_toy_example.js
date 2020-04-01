// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
try {
    'use strict';
    const opn = require('opn');
    const fs = require('fs');
    const glob = require("glob-all");
    const path = require('path');
    let JSFuzzDir = process.env.JSFUZZ_DIR;
    JSFuzzDir = JSFuzzDir.replace('\r', '');
    const JSFuzzSrcDir = path.join(JSFuzzDir, 'src');
    const EntryParam = require(path.join(JSFuzzSrcDir, 'entities/entities')).EntryParam;
    const EntryPoint = require(path.join(JSFuzzSrcDir, 'entities/entities')).EntryPoint;
    const ParamVal = require(path.join(JSFuzzSrcDir, 'entities/entities')).ParamVal;
    const InputSequence = require(path.join(JSFuzzSrcDir, 'entities/entities')).InputSequence;
    const FunctionCall = require(path.join(JSFuzzSrcDir, 'plugins/functionCallPlugin')).FunctionCall;
    const LinesTarget = require(path.join(JSFuzzSrcDir, 'targets/linesTarget'));
    const ShellInjectionTarget = require(path.join(JSFuzzSrcDir, 'targets/shellInjectionTarget'));
    const InitController = require(path.join(JSFuzzSrcDir, 'controller')).InitController;
    const Controller = require(path.join(JSFuzzSrcDir, 'controller')).Controller;
    const BasicFunctionCallExpert = require(path.join(JSFuzzSrcDir, 'fuzzer/expert')).BasicFunctionCallExpert;
    const config = require(path.join(JSFuzzSrcDir, 'config'));
    const logger = require(path.join(JSFuzzSrcDir, 'common/logger'));
    config.userInputRequired = false;

    if (!process.env.CLOSUREMOD_DIR) {
        console.log('Not initialized `CLOSUREMOD_DIR` environment variable!');
        process.exit();
    }

    const BASE_DIR = path.join(JSFuzzDir, 'test', 'test_apps', 'toy_example');
    const filesList = glob.sync([
        path.join(BASE_DIR, '*.js')
    ]);

    const targetFileName = path.join(BASE_DIR, 'toy_example.js');
    const entryFileName = path.join(BASE_DIR, 'toy_example.js');

    const targetsList = [new LinesTarget(targetFileName, [43])];
    const expertType = BasicFunctionCallExpert;

    const initialInput = [2, 3, 1, 'gabaza']
        .map(val => new FunctionCall(filesList[0], 'meh', [new ParamVal('input', val)]));

    if (!filesList.every(fname => fs.existsSync(fname)) || !targetsList.every(target => fs.existsSync(target.filename))) {
        console.log('Not all files specified in filesList exist!');
        process.exit(1);
    }

    async function run() {
        /* `\🐼/` */
        try {
            let controller = new InitController(filesList, targetsList, [entryFileName], expertType, initialInput);
            await Controller.exec(controller);
        } catch (e) {
            console.log('EVERYTHING CRASHED WITH ERROR:');
            console.log(e);
        }
        /* 🐢~~~ */
    }

    run();
} catch (e) {
    console.log(e);
    console.trace();
}