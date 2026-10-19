"""Add requested courses to the game. Rebuilds work/index.html and work/{greens,ground,trees}.js from work/base_* every run.
Each course lives in golf/auto/<key>/ with: meta.json, <key>_course.json, <key>_tb.json, <key>_surr.json, <key>_consts.js,
wide_<key>.json, naip_<key>.json, (hero.json), and its patches in golf/lidar2/patches_<key>.json.
meta.json: {"SUF":"HCK","name":"Hidden Creek","town":"Rochester, MN","tees":"Blue tees","ll":[lat,lon],
            "flag":{"bg":"#..","fg":"#..","ac":"#..","m":"<existing emblem>"},"day":<dailyNum first eligible day>,
            "scen":"prairie|desert","turf":"<existing TURF key to copy>","trees":"default|north|south|az|barrens"}
usage (from golf/): python3 auto/inject_auto.py key [key...]"""
import json, sys, math, os, re
import numpy as np
G = '/home/claude/golf/'; W = G + 'work/'
keys = sys.argv[1:]
s = open(W + 'base_index.html').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80]); s = s.replace(a, b)
M = {k: json.load(open(G + f'auto/{k}/meta.json')) for k in keys}
for k in keys:
    assert re.fullmatch(r'[a-z][a-z0-9]{2,15}', k), k
    assert f"\n  {k}:{{id:'{k}'" not in s, k + ' is already in the game'
    assert f'COURSE_{M[k]["SUF"]}=' not in s, M[k]['SUF'] + ' suffix taken'
# 1. data block (before the TURF table comment)
blk = []
for k in keys:
    m = M[k]; S = m['SUF']; D = G + f'auto/{k}/'
    C = json.load(open(D + f'{k}_course.json')); TB = json.load(open(D + f'{k}_tb.json')); SU = json.load(open(D + f'{k}_surr.json'))
    blk.append(f'// {m["town"]}: {m["name"]} (player request): OpenStreetMap, USGS NED/3DEP, USDA NAIP')
    blk += open(D + f'{k}_consts.js').read().strip().split('\n')
    blk.append(f'const TB_{S}=' + json.dumps(TB) + ';')
    blk.append(f'let SURR_{S}=' + json.dumps(SU, separators=(',', ':')) + ';')
    blk.append(f'let COURSE_{S}={{holes:{json.dumps(C["holes"],separators=(",",":"))},polys:{json.dumps(C["polys"],separators=(",",":"))},paths:{json.dumps(C["paths"],separators=(",",":"))},origin:[{C["origin"][0]}, {C["origin"][1]}]}};')
    blk.append(f'// end {m["name"]}')
rep('\n/* per-course turf look:', '\n' + '\n'.join(blk) + '\n/* per-course turf look:')
# 2. COURSES + CPK ids
ent = ''.join(f",\n  {k}:{{id:'{k}',name:{json.dumps(M[k]['name'])},town:{json.dumps(M[k]['town'])},tees:{json.dumps(M[k]['tees'])},tb:TB_{M[k]['SUF']},course:COURSE_{M[k]['SUF']},dem:DEM_{M[k]['SUF']},saveKey:'{k}-save-v1',scen:'{M[k].get('scen','prairie')}',wide:WIDE_{M[k]['SUF']},surr:SURR_{M[k]['SUF']}}}" for k in keys)
rep("}};\nlet CUR=COURSES.troy", "}" + ent + "};\nlet CUR=COURSES.troy")
rep('],i:0,t:0};', ''.join(f', "{k}"' for k in keys) + '],i:0,t:0};')
# 3. TURF
i = s.index('const TURF='); j = s.index('\n', i); T = json.loads(s[i + 11:j].rstrip(';'))
for k in keys: T[k] = dict(T[M[k].get('turf', 'troy')])
s = s[:i] + 'const TURF=' + json.dumps(T, separators=(',', ':')) + ';' + s[j:]
# 4. trees: tuned list + species mix
def addset(var, k):
    global s
    i = s.index(var + '={'); j = s.index('}', i); s = s[:i] + s[i:j] + f',{k}:1' + s[j:]
