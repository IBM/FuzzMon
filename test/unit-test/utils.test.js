'use strict';

const rewire = require("rewire");
const utils = rewire('../../src/common/utils');
const mocha = require('mocha');
const expect = require("chai").expect;
const Random = require("random-js");

const emptyJSON = {};
const myJSON = {
	'topLevelA': {
		'secondLevelAA': {
			'thrirdLevelAAA': 0,
			'thrirdLevelAAB': 1,
			'thrirdLevelAAC': 2
		},
		'secondLevelAB': {
			'thrirdLevelABA': 3,
			'thrirdLevelABB': 4,
			'thrirdLevelABC': 5
		},
		'secondLevelAC': {
			'thrirdLevelACA': 6,
			'thrirdLevelACB': 7,
			'thrirdLevelACC': 8
		}
	},
	'topLevelB': {
		'secondLevelBA': {
			'thrirdLevelBAA': 9,
			'thrirdLevelBAB': 10,
			'thrirdLevelBAC': 11
		},
		'secondLevelBB': {
			'thrirdLevelBBA': 12,
			'thrirdLevelBBB': 13,
			'thrirdLevelBBC': 14
		},
		'secondLevelBC': {
			'thrirdLevelBCA': 15,
			'thrirdLevelBCB': 16,
			'thrirdLevelBCC': 17
		}
	},
	'topLevelC': {
		'secondLevelCA': {
			'thrirdLevelCAA': 18,
			'thrirdLevelCAB': 19,
			'thrirdLevelCAC': 20
		},
		'secondLevelCB': {
			'thrirdLevelCBA': 21,
			'thrirdLevelCBB': 22,
			'thrirdLevelCBC': 23
		},
		'secondLevelCC': {
			'thrirdLevelCCA': 24,
			'thrirdLevelCCB': 25,
			'thrirdLevelCCC': 26
		}
	}
};
const myJSONFlat = {
	'topLevelA.secondLevelAA.thrirdLevelAAA': 0,
	'topLevelA.secondLevelAA.thrirdLevelAAB': 1,
	'topLevelA.secondLevelAA.thrirdLevelAAC': 2,
	'topLevelA.secondLevelAB.thrirdLevelABA': 3,
	'topLevelA.secondLevelAB.thrirdLevelABB': 4,
	'topLevelA.secondLevelAB.thrirdLevelABC': 5,
	'topLevelA.secondLevelAC.thrirdLevelACA': 6,
	'topLevelA.secondLevelAC.thrirdLevelACB': 7,
	'topLevelA.secondLevelAC.thrirdLevelACC': 8,
	'topLevelB.secondLevelBA.thrirdLevelBAA': 9,
	'topLevelB.secondLevelBA.thrirdLevelBAB': 10,
	'topLevelB.secondLevelBA.thrirdLevelBAC': 11,
	'topLevelB.secondLevelBB.thrirdLevelBBA': 12,
	'topLevelB.secondLevelBB.thrirdLevelBBB': 13,
	'topLevelB.secondLevelBB.thrirdLevelBBC': 14,
	'topLevelB.secondLevelBC.thrirdLevelBCA': 15,
	'topLevelB.secondLevelBC.thrirdLevelBCB': 16,
	'topLevelB.secondLevelBC.thrirdLevelBCC': 17,
	'topLevelC.secondLevelCA.thrirdLevelCAA': 18,
	'topLevelC.secondLevelCA.thrirdLevelCAB': 19,
	'topLevelC.secondLevelCA.thrirdLevelCAC': 20,
	'topLevelC.secondLevelCB.thrirdLevelCBA': 21,
	'topLevelC.secondLevelCB.thrirdLevelCBB': 22,
	'topLevelC.secondLevelCB.thrirdLevelCBC': 23,
	'topLevelC.secondLevelCC.thrirdLevelCCA': 24,
	'topLevelC.secondLevelCC.thrirdLevelCCB': 25,
	'topLevelC.secondLevelCC.thrirdLevelCCC': 26
}
const myJSONStringArray = 'topLevelA={"secondLevelAA":{"thrirdLevelAAA":0,"thrirdLevelAAB":1,"thrirdLevelAAC":2},"secondLevelAB":{"thrirdLevelABA":3,"thrirdLevelABB":4,"thrirdLevelABC":5},"secondLevelAC":{"thrirdLevelACA":6,"thrirdLevelACB":7,"thrirdLevelACC":8}},topLevelB={"secondLevelBA":{"thrirdLevelBAA":9,"thrirdLevelBAB":10,"thrirdLevelBAC":11},"secondLevelBB":{"thrirdLevelBBA":12,"thrirdLevelBBB":13,"thrirdLevelBBC":14},"secondLevelBC":{"thrirdLevelBCA":15,"thrirdLevelBCB":16,"thrirdLevelBCC":17}},topLevelC={"secondLevelCA":{"thrirdLevelCAA":18,"thrirdLevelCAB":19,"thrirdLevelCAC":20},"secondLevelCB":{"thrirdLevelCBA":21,"thrirdLevelCBB":22,"thrirdLevelCBC":23},"secondLevelCC":{"thrirdLevelCCA":24,"thrirdLevelCCB":25,"thrirdLevelCCC":26}}';
const realCookieToken = {
	"connect.sid": "s:WU9chn5378aK5kqJLsyI9Z7XGDzmgLQF.kGC2ycUCz1qZosa64/S3pnH2gDjMIeFhAg0tKNO0NE8"
};
const testArray = ['zero', 'one', 'two', 'three', 'four', 'four', 'four', 'four'];
const emptyArray = [];

