// Licensed Materials - Property of IBM
// (C) Copyright IBM Corp. 2018, 2018 All Rights Reserved
// IBM-Review-Requirement: Art30.3 marking
// Developed by Benny Zeltser at Haifa Research Lab

const SimpleGenerator = require('./simpleGenerator');

require('../common/utils');

/**
 * Class responsible for generating mutations given an input
 */
const validIPRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

class TypeAwareMutator {
	static determineType(value) {
		if (validIPRegex.test(value)) {
			return 'ip';
		}
		const valueNum = Number(value);
		if (valueNum && !Number.isNaN(valueNum) && Number.isInteger(valueNum) && valueNum > 0 && valueNum < 65536) {
			return 'port';
		}
	}

	static mutate(value) {
		let type = TypeAwareMutator.determineType(value);
		return type ? typeToFuncMap[type](value) : value;
	}

	static init(mutatorInstance) {
		mutatorInstance.addMutationFunction('*', 'generic', TypeAwareMutator.mutate, 0);
	}
}

const mutateIP = (value) => {
	let rnd = Math.random();
	if (rnd > 0.9) {
		return '.';
	} else if (rnd > 0.8) {
		return '..';
	} else if (rnd > 0.7) {
		return '...';
	}
	let ipLst = value.split('.');
	ipLst[Math.randomInt(ipLst.length - 1)] = SimpleGenerator.generateRandomInputFromType('number') % 256;
	return ipLst.join('.');
}

const mutatePort = (value) => {
	let rnd = Math.random();
	if (rnd > 0.4) {
		return badPortsList.randomItem();
	} else if (rnd > 0.8) {
		return (Math.random() * (1 << 16));
	}
	return [Infinity, -Infinity, -0, 0, '\x00'].randomItem();
}

// source: https://www.garykessler.net/library/bad_ports.html
const badPortsList =
	[31, //	Agent 31, Hackers Paradise, Masters Paradise
		1170, //	Psyber Stream
		1234, //	Ultors Trojan
		1243, //	SubSeven server (default for V1.0-2.0)
		1981, //	ShockRave
		2001, //	Trojan Cow
		2023, //	Ripper Pro
		2140, //	Deep Throat, Invasor
		2989, //	Rat backdoor
		3024, //	WinCrash
		3150, //	Deep Throat, Invasor
		3700, //	Portal of Doom
		4950, //	ICQ Trojan
		6346, //	Gnutella
		6400, //	The Thing
		6667, //	Trinity intruder-to-master and master-to-daemon
		6670, //	Deep Throat
		12345, //	NetBus 1.x, GabanBus, Pie Bill Gates, X-Bill
		12346, //	NetBus 1.x
		16660, //	Stacheldraht intruder-to-master
		18753, //	Shaft master-to-daemon
		20034, //	NetBus 2 Pro
		20432, //	Shaft intruder-to-master
		20433, //	Shaft daemon-to-master
		27374, //	SubSeven server (default for V2.1-Defcon)
		27444, //	Trinoo master-to-daemon
		27665, //	Trinoo intruder-to-master
		30100, //	NetSphere
		31335, //	Trinoo daemon-to-master
		31337, //	Back Orifice, Baron Night, Bo Facil
		33270, //	Trinity master-to-daemon
		33567, //	Backdoor rootshell via inetd (from Lion worm)
		33568, //	Trojaned version of SSH (from Lion worm)
		40421, //	Masters Paradise Trojan horse
		60008, //	Backdoor rootshel via inetd (from Lion worm)
		65000 //	Stacheldraht master-to-daemon
	];

const typeToFuncMap = {
	'ip': mutateIP,
	'port': mutatePort,
}
module.exports = TypeAwareMutator;