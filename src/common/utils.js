// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const myMath = require('./math');
const randexp = require('randexp').randexp;
const getRandomItem = require('random-weighted-item').default;
const Flatted = require('flatted');

module.exports.NotImplementedError = function(message) {
    this.name = 'NotImplementedError';
    this.message = (message || '');
};


function range(start, end, step) {
    var _end = end || start;
    var _start = end ? start : 0;
    var _step = step || 1;
    return Array((_end - _start) / _step)
        .fill(0)
        .map((v, i) => _start + (i * _step));
}

/**
 * Flattens the current array, i.e., turns an array of arrays into an array
 */
function _flattenAux(r, a = []) {
    if (Array.isArray(a)) {
        return a.reduce(_flattenAux, r);
    }
    r.push(a);
    return r;
}

// Object.defineProperty(Object.prototype, 'clone', {
// 	value: function() {

// 	},
// 	enumerable: false
// });

/**
 * Retrieves nested properties from a given object. 
 * For instance, if the object hierarchy is as follows, foo.bar.baz.moo, we would call foo(['bar', 'baz', 'moo']) 
 * 
 * @param      {[string]}  properties  Array of the property names
 * @return     {<type>}    The value of the given property in the current object, 
 *                         in the example above, the value of foo.bar.baz.moo
 */
Object.defineProperty(Object.prototype, 'getNestedProp', {
    value: function(properties) {
        if (!properties) {
            return null;
        }
        // making it work for a single property as well
        let firstKey = Object.keys(properties)[0];
        if (Object.keys(properties).length === 1) {
            return this[properties[firstKey]];
        }
        if (!this.hasOwnProperty(properties[firstKey])) {
            return null;
        }

        let curProp = properties.shift();
        if (!this[curProp]) {
            return null;
        }
        return this[curProp].getNestedProp(properties);
    },
    enumerable: false
});

Object.defineProperty(Object.prototype, 'isEqual', {
    value: function(rhs) {
        return Flatted.stringify(this) === Flatted.stringify(rhs);
    },
    enumerable: false
});

Object.defineProperty(Object.prototype, 'setNestedProp', {
    value: function(properties, newValue) {
        if (!properties) {
            return null;
        }
        // making it work for a single property as well
        let firstKey = Object.keys(properties)[0];
        if (Object.keys(properties).length === 1) {
            this[properties[firstKey]] = newValue;
            return this;
        }
        if (!this.hasOwnProperty(properties[firstKey])) {
            return null;
        }

        let curProp = properties.shift();
        if (!this[curProp]) {
            return null;
        }
        return (this[curProp]).setNestedProp(properties, newValue);
    },
    enumerable: false
});

// Object.defineProperty(Object.prototype, 'makeArrUniqueInJSON', {
// 	value: function() {
// 		for (var k in this) {
// 			if (typeof this[k] == 'object' && this[k] !== null) {
// 				if (this[k] instanceof Array) {
// 					this[k] = this[k].getUniqObj();
// 				} else {
// 					eachRecursive(this[k]);
// 				}
// 			}
// 		}
// 	},
// 	enumerable: false
// });

const getRandomKeyRe = /\.?([^.\[\]]+)|\[(\d+)\]/g;
Object.defineProperty(Object.prototype, 'getRandomJSONPath', {
    value: function(jsonIsAlreadyFlat = false) {
        let flatJSON = jsonIsAlreadyFlat ? this : this.flattenJSON();
        let randomPath = Object.keys(flatJSON).randomItem();
        let m;
        let res = [];
        while (m = getRandomKeyRe.exec(randomPath)) {
            res.push(m[1] || m[2]);
        }
        return res;
    },
    enumerable: false
});

Object.defineProperty(Object.prototype, 'flattenJSON', {
    value: function() {
        var result = {};

        function recurse(cur, prop) {
            if (Object(cur) !== cur) {
                result[prop] = cur;
            } else if (Array.isArray(cur)) {
                for (var i = 0, l = cur.length; i < l; i++)
                    recurse(cur[i], prop + '[' + i + ']');
                if (l == 0)
                    result[prop] = [];
            } else {
                var isEmpty = true;
                for (var p in cur) {
                    isEmpty = false;
                    recurse(cur[p], prop ? prop + '.' + p : p);
                }
                if (isEmpty && prop)
                    result[prop] = {};
            }
        }
        recurse(this, '');
        return result;
    },
    enumerable: false
});