for k in keys:
    addset('R3T_COURSES', k)
    mix = {'north': 'R3T_NORTH', 'south': 'R3T_SOUTH', 'az': 'R3T_AZ', 'barrens': 'R3T_BARRENS'}.get(M[k].get('trees', 'default'))
    if mix: addset(mix, k)
# 5. flags (existing emblems only)
i = s.index('const R3_FLAGS={'); j = s.index('};', i)
fl = ',\n  '.join(f"{k}:{{bg:'{M[k]['flag']['bg']}',fg:'{M[k]['flag']['fg']}',ac:'{M[k]['flag']['ac']}',m:'{M[k]['flag']['m']}'}}" for k in keys)
s = s[:j] + ',\n  ' + fl + s[j:]
for k in keys: assert re.search(r'\n\s*' + M[k]['flag']['m'] + r'\(g,c', s), 'unknown emblem ' + M[k]['flag']['m']
# 6. US map dots (Albers fit from existing dots)
p1, p2, l0, f0 = map(math.radians, (29.5, 45.5, -96, 37.5)); n = (math.sin(p1) + math.sin(p2)) / 2; Cc = math.cos(p1) ** 2 + 2 * n * math.sin(p1); r0 = math.sqrt(Cc - 2 * n * math.sin(f0)) / n
def prj(lon, lat):
    l, f = math.radians(lon), math.radians(lat); r = math.sqrt(Cc - 2 * n * math.sin(f)) / n; t = n * (l - l0); return r * math.sin(t), -(r0 - r * math.cos(t))
ref = {'troy': (44.97, -92.72), 'caledonia': (33.45, -79.13), 'rossbridge': (33.35, -86.88), 'crsc': (31.90, -86.68), 'wilderness': (47.82, -92.35)}
i = s.index('const US_MAP='); j = s.index('}};', i) + 1; seg = s[i:j]; dots = json.loads(seg[seg.index('dots:') + 5:])
A = []; b = []
for k, (la, lo) in ref.items():
    X, Y = prj(lo, la); A += [[X, 1, 0], [Y, 0, 1]]; b += dots[k]
sc, tx, ty = np.linalg.lstsq(np.array(A), np.array(b, float), rcond=None)[0]
for k in keys:
    la, lo = M[k]['ll']; X, Y = prj(lo, la); dots[k] = [round(X * sc + tx), round(Y * sc + ty)]
s = s[:i] + seg[:seg.index('dots:') + 5] + json.dumps(dots, separators=(',', ':')) + s[j:]
# 7. daily rotation
rep("DAILY_POOL=[", "DAILY_POOL=[" + ''.join(f"['{k}',{int(M[k]['day'])}]," for k in keys))
# 8. home-screen pictures
i = s.index('const COURSE_IMG='); j = s.index('};', i) + 1; CI = json.loads(s[i + 17:j])
for k in keys:
    hp = G + f'auto/{k}/hero.json'
    if os.path.exists(hp): CI.update({kk: v for kk, v in json.load(open(hp)).items() if kk == k})
s = s[:i] + 'const COURSE_IMG=' + json.dumps(CI, separators=(',', ':')) + s[j:]
open(W + 'index.html', 'w').write(s)
def upd(f, var, add):
    t = open(W + 'base/' + f).read(); i = t.index('const ' + var + '='); j = t.find('\n', i); j = len(t) if j < 0 else j
    D = json.loads(t[i + len(var) + 7:j].rstrip().rstrip(';')); D.update(add)
    open(W + f, 'w').write(t[:i] + 'const ' + var + '=' + json.dumps(D, separators=(',', ':')) + ';' + t[j:])
upd('greens.js', 'LIDG', {k: json.load(open(G + f'lidar2/patches_{k}.json'))[k] for k in keys})
upd('ground.js', 'LIDW', {k: json.load(open(G + f'auto/{k}/wide_{k}.json')) for k in keys})
upd('trees.js', 'R3NAIP', {k: json.load(open(G + f'auto/{k}/naip_{k}.json')) for k in keys})
print('ok', keys, 'dots', {k: dots[k] for k in keys})
