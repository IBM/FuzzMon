// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
module.exports.CoverageInstrumenter = require('./coverageInstrumenter');
module.exports.ExpressAllRoutesInstrumenter = require('./expressAllRoutesInstrumenter');
module.exports.ExpressUserInputInstrumenter = require('./expressUserInputInstrumenter');
module.exports.MultipleSuccessInstrumenter = require('./multipleSuccessInstrumenter');
module.exports.CallGraphBuilderInstrumenter = require('./callGraphBuilderInstrumenter');
module.exports.SuccessInstrumenter = require('./successInstrumenter');
module.exports.HttpUserInputInstrumenter = require('./httpUserInputInstrumenter');

module.exports.Instrumenter = require('./instrumenter');
