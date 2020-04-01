# FuzzMon

This tool intends to use fuzz-testing methods to find various vulnerabilities in server-side `JavaScript` code, in particular, in `NodeJS`. JSFuzz is widely based on [AFL](http://lcamtuf.coredump.cx/afl/) as a coverage-oriented fuzzer, with modifications to meet the requirements of dynamic languages in general, and `JavaScript` in particular. In contrast with existing tools, JSFuzz intends to find vulnerabilities using White-Box fuzzing methods combined with gathering vital data using static analysis.

For more details visit `FuzzMon`'s [wiki page](https://github.ibm.com/JSFuzz/JSFuzz/wiki/JSFuzz)

For installation and basic usage examples of `FuzzMon`, please visit the [getting started](https://github.ibm.com/JSFuzz/JSFuzz/wiki/Getting-started) wiki page

## Credit
The code in this repository was written by Benny Zeltser (https://github.com/benny-z)