Object.defineProperty(Object.prototype, 'toArrayString', {
    value: function() {
        let arr = [];
        for (let key in this) {
            if (this.hasOwnProperty(key)) {
                arr.push(key + '=' + (typeof this[key] == 'object' ? Flatted.stringify(this[key]) : this[key]));
            }
        };
        switch (arr.length) {
            case 0:
                return '';
            case 1:
                return arr[0];
            default: // arr.length > 1
                return arr.join(',');
        }
    },
    enumerable: false
});

// source: https://stackoverflow.com/questions/14446511/most-efficient-method-to-groupby-on-a-array-of-objects
Object.defineProperty(Array.prototype, 'groupBy', {
    value: function(keyGetter) {
        const map = new Map();
        this.forEach(item => {
            const key = keyGetter(item);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [item]);
            } else {
                collection.push(item);
            }
        });
        return map;
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, 'flatten', {
    value: function() {
        return this.reduce(_flattenAux, []);
        // return this.reduce((accumulator, currentValue) => accumulator.concat(currentValue), []);
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, 'removeAt', {
    value: function(index) {
        if (index >= 0) {
            this.splice(index, 1);
        }
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, 'includes', {
    enumerable: false,
    value: function(searchElement, fromIndex) {
        if (this == null) {
            throw new TypeError('\'this\' is null or not defined');
        }

        // 1. Let O be ? ToObject(this value).
        var o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0;

        // 3. If len is 0, return false.
        if (len === 0) {
            return false;
        }

        // 4. Let n be ? ToInteger(fromIndex).
        //    (If fromIndex is undefined, this step produces the value 0.)
        var n = fromIndex | 0;

        // 5. If n ≥ 0, then
        //  a. Let k be n.
        // 6. Else n < 0,
        //  a. Let k be len + n.
        //  b. If k < 0, let k be 0.
        var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

        function sameValueZero(x, y) {
            return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
        }

        // 7. Repeat, while k < len
        while (k < len) {
            // a. Let elementK be the result of ? Get(O, ! ToString(k)).
            // b. If SameValueZero(searchElement, elementK) is true, return true.
            if (sameValueZero(o[k], searchElement)) {
                return true;
            }
            // c. Increase k by 1. 
            k++;
        }

        // 8. Return false
        return false;
    }
});

/**
 * Returns a clone of the current array with unique values. 
 * The uniqueness of the items is determined by the given {cmpFunc} function.
 *
 * @param      {Function}  cmpFunc  The compare function.
 * @return     {<type>}    Clone of the current array with unique values.
 */
Object.defineProperty(Array.prototype, 'getUniqByCmpFunc', {
    value: function(cmpFunc) {
        return this.filter((obj, pos, arr) => {
            return arr.map(mapObj => cmpFunc(mapObj))
                .indexOf(cmpFunc(obj)) === pos;
        })
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, 'getUniqObjArr', {
    value: function() {
        return this.filter((obj, pos) =>
            pos === this.findIndex(rhs =>
                obj.isEqual(rhs)
            )
        );
    },
    enumerable: false
});


/**
 * Removes duplicated in the current array
 */
Object.defineProperty(Array.prototype, 'unique', {
    value: function() {
        return this.filter((v, i, a) => a.indexOf(v) === i);
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, 'max', {
    value: function(funcPtr) {
        if (!funcPtr) {
            return Math.max.apply(null, this);
        } else {
            return this.reduce((acc, cur) => Math.max(acc, funcPtr(cur)), -Infinity);
        }
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, 'min', {
    value: function(funcPtr) {
        if (!funcPtr) {
            return Math.min.apply(null, this);
        } else {
            return this.reduce((acc, cur) => Math.min(acc, funcPtr(cur)), Infinity);
        }
    },
    enumerable: false
});


Object.defineProperty(Array.prototype, 'sum', {
    value: function() {
        return this.reduce((acc, cur) => acc + cur);
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, 'swap', {
    value: function(x, y) {
        if (this.length === 0) {
            return this;
        }
        if ((Math.min(x, y) >= 0) && (Math.max(x, y) < this.length)) {
            var b = this[x];
            this[x] = this[y];
            this[y] = b;
        }
        return this;
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, 'randomItem', {
    value: function() {
        try {
            return this[Math.randomInt(this.length - 1)];
        } catch (e) {
            console.log(e);
            process.exit(13);
        }
    },
    enumerable: false
});


Object.defineProperty(Array.prototype, 'weightedRandomItem', {
    value: function(weightFunction) {
        ///////// HACK /////////
        // TRIANGLE DISTRUBUTION
        // source: https://en.wikipedia.org/wiki/Triangular_distribution#Generating_triangular-distributed_random_variates
        let b = this.length - 1;
        let idx = Math.round(b - Math.sqrt((1 - Math.random()) * b * b));
        return this[idx];
    },
    enumerable: false
});

Object.defineProperty(Array.prototype, 'insert', {
    value: function(index, item) {
        if (item instanceof Array) {
            this.splice(index, 0, ...item);
        } else {
            this.splice(index, 0, item);
        }
        return this;
    },
    enumerable: false
});

if (!String.prototype.format) {
    Object.defineProperty(String.prototype, 'format', {
        value: function() {
            var args = arguments;
            return this.replace(/{(\d+)}/g, function(match, number) {
                return typeof args[number] != 'undefined' ?
                    args[number] :
                    match;
            });
        },
        enumerable: false
    });
}

// source: https://stackoverflow.com/questions/4313841/insert-a-string-at-a-specific-index
if (!String.prototype.splice) {
    Object.defineProperty(String.prototype, 'splice', {
        value: function(start, delCount, newSubStr) {
            return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
        },
        enumerable: false
    })
};

Object.defineProperty(String.prototype, 'insertTo', {
    value: function(startIdx, value) {
        return this.splice(startIdx, 0, value);
    },
    enumerable: false
});

Object.defineProperty(String.prototype, 'remove', {
    value: function(substr) {
        var str = this;
        var n = str.search(substr);
        while (str.search(substr) > -1) {
            n = str.search(substr);
            str = str.substring(0, n) + str.substring(n + substr.length, str.length);
        }
        return str;
    },
    enumerable: false
});

// for running in JS < ES5
if (!String.prototype.includes) {
    Object.defineProperty(String.prototype, 'includes', {
        value: function(subset) {
            return (-1 !== this.indexOf(subset));
        },
        enumerable: false
    });
}

Object.defineProperty(String.prototype, 'insertSubstrTo', {
    value: function(index, substr) {
        let isOutOfBounds = index > this.length - 1;
        return isOutOfBounds ? this + substr : this.substr(0, index) + substr + this.substr(index + 1);
    },
    enumerable: false
});

Object.defineProperty(String.prototype, 'setCharAt', {
    value: function(index, chr) {
        return (index > this.length - 1) ? this : this.substr(0, index) + chr + this.substr(index + 1);
    },
    enumerable: false
});


function isCharUnicode(char) {
    return char.charCodeAt(0) > 255;
}

Object.defineProperty(String.prototype, 'stripBom', {
    value: function() {
        let isUnicode = isCharUnicode(this.charAt(0));
        if (isUnicode && this.charCodeAt(0) === 0xFEFF) {
            return this.slice(1);
        } else if (this.substring(0, 3) === '\xef\xbb\xbf') {
            return this.slice(3);
        } else if (this.substring(0, 2) === '\xfe\xff') {
            return this.slice(2);
        }
        return this;
    },
    enumerable: false
});

Object.defineProperty(RegExp, 'randomString', {
    value: function() {
        return randexp(this);
    },
    enumerable: false
});

/**
 * Performs an item-wise bitwise `or` operation between lhsBuffer and the current Buffers 
 *
 * TODO: move to utils
 */
Object.defineProperty(Uint8Array.prototype, 'or', {
    value: function(lhsUint8Array) {
        if (lhsUint8Array.length != this.length) {
            throw Error('Uint8Array sizes should be the same!\n\
        \tlhsUint8Array size: ' + lhsUint8Array.length + '\n\
        \tthis lhsUint8Array size: ' + this.length);
        }
        for (let i = 0; i < this.length; ++i) {
            this[i] |= lhsUint8Array[i];
        }
    },
    enumerable: false
});

Object.defineProperty(Uint8Array.prototype, 'nnz', {
    value: function() {
        return this.reduce((acc, cur) => acc + (cur > 0 ? 1 : 0), 0);
    },
    enumerable: false
});

// Object.defineProperty(Buffer.prototype, 'nnz', {
// 	value: function() {
// 		return this.reduce((acc, cur) => acc + (cur > 0 ? 1 : 0), 0);
// 	},
// 	enumerable: false
// });

// Object.defineProperty(RegExp, 'multipleExec', {
// 	value: function(string) {
// 		var execRes;
// 		var outArr = [];
// 		while ((execRes = this.exec(string)) !== null) {
// 			outArr.push(execRes);
// 		}
// 		return outArr;
// 	},
// 	enumerable: false
// });

/**
 * Returns a random list of strings of length `length` and max. number of characters of `maxStrLength`
 */
function randomListOfStrings(length, maxStrLength) {
    return range(0, length).map(_ => Math.randomString(Math.randomInt(maxStrLength) + 1));
}

/**
 * Returns true iff `x` is bettween `min` and `max`
 */
function inRange(x, min, max) {
    return ((x - min) * (x - max) <= 0);
}

/**
 * Recursively extracts an object's type. 
 *
 * @param      {object}  internalInput  The object to extract its type from
 * @return     {object}  JSON representation of the object's structure and types
 */
var extractObjectType = internalInput => Object.keys(internalInput)
    .reduce((obj, item) => {
        let type = typeof internalInput[item];
        obj[item] = type === 'object' ? extractObjectType(internalInput[item]) : type;
        return obj;
    }, {});

/**
 * Creates a string representation of the call stack.
 *
 * @return     {String}  String representation of the call stack.
 */
// var getCallStack = () =>
// 	(new Error().stack)
// 	.split('\n')
// 	.slice(1)
// 	.map(line => /at (.*?) \((.*?)\:(\d+)\:(\d+)\)/g.exec(line) || line) // for lines like: "at getCallStack2 (C:\test.js:6:15)""
// 	.map(line => line instanceof Array ? line : /at (.*?)\:(\d+)\:(\d+)/g.exec(line)) // for lines like: "at C:\test.js:41:3"
// 	.map(item => item.slice(1))
// 	.map(item => (item.length !== 3) ? item : [].concat('anonymous', item))
// 	.map(item => {
// 		return {
// 			func: item[0],
// 			filename: item[1],
// 			line: item[2],
// 			column: item[3]
// 		}
// 	});
// var getCallStack = () => (new Error().stack);

var zip = (...rows) => [...rows[0]].map((_, c) => rows.map(row => row[c]));

function wait(ms) {
    var start = new Date().getTime();
    var end = start;
    while (end < start + ms) {
        end = new Date().getTime();
    }
}

// source: https://github.com/expressjs/express/issues/3308
// var listOfAllRoutsInExpress_unique_name_1337 = [];
// function expressGetAllRoutes(path, layer) {
// 	if (layer.route) {
// 		layer.route.stack.forEach(expressGetAllRoutes.bind(null, path.concat(expressGetAllRoutesSplit(layer.route.path))));
// 	} else if (layer.name === 'router' && layer.handle.stack) {
// 		layer.handle.stack.forEach(expressGetAllRoutes.bind(null, path.concat(expressGetAllRoutesSplit(layer.regexp))));
// 	} else if (layer.method) {
// 		let a = path.concat(expressGetAllRoutesSplit(layer.regexp)).filter(Boolean).join('/');
// 		if (a) {
// 			listOfAllRoutsInExpress_unique_name_1337.push({
// 				'method': layer.method.toLowerCase(),
// 				'path': '/' + a
// 			});
// 		}
// 	}
// }

// function expressGetAllRoutesSplit(thing) {
// 	if (typeof thing === 'string') {
// 		return thing.split('/');
// 	} else if (thing.fast_slash) {
// 		return '';
// 	} else {
// 		var match = thing.toString()
// 			.replace('\\/?', '')
// 			.replace('(?=\\/|$)', '$')
// 			.match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);
// 		return match ?
// 			match[1].replace(/\\(.)/g, '$1').split('/') :
// 			null; //'<complex:' + thing.toString() + '>'
// 	}
// }

function lineAndColToLoc(line, col) {
    return {
        'line': line,
        'column': col
    };
}

function sliceArrayIntoSlots(arrToSlice, slotSize) {
    return arrToSlice.reduce((result, value, index, array) => {
        if (0 === (index % slotSize)) result.push(array.slice(index, index + slotSize));
        return result;
    }, []);
}

function duplicateNonBoundaryItems(arr) {
    return arr.reduce((result, value, index, array) => {
        result.push(value);
        if (0 !== index && index !== array.length - 1) {
            result.push(value)
        };
        return result;
    }, []);

}

function randomVariableName(length) {
    let varName = Math.randomAlphaNumeric(length);
    if (!isNaN(varName[0])) {
        varName = Math.randomASCII(1) + varName.slice(0, varName.length - 1);
    }
    return varName;
}

function randomVariableName(length) {
    let varName = Math.randomAlphaNumeric(length);
	if (!isNaN(varName[0])){ 
		varName = Math.randomASCII(1) + varName.slice(0, varName.length - 1);
	}
    return varName;
}

exports.randomVariableName = randomVariableName;
exports.lineAndColToLoc = lineAndColToLoc;
exports.zip = zip;
exports.range = range;
exports.inRange = inRange;
exports.extractObjectType = extractObjectType;
// exports.getCallStack = getCallStack;
exports.randomListOfStrings = randomListOfStrings;
// exports.expressGetAllRoutes = expressGetAllRoutes;
exports.wait = wait;
exports.sliceArrayIntoSlots = sliceArrayIntoSlots;
exports.duplicateNonBoundaryItems = duplicateNonBoundaryItems;