#!/bin/bash
# what the blender-club workflow runs (edit to choose the job)
B=/tmp/blender/blender
mkdir -p out
SH_SAMPLES=96 SKY_SAMPLES=48 $B -b --factory-startup -P bake.py -- hole10.npz atlas.png out/hole10 3 2>&1 | tee out/bake.run.log | grep -E "\[bake\]|Error|Traceback|line [0-9]+" | tail -40
