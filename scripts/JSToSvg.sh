#!/bin/tcsh -f

if ($#argv < 2) then
	echo 'Usage: ./JSToSvg.sh <name of output.svg> <name of JS file 1>...<name of JS file n>'
	exit
endif

# set copy = ( $argv[*] )
# shift copy
# echo $copy

if (!($?CLOSUREMOD_DIR)) then
	echo 'Please define the CLOSUREMOD_DIR env var first'
	exit
else
	set outSvgName = $argv[1]
	set dotFilename = $outSvgName:gas/.svg/.dot/
	shift argv
	java -jar $CLOSUREMOD_DIR/ClosureMediator.jar DOT CFG $dotFilename $argv
	/usr/bin/dot -Tsvg $dotFilename -o $outSvgName
	echo 'Done'
endif