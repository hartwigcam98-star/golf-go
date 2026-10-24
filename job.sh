#!/bin/bash
# what the blender-club workflow runs (edit to choose the job); output branch in outbranch.txt
B=/tmp/blender/blender
mkdir -p out
TREE_SAMPLES=128 $B -b --factory-startup -P bake_trees.py -- trees.npz atlas.png out/trees 2>&1 | tee out/trees.run.log | grep -E "\[trees\]|Error|Traceback|line [0-9]+" | tail -60
