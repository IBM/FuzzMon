#!/bin/bash
for i in {1..100}
do
 node ./test/sample_apps_tests/main_shell_injection_example.js &>> tmp.txt 
done
