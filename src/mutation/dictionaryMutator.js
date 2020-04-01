// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab


require('../common/utils');

// Most mutations are from here:
// https://github.com/minimaxir/big-list-of-naughty-strings/blob/master/blns.txt
const specialNumbersList = [
	Number.EPSILON,
	Number.MAX_SAFE_INTEGER,
	Number.MAX_VALUE,
	Number.MIN_SAFE_INTEGER,
	Number.MIN_VALUE,
	Number.NEGATIVE_INFINITY,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	0xdeadbeef,
	'0xdeadbeef',
	0x1337
];

const numericString = ['0',
	'1',
	'1.00',
	'$1.00',
	'1/2',
	'1E2',
	'1E02',
	'1E+02',
	'-1',
	'-1.00',
	'-$1.00',
	'-1/2',
	'-1E2',
	'-1E02',
	'-1E+02',
	'1/0',
	'0/0',
	'-2147483648/-1',
	'-9223372036854775808/-1',
	'-0',
	'-0.0',
	'+0',
	'+0.0',
	'0.00',
	'0..0',
	'.',
	'0.0.0',
	'0,00',
	'0,,0',
	',',
	'0,0,0',
	'0.0/0',
	'1.0/0.0',
	'0.0/0.0',
	'1,0/0,0',
	'0,0/0,0',
	'--1',
	'-',
	'-.',
	'-,',
	'999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999',
	'NaN',
	'Infinity',
	'-Infinity',
	'INF',
	'1#INF',
	'-1#IND',
	'1#QNAN',
	'1#SNAN',
	'1#IND',
	'0x0',
	'0xffffffff',
	'0xffffffffffffffff',
	'0xabad1dea',
	'123456789012345678901234567890123456789',
	'1,000.00',
	'1 000.00',
	'1\'000.00',
	'1,000,000.00',
	'1 000 000.00',
	'1\'000\'000.00',
	'1.000,00',
	'1 000,00',
	'1\'000,00',
	'1.000.000,00',
	'1 000 000,00',
	'1\'000\'000,00',
	'01000',
	'08',
	'09',
	'2.2250738585072011e-308'
];


const codeStrings = ['undefined',
	'undef',
	'null',
	'NULL',
	'(null)',
	'nil',
	'NIL',
	'true',
	'false',
	'True',
	'False',
	'TRUE',
	'FALSE',
	'None',
	'hasOwnProperty',
	'then',
	'\\',
	'\\\\'
];
// #	Special Characters
// #
// # ASCII punctuation.  All of these characters may need to be escaped in some
// # contexts.  Divided into three groups based on (US-layout) keyboard position.

// ,./;'[]\-=
// <>?:"{}|_+
// !@#$%^&*()`~

// # Non-whitespace C0 controls: U+0001 through U+0008, U+000E through U+001F,
// # and U+007F (DEL)
// # Often forbidden to appear in various text-based file formats (e.g. XML),
// # or reused for internal delimiters on the theory that they should never
// # appear in input.
// # The next line may appear to be blank or mojibake in some viewers.
// 

// # Non-whitespace C1 controls: U+0080 through U+0084 and U+0086 through U+009F.
// # Commonly misinterpreted as additional graphic characters.
// # The next line may appear to be blank, mojibake, or dingbats in some viewers.
// 

// # Whitespace: all of the characters with category Zs, Zl, or Zp (in Unicode
// # version 8.0.0), plus U+0009 (HT), U+000B (VT), U+000C (FF), U+0085 (NEL),
// # and U+200B (ZERO WIDTH SPACE), which are in the C categories but are often
// # treated as whitespace in some contexts.
// # This file unfortunately cannot express strings containing
// # U+0000, U+000A, or U+000D (NUL, LF, CR).
// # The next line may appear to be blank or mojibake in some viewers.
// # The next line may be flagged for "trailing whitespace" in some viewers.
// 	              ​
    　
const whitespaceChars = ['\u0009', '\u000B', '\u000C', '\u0085', '\b', '\c', '\u0000', '\u000A', '\u000D'];

class DictionaryMutator {
	static mutateNumber(input) {
		return specialNumbersList.randomItem();
	}

	static mutateNumericStrings(input) {
		return numericString.randomItem();
	}

	static mutateCodeString(input) {
		return codeStrings.randomItem();
	}

	static replaceWhitespace(input) {
		return input ? input.replace(' ', whitespaceChars.randomItem()) : whitespaceChars.randomItem();
	}
	
	static init(mutatorInstance) {
		mutatorInstance.addMutationFunction('string', 'generic', DictionaryMutator.replaceWhitespace, 0);
		mutatorInstance.addMutationFunction('string', 'generic', DictionaryMutator.mutateNumericStrings, 0);
		mutatorInstance.addMutationFunction('string', 'generic', DictionaryMutator.mutateCodeString, 0);

		mutatorInstance.addMutationFunction('hexNumber', 'generic', DictionaryMutator.mutateNumber, 0);
		mutatorInstance.addMutationFunction('hexNumber', 'generic', DictionaryMutator.mutateNumericStrings, 0);

		mutatorInstance.addMutationFunction('number', 'generic', DictionaryMutator.mutateNumber, 0);
		mutatorInstance.addMutationFunction('number', 'generic', DictionaryMutator.mutateNumericStrings, 0);
	}
}

/**
 * Ignores the input and returns one of the special numbers listed above
 *
 * @param      {number}  input   The input
 * @return     {number}  Special number from the list `specialNumbersList`
 */
// static specialNumber(input) {
// 	return specialNumbersList.randomItem();
// }
// 
module.exports = DictionaryMutator;