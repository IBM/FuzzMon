// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab
const request = require('superagent');

const AbstractRunner = require('./abstractRunner').AbstractRunner;
const setIO = require('./abstractRunner').setIO;
const config = require('../config');
const path = require('path');
const logger = require('../common/logger');

/**
 * An express runner. Used to run project that were written using the ExpressJS framework.
 *
 * @class      HttpRunner (name)
 */
class HttpRunner extends AbstractRunner {
    /**
     * Creates an instance of the expressjs server.
     *
     * @param      {boolean}  ????????????????????????
     */
    async init() {
        await super.init();
        // Getting the port is much easier in runtime rather than statically
        // if (!instrumentOnly) {
        this.port = config.http.webServerPort;
        this.requestObj = request;
        // }
    }

    /**
     * Sends a given input to the already started server
     *
     * @param      {GeneralizedInput}  generalizedInput  The input we'd like to run the entry point with
     * @param      {object}            cookie            The cookie we'd like to send together with our request
     * @return     {?}  Result of the execution
     */
    async run(httpRequest) {
        // super.saveCurAbsState();
        var httpRequestPath = httpRequest.path;
        // TODO: Handle the case of a get request with parameters 
        // e.g., foo.com/param1=value1&param2=value2 
        var httpHandlerFileName = path.resolve(httpRequest.filename);
        var httpHandlerDirName = path.dirname(httpHandlerFileName);
        super.changeDir(httpHandlerDirName);
        super.changeRequireFilename(httpHandlerFileName);
        // setIO(false);
        let cookie = httpRequest.cookie;

        httpRequest.method = httpRequest.method.toLowerCase();

        var response = null;
        try {
            httpRequestPath = httpRequestPath.startsWith('/') ? httpRequestPath : ('/' + httpRequestPath);
            let fullUrl = `${config.http.isSSL ? 'https' : 'http'}://localhost:${this.port}${httpRequestPath}`;
            let requestObject = this.requestObj[httpRequest.method](fullUrl)
                .timeout({
                    response: config.http.timeout.response,
                    deadline: config.http.timeout.deadline,
                });

            // Object.keys(config.http.headers).map(key => {
            // 	requestObject.set(key, config.http.headers[key])
            // });
            if (httpRequest.paramVals && httpRequest.paramVals.length > 0) {
                let requestObjectQuery = httpRequest.paramVals.reduce((acc, pVal) => {
                    acc[pVal.name] = pVal.value;
                    return acc;
                }, {});
                requestObject.query(requestObjectQuery);
            }
            Object.keys(httpRequest.headers).map(key => {
                requestObject.set(key, httpRequest.headers[key])
            });
            cookie && requestObject.set('Cookie', cookie.toArrayString());
            if ((httpRequest.bodyVal.value instanceof ArrayBuffer) ||
                (typeof(httpRequest.bodyVal.value) === 'string') ||
                (httpRequest.bodyVal.value instanceof Buffer) || 
                (typeof(httpRequest.bodyVal.value) === 'object')) {
                response = await requestObject.send(httpRequest.bodyVal.value);
            } else {
                response = await requestObject.send('' + httpRequest.bodyVal.value);
            }
        } catch (e) {
            if (e.response) {
                response = e.response;
            } else if ('ETIMEDOUT' !== e.errno) {
                throw e;
            }
        }
        super.restoreDir();
        return response;
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

module.exports = HttpRunner;