"""Writes the course-addition tables kept in the pipeline into a game page (index.html, or work/index.html in the nightly build):
  pipeline/ranges/traced.json    -> RANGEX    driving ranges traced from aerial photos: {key: {"P": [[x,y],...], "t": [x,y]}} (course yards; t = hitting end)
  pipeline/ranges/borrow.json    -> RANGE_AT  courses that use another course's range: {key: other_key}
  pipeline/ranges/rlid.json      -> RLID      lidar ground over ranges outside the course's lidar: {key: [x0,y0,st,nx,ny,z0,b64]} (from ranges.yml)
  pipeline/courses/teecard.json  -> TEECARD   the 2nd and 3rd tee sets from the scorecard: {key: {"n": back name, "b": [18 back yds], "s": [[name,[18 yds]],[name,[18 yds]]]}}
Courses whose range is mapped in OpenStreetMap need no entry (build_course.py keeps it as polys.range).
usage: python3 pipeline/ranges/sync.py [index.html]        (from the repo root; prints what changed)"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
page = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html')
J = lambda p: json.load(open(os.path.join(ROOT, p)))
traced, borrow, rlid, card = J('pipeline/ranges/traced.json'), J('pipeline/ranges/borrow.json'), J('pipeline/ranges/rlid.json'), J('pipeline/courses/teecard.json')
dump = lambda o: json.dumps(o, separators=(',', ':'))
sys.path.insert(0, os.path.join(ROOT, 'tools')); import datafiles
s = open(page).read()
split = '<!-- game code: tools/datafiles.py' in s     # the repo page in pieces (src/, data/): edit the packed page, then split it again
if split: s = datafiles.pack_text(os.path.dirname(os.path.abspath(page)), s)
s0 = s
def put(pat, new, name):
    global s
    n = len(re.findall(pat, s, flags=re.M))
    if n != 1: sys.exit(f'{name}: expected one definition in {page}, found {n}')
    s = re.sub(pat, lambda m: new, s, flags=re.M)
put(r'^const RANGEX=\{.*\};$', 'const RANGEX=' + dump({k: [v] for k, v in traced.items()}) + ';', 'RANGEX')
put(r'^const RANGE_AT=\{.*?\};', 'const RANGE_AT=' + dump(borrow) + ';', 'RANGE_AT')
put(r'^const RLID=\{.*?\},RLIDC=\{\};$', 'const RLID=' + dump(rlid) + ',RLIDC={};', 'RLID')
put(r'^const TEECARD=\{.*\};$', 'const TEECARD=' + dump(card) + ';', 'TEECARD')
if s == s0: print('no changes')
else:
    open(page, 'w').write(s)
    if split: datafiles.unpack(os.path.dirname(os.path.abspath(page)), quiet=True)
    print('updated', page, ':', len(traced), 'traced ranges,', len(borrow), 'borrowed,', len(rlid), 'range lidar patches,', len(card), 'tee cards')
