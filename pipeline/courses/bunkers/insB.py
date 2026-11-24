"""Insert the measured bunkers (bunkers-data branch, from bunker_all.py) into the game: the BUNK line in src/bunkers.js (data/BUNK.js once tools/stamp.py has moved it).
usage: python3 insB.py <bunkers-data checkout> [key ...]   (no keys = every course in the checkout)
Courses with built faces (BK_FACE in the game) keep all 24 lips per bunker; the rest keep centroid, area and colour only
(their lips aren't used yet, and it keeps the download small). A colour the photo can't vouch for (green: grass or a
shadow over the outline; very dark) is written as -1."""
import json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(ROOT, 'src', 'bunkers.js')
D = sys.argv[1]; keys = sys.argv[2:] or sorted(k for k in os.listdir(D) if os.path.exists(os.path.join(D, k, 'bunkers.json')))
DAT = os.path.join(ROOT, 'data', 'BUNK.js')   # tools/stamp.py moves a long BUNK line out of src/ into data/
fm = re.search(r'^const BK_FACE=(\{.*?\});', open(SRC).read(), re.M)
if not re.search(r'^const BUNK=', open(SRC).read(), re.M) and os.path.exists(DAT): SRC = DAT
s = open(SRC).read()
m = re.search(r'^const BUNK=(\{.*?\});$', s, re.M); cur = json.loads(m.group(1)) if m else {}
faced = set(re.findall(r'(\w+):\{s:', fm.group(1))) if fm else set()
def ok_rgb(c):
    if not c: return False
    r, g, b = c
    return not (g > r + 6 or r + g + b < 240)
for k in keys:
    B = json.load(open(os.path.join(D, k, 'bunkers.json')))
    rows = []
    for r in B:
        c = r['rgb'] if ok_rgb(r.get('rgb')) else None
        row = [r['c'][0], r['c'][1], r['a']] + ([round(v) for v in c] if c else [-1, -1, -1])
        if k in faced: row += [r['fl'], r['st'], r['fd'][0], r['fd'][1]] + r['lip']
        rows.append(row)
    cur[k] = rows; print(k, len(rows), 'bunkers', sum(1 for x in rows if x[3] >= 0), 'with colour', 'lips' if k in faced else '')
line = 'const BUNK=' + json.dumps(cur, separators=(',', ':')) + ';'
if m: s = s[:m.start()] + line + s[m.end():]
else: raise SystemExit('no BUNK line')
open(SRC, 'w').write(s); print('BUNK', len(line), 'chars')
