#!/bin/bash
B=/tmp/blender/blender
mkdir -p out
$B -b --factory-startup -P leafsheet.py -- atlas.png out/leaves 2>&1 | tee out/leaves.run.log | grep -E "\[leaf\]|Error|Traceback|line [0-9]+" | tail -40
