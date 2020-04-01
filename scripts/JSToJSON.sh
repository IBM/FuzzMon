#!/bin/tcsh -f

if ($#argv < 2) then
	echo 'Usage: ./JSToJSON.sh <name of output.json> <name of JS file 1>...<name of JS file n>'
	exit
endif

if (!($?CLOSUREMOD_DIR)) then
	echo 'Please define the CLOSUREMOD_DIR env var first'
	exit
else
	set outJsonName = $argv[1]
	shift argv
	java -jar $CLOSUREMOD_DIR/ClosureMediator.jar JSON CFG $outJsonName $argv
	echo 'Done'
endif
