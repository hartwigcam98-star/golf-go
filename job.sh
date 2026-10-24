#!/bin/bash
B=/tmp/blender/blender
mkdir -p out
$B -b --factory-startup -P dbg.py -- out/dbg 2>&1 | grep -E "\[dbg\]|Error|Traceback" | tee out/dbg.log
