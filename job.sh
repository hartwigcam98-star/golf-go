#!/bin/bash
B=/tmp/blender/blender
mkdir -p out
TREE_MODE=DIFFUSE TREE_SAMPLES=96 $B -b --factory-startup -P bake_trees.py -- trees2.npz atlas2.png out/trees 2>&1 | tee out/trees.run.log | grep -E "\[trees\]|Error|Traceback|line [0-9]+" | tail -80
