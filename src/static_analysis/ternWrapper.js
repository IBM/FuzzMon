// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const TernServer = require('tern').Server;
const fs = require('fs');

/**
 * Wraps the interface with tern
 *
 */
class TernWrapper {
	/**
	 * Constructs the object.
	 */
	constructor() {
		this.options = {
			defs: [],
			plugins: {}
		};
		this.server = new TernServer(this.options);
	}

	/**
	 * Adds a file to tern
	 *
	 * @param	  {string}  fileName	 Name of the file
	 * @param	  {string}  fileContent  The source code of the file
	 */
	addFile(fileName, fileContent) {
		if (!this.server) {
			throw Error('Somehow this was called before the constructor. How is that even possible?!');
		}
		if (!fileContent) {
			fileContent = fs.readFileSync(fileName, 'utf-8');
		}
		this.server.addFile(fileName, fileContent);
	}

	/**
	 * Returns a promise with request to the tern server
	 *
	 * @param	  {string}		   fileName	 The name of the file where we search for the variable
	 * @param	  {string}		   requestType  Type of the request to the tern server 
	 * @param	  {loc {line, ch}}   varEndLoc	The location of the variable's end
	 * @return	 {Promise}  { Promise containing the request to the tern server }
	 */
	_sendRequest(fileName, requestType, variable) {
		if (!['type', 'refs', 'definition'].includes(requestType)) {
			throw Error('Invalid request type: ' + requestType);
		}

		var typeRequest = {
			type: requestType,
			file: fileName,
			end: {
				ch: variable.loc[0].end.column - 1, // tern doesn't really care about the location we're looking at
				line: variable.loc[0].end.line - 1, // so we just take the first occurences
			},
			lineCharPositions: true
		}
		var _this = this;
		return new Promise(function(resolve, reject) {
			_this.server.request({
				query: typeRequest
			}, function(error, data) {
				if (error) {
					reject(error);
				} else {
					resolve(data);
				}
			})
		});
	}

	/**
	 * Gets the type.
	 *
	 * @param	  {string}   fileName  Name of the file where the given variable is dwelling
	 * @param	  {Variable} variable  The variable we'd like to find out its type
	 * @return	 {Promise}  The type.
	 */
	async getType(fileName, variable) {
		let varType = await this._sendRequest(fileName, 'type', variable);
		return (varType && varType.hasOwnProperty('type')) ? varType.type : null;
	}

	/**
	 * Gets a list of references
	 *
	 * @param	  {string}   fileName  Name of the file where the given variable is dwelling
	 * @param	  {Variable} variable  The variable we'd like to get its references
	 * @return	 {[Promise]}  List of references
	 */
	async getRefs(fileName, variable) {
		let varRefs = await this._sendRequest(fileName, 'refs', variable);
		if (varRefs && varRefs.hasOwnProperty('refs')) {
			return varRefs.refs.map(ref => {
				return {
					file: ref.file,
					start: {
						line: ref.start.line + 1,
						column: ref.start.ch
					},
					end: {
						line: ref.end.line + 1,
						column: ref.end.ch
					}
				};
			});
		}
		return null;
	}

	/**
	 * Gets the variable's definition
	 *
	 * @param	  {string}   fileName  Name of the file where the given variable is dwelling
	 * @param	  {Variable} variable  The variable we'd like to get its definition
	 * @return	 {Promise}  The definition of the given variable.
	 */
	async getDef(fileName, variable) {
		let varDef = await this._sendRequest(fileName, 'definition', variable);
		if (varDef && varDef.hasOwnProperty('start')) {
			varDef.start.line++;
			varDef.end.line++;
			return varDef;
		}
		return null;
	}
}

exports.TernWrapper = TernWrapper;