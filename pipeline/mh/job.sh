#!/bin/bash
# MakeHuman golfer job (Oct 2026): Blender 4.2 LTS + MPFB 2 + CC0 asset packs -> out/mh/*.fbx, *.glb, previews, assets.json
set -x
cd "$(dirname "$0")/../.."
BV=$(curl -s https://download.blender.org/release/Blender4.2/ | grep -o 'blender-4\.2\.[0-9]*-linux-x64\.tar\.xz' | sort -V | tail -1)
curl -sL "https://download.blender.org/release/Blender4.2/$BV" -o /tmp/b.tar.xz && mkdir -p /tmp/blender && tar xf /tmp/b.tar.xz -C /tmp/blender --strip-components=1
BL=/tmp/blender/blender; $BL --version | head -1
git clone -q --depth 1 https://github.com/makehumancommunity/mpfb2 /tmp/mpfb2 && (cd /tmp/mpfb2/src && zip -qr /tmp/mpfb.zip mpfb)
$BL -b --command extension install-file -r user_default -e /tmp/mpfb.zip
pip install -q requests && python pipeline/mh/fetch_packs.py
mkdir -p out/mh && cp packs/packs.json out/mh/ 2>/dev/null
$BL -b --python-exit-code 1 --python pipeline/mh/build.py 2>&1 | grep -v "^Fra:" | tail -400
grep -q '"hairs": true' pipeline/mh/run.json 2>/dev/null && $BL -b --python pipeline/mh/hairs.py 2>&1 | grep -v "^Fra:" | tail -100
ls -la out/mh
