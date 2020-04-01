// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const request = require('superagent');

const AbstractRunner = require('./abstractRunner').AbstractRunner;
const HttpRunner = require('./httpRunner');

const setIO = require('./abstractRunner').setIO;
const config = require('../config');
const path = require('path');
const logger = require('../common/logger');

/**
 * An express runner. Used to run project that were written using the ExpressJS framework.
 *
 * @class      ExpressRunner (name)
 */
class ExpressRunner extends HttpRunner {
	/**
	 * Creates an instance of the expressjs server.
	 *
	 * @param      {boolean}  ????????????????????????
	 */
	async init() {
		await super.init();
		if (!this.hModule.server) {
			logger.info(this.hModule);
			throw Error(`hModule has no property server in ${this.entryFilename}`);
		}

		// Getting the port is much easier in runtime rather than statically
		// if (!instrumentOnly && !this.expert.plugin.port) {
		// 	if (this.hModule && this.hModule.server &&
		// 		this.hModule.server.address && this.hModule.server.address()) {
		// 		this.expert.plugin.port = this.hModule.server.address().port;
		// 	}
		// 	if (!this.expert.plugin.port) {
				this.expert.plugin.port = config.http.webServerPort;
			// }
		// }
	}

	/**
	 * Sends a given input to the already started server
	 *
	 * @param      {GeneralizedInput}  generalizedInput  The input we'd like to run the entry point with
	 * @param      {object}            cookie            The cookie we'd like to send together with our request
	 * @return     {?}  Result of the execution
	 */
	async run(middleware) {
		if (!middleware.path || typeof(middleware.path) !== 'string') {
			logger.error(`Invalid middleware path: ${middleware.path}`);
			return;
		}
		if (middleware.path.includes('/:')) {
			middleware.routeParamVals.map(pVal => {
				middleware.path = middleware.path.replace(':' + pVal.name, encodeURIComponent(pVal.value));
			});
		}

		return await super.run(middleware);
	}

	/**
	 * Stops the expressjs server
	 */
	async stop() {
		if (!this.hModule.server) {
			throw Error('Failed to get server hModule');
		}
		await this.hModule.server.close();
		logger.info('Just closed express server');
	}
}

module.exports = ExpressRunner;