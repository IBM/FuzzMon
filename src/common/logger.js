// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const log4js = require('log4js');
const config = require('../config');

log4js.configure({
    appenders: {
        FuzzMon: {
            type: 'fileSync',
            filename: config.log.filename
        }
    },
    categories: {
        default: {
            appenders: ['FuzzMon'],
            level: config.log.level
        }
    }
});

const jsfuzzLogger = log4js.getLogger('FuzzMon');

jsfuzzLogger.exitAfterFlush = (exitMessage) => {
    log4js.shutdown(() => {
        console.log(exitMessage);
        process.exit(1);
    });
}

module.exports = jsfuzzLogger;