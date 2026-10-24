#!/bin/bash
B=/tmp/blender/blender
mkdir -p out
BAKE_ONLY=sun SH_SAMPLES=128 $B -b --factory-startup -P bake.py -- hole10.npz atlas.png out/hole10 4 2>&1 | tee out/bake.run.log | grep -E "\[bake\]|Error|Traceback|line [0-9]+" | tail -40