describe("Utils functions", () => {
	describe("Testing getNestedProp", () => {
		it("Sanity test for getNestedProp", () => {
			expect(myJSON.getNestedProp(['topLevelC', 'secondLevelCB', 'thrirdLevelCBB'])).to.equal(22);
		});

		it("Non existing key for getNestedProp", () => {
			expect(myJSON.getNestedProp(['topLevelC', 'secondLevelCB', 'thrirdLevelCBB', 'nonExistingKeyName'])).to.equal(undefined);
		});

		it("Empty JSON for getNestedProp", () => {
			expect(emptyJSON.getNestedProp([])).to.equal(null);
		});

		it("No params to getNestedProp", () => {
			expect(myJSON.getNestedProp()).to.equal(null);
		});
	});

	describe("Testing isEqual", () => {
		it("Sanity test for isEqual", () => {
			let tmpJSON = JSON.parse(JSON.stringify(myJSON)); // creating a temp copy
			expect(tmpJSON.isEqual(tmpJSON)).to.equal(true);
			expect(tmpJSON.isEqual(tmpJSON['topLevelC'] = 1)).to.equal(false);
		});

		it("Empty param to isEqual", () => {
			expect(myJSON.isEqual()).to.equal(false);
		});

		it("Empty JSON to isEqual", () => {
			expect(myJSON.isEqual(emptyJSON)).to.equal(false);
		});
	});

	describe("Testing setNestedProp", () => {
		it("Sanity test for setNestedProp", () => {
			const xPath = ['topLevelC', 'secondLevelCC', 'thrirdLevelCCB'];
			let tmpJSON = JSON.parse(JSON.stringify(myJSON)); // creating a temp copy
			// making sure the initial value is correct
			expect(myJSON['topLevelC']['secondLevelCC']['thrirdLevelCCB']).to.equal(25);
			tmpJSON.setNestedProp(xPath, 'my test string');
			expect(tmpJSON['topLevelC']['secondLevelCC']['thrirdLevelCCB']).to.equal('my test string');
		});

		it("Non existing key for setNestedProp", () => {
			const xPath = ['topLevelC', 'secondLevelCC', 'thrirdLevelCCB'];
			let tmpJSON = JSON.parse(JSON.stringify(myJSON)); // creating a temp copy
			// making sure the initial value is correct
			expect(myJSON['topLevelC']['secondLevelCC']['thrirdLevelCCB']).to.equal(25);
			expect(tmpJSON.setNestedProp(['some non existing key', 0x1337], 'my test string')).to.equal(null);
			// making sure the JSON remained untouched
			expect(tmpJSON.isEqual(myJSON)).to.equal(true);
		});

		it("Empty JSON for setNestedProp", () => {
			const xPath = ['topLevelC', 'secondLevelCC', 'thrirdLevelCCB'];
			expect(emptyJSON.setNestedProp(xPath, 'blah')).to.equal(null);
		});

		it("No params to setNestedProp", () => {
			expect(myJSON.setNestedProp()).to.equal(null);
		});
	});

	describe("Testing flattenJSON", () => {
		it("Sanity test for flattenJSON", () => {
			let flatJSON = myJSON.flattenJSON();
			expect(flatJSON.isEqual(myJSONFlat)).to.equal(true);
			expect(flatJSON['topLevelC.secondLevelCA.thrirdLevelCAA']).to.equal(18);
		});

		it("Make sure JSON is unchanged after flattenJSON", () => {
			let flatJSON = myJSON.flattenJSON();
			expect(flatJSON['topLevelC.secondLevelCA.thrirdLevelCAA']).to.equal(18);
			// making sure the original json is unchanged
			expect(myJSON['topLevelC']['secondLevelCC']['thrirdLevelCCB']).to.equal(25);
		});

		it("Empty JSON for flattenJSON", () => {
			expect(emptyJSON.flattenJSON().isEqual(emptyJSON)).to.equal(true);
		});
	});

	// try {
	//  	// https://xkcd.com/221/
	// 	utils.__set__('Array.prototype.randomItem', function() {return this[3]});
	// 	console.log('####### getRandomJSONPath:', myJSON.getRandomJSONPath());
	// } catch (e) {
	// 	console.log(e);
	// }
	// describe("Testing getRandomJSONPath", () => {

	// });

	describe("Testing toArrayString", () => {
		it("Sanity test for toArrayString", () => {
			expect(myJSON.toArrayString().isEqual(myJSONStringArray)).to.equal(true);
			// making sure the original json is unchanged
			expect(myJSON['topLevelC']['secondLevelCC']['thrirdLevelCCB']).to.equal(25);
		});

		it("Empty JSON for toArrayString", () => {
			expect(emptyJSON.toArrayString()).to.equal('');
		});

		it("Real cookie object for toArrayString", () => {
			expect(realCookieToken.toArrayString()).to.equal('connect.sid=s:WU9chn5378aK5kqJLsyI9Z7XGDzmgLQF.kGC2ycUCz1qZosa64/S3pnH2gDjMIeFhAg0tKNO0NE8');
		});
	});

	describe("Testing Array.removeAt", () => {
		it("Sanity test for Array.removeAt", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			tmpArray.removeAt(2);
			expect(tmpArray.length).to.equal(testArray.length - 1);
			expect(tmpArray.isEqual(['zero', 'one', 'three', 'four', 'four', 'four', 'four'])).to.equal(true);
		});

		it("Empty array for Array.removeAt", () => {
			let tmpEmptyArray = JSON.parse(JSON.stringify(emptyArray));
			tmpEmptyArray.removeAt(-1);
			expect(tmpEmptyArray.length).to.equal(0);
		});

		it("Invalid index for Array.removeAt", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			tmpArray.removeAt('troll');
			expect(tmpArray.isEqual(testArray)).to.equal(true);
		});

		it("Out of bounds index for Array.removeAt", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			tmpArray.removeAt(999);
			expect(tmpArray.isEqual(testArray)).to.equal(true);
		});
	});

	describe("Testing Array.includes", () => {
		it("Sanity test for Array.includes", () => {
			expect(testArray.includes('one')).to.equal(true);
			expect(testArray.includes('somestringlalala')).to.equal(false);
		});

		it("Empty array for Array.includes", () => {
			expect(emptyArray.includes('one')).to.equal(false);
		});

		it("No args for Array.includes", () => {
			expect(testArray.includes()).to.equal(false);
		});
	});

	describe("Testing Array.getUniqObjArr", () => {
		it("Sanity test for Array.getUniqObjArr", () => {
			expect([myJSON, myJSON, myJSON].getUniqObjArr().length).to.equal(1);
			expect([myJSON, myJSON, myJSON].getUniqObjArr().isEqual([myJSON])).to.equal(true);
			expect([myJSON, myJSON, myJSON, emptyJSON].getUniqObjArr().length).to.equal(2);
			expect([testArray, testArray, testArray, testArray].getUniqObjArr().length).to.equal(1);
			expect([testArray, testArray, testArray, testArray].getUniqObjArr().isEqual([testArray])).to.equal(true);
		});

		it("Empty array for Array.getUniqObjArr", () => {
			expect([].getUniqObjArr().length).to.equal(0);
		});
	});

	describe("Testing Array.unique", () => {
		it("Sanity test for Array.unique", () => {
			expect(testArray.unique().isEqual(['zero', 'one', 'two', 'three', 'four'])).to.equal(true);
		});

		it("Empty array for Array.unique", () => {
			expect([].unique().length).to.equal(0);
		});
	});

	describe("Testing Array.insert", () => {
		it("Sanity test for Array.insert for simple object", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			let newArray = tmpArray.insert(3, 'lalala');
			expect(newArray.isEqual(['zero', 'one', 'two', 'lalala', 'three', 'four', 'four', 'four', 'four'])).to.equal(true);
		});

		it("Empty array for Array.insert for another array", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			let newArray = tmpArray.insert(3, ['lalala', 'trololo']);
			expect(newArray.isEqual(['zero', 'one', 'two', 'lalala', 'trololo', 'three', 'four', 'four', 'four', 'four'])).to.equal(true);
		});
	});

	describe("Testing Array.swap", () => {
		it("Sanity test for Array.swap", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			let tmpArray2 = tmpArray.swap(0, 1);
			expect(tmpArray2.isEqual(['one', 'zero', 'two', 'three', 'four', 'four', 'four', 'four'])).to.equal(true);
		});

		it("Sanity test for Array.swap on itself", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			tmpArray.swap(0, 1);
			expect(tmpArray.isEqual(['one', 'zero', 'two', 'three', 'four', 'four', 'four', 'four'])).to.equal(true);
		});

		it("Invalid single index for Array.swap", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			let tmpArray2 = tmpArray.swap('cow', 1);
			expect(tmpArray2.isEqual(testArray)).to.equal(true);
		});

		it("Invalid both indices for Array.swap", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			let tmpArray2 = tmpArray.swap('cow', 'zebera');
			expect(tmpArray2.isEqual(testArray)).to.equal(true);
		});

		it("Out of bounds single index for Array.swap", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			let tmpArray2 = tmpArray.swap(0, 9999);
			expect(tmpArray2.isEqual(testArray)).to.equal(true);
		});

		it("Out of bounds both indices for Array.swap", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			let tmpArray2 = tmpArray.swap(-1, 2);
			expect(tmpArray2.isEqual(testArray)).to.equal(true);
		});

		it("Empty array for Array.swap", () => {
			let tmpArray = JSON.parse(JSON.stringify(emptyArray));
			let tmpArray2 = tmpArray.swap(1, 2);
			expect(tmpArray2.length).to.equal(0);
		});

		it("No args for Array.swap", () => {
			let tmpArray = JSON.parse(JSON.stringify(testArray));
			let tmpArray2 = tmpArray.swap();
			expect(tmpArray2.isEqual(testArray)).to.equal(true);
		});
	});
});