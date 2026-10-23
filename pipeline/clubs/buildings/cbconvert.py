"""Clubhouse job results (bld/cb/cb_<key>.json) merged into bld/bldx.json:
   club -> an 'a' entry of kind 'club', extra buildings -> 'a' entries, parking lots -> 'p' (course yd).
usage: python3 convert.py ; python3 cbconvert.py ; python3 ship_bldx.py"""
import json, math, os, sys, glob, numpy as np, cv2
sys.argv = sys.argv[:1]
B = '/home/claude/golf/bld/'; Q = '/home/claude/golf/qa/'
E = json.load(open(B + 'export.json')); XF = json.load(open('/home/claude/golf/naip/xf.json'))
YD = 1.0936
exec('def frame' + open(B + 'convert.py').read().split('def frame')[1].split('out = {}')[0])
X = json.load(open(B + 'bldx.json'))
def cen(r): return (sum(q[0] for q in r) / len(r), sum(q[1] for q in r) / len(r))
def area(r): return abs(sum(r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1] for i in range(len(r)))) / 2
tot = dict(club=0, extra=0, park=0)
# courses on one site share a clubhouse: one found from the map for a neighbour beats none (or a lidar guess) here
CLUBS = {}
for f in glob.glob(B + 'cb/cb_*.json'):
    c = json.load(open(f)).get('club')
    if c and c['src'] != 'lidar': CLUBS[f.split('cb_')[1][:-5]] = c
def borrow(k, own):
    toyd = frame(k)[0]; L = E[k]['lines']; st = [L[0][0], L[-1][-1]] + ([L[9][0], L[8][-1]] if len(L) >= 18 else [])
    best = None
    for k2, c in CLUBS.items():
        if k2 == k: continue
        ring = [toyd(lo, la) for lo, la in c['ring']]; cx, cy = cen(ring); d = min(math.hypot(cx - a[0], cy - a[1]) for a in st)
        if d < 450 and (best is None or d < best[0]): best = (d, dict(c, src=c['src'] + '-' + k2))
    return best[1] if best and (own is None or own['src'] == 'lidar') else own
FIXK = json.load(open(B + 'club_fix.json')) if os.path.exists(B + 'club_fix.json') else {}
for k in FIXK:
    if not os.path.exists(B + f'cb/cb_{k}.json'): json.dump({'club': None, 'parking': [], 'extra': []}, open(B + f'cb/cb_{k}.json', 'w'))
for f in sorted(glob.glob(B + 'cb/cb_*.json')):
    k = f.split('cb_')[1][:-5]
    if k not in E: continue
    R = json.load(open(f)); toyd, toll = frame(k)
    photo = Q + f'photos/naip_{k}.jpg'; P = cv2.imread(photo) if os.path.exists(photo) else None
    if P is not None:
        M = json.load(open(Q + f'photos/naip_{k}.json')); W_, S_, E_, N_ = M['ext']; Hh, Ww = P.shape[:2]
    def colour(ring):
        if P is None: return None
        pts = []
        for x, y in ring:
            lo, la = toll(x, y); pts.append(((lo - W_) / (E_ - W_) * Ww, (N_ - la) / (N_ - S_) * Hh))
        pts = np.array(pts); c = pts.mean(0); pts = c + (pts - c) * .85
        m = np.zeros(P.shape[:2], np.uint8); cv2.fillPoly(m, [np.round(pts).astype(np.int32)], 1); v = P[m > 0]
        if len(v) < 3: return None
        b, g, r = [float(np.median(v[:, i])) for i in range(3)]
        if (2 * g - r - b) / max(r + g + b, 1) > 0.06: return None
        return (int(r) << 16) | (int(g) << 8) | int(b)
    def rec(r, ring):
        if not r: return None
        eave, rise, roof, ang = r[0] * YD, r[1] * YD, r[2], r[3]
        if eave < 2.0 or eave > 30: return None
        return [round(eave, 1), caprise(min(rise, 0.9 * eave + 3), ring, roof), roof, round(math.degrees(ang) % 180, 1), colour(ring)]
    D = json.load(open(Q + f'dump/{k}.json')) if os.path.exists(Q + f'dump/{k}.json') else None
    mown = [p for t in ('fairway', 'green', 'tee', 'bunker', 'water') for p in (D['polys'].get(t, []) if D else [])]
    o = X.setdefault(k, dict(c={}, b={}, a=[]))
    o['a'] = [a for a in o['a'] if a[2] not in ('club',) and not (len(a) > 3 and a[3] == 'cb')]   # re-runs replace earlier merges
    def clash(ring):
        c = cen(ring)
        return [i for i, a in enumerate(o['a']) if inpoly(a[0], *c) or inpoly(ring, *cen(a[0]))]
    R['club'] = borrow(k, R.get('club'))
    FIX = json.load(open(B + 'club_fix.json')) if os.path.exists(B + 'club_fix.json') else {}
    if k in FIX:   # traced by hand from the aerial photo where the job picked the wrong building (Caledonia: a house, not the clubhouse by 18)
        R['club'] = dict(ring=FIX[k]['ring'], src='osm-tag-fix', name=FIX[k].get('name', ''), fixrec=FIX[k]['rec'])
        if FIX[k].get('nc'): o['nc'] = 1   # the course map's own 'clubhouse' outlines are other buildings
        for e in FIX[k].get('extra', []):   # buildings traced alongside (e.g. Ross Bridge's ballroom wing)
            o['a'].append([[list(map(lambda v: round(v, 1), toyd(lo, la))) for lo, la in e['ring']], e['rec'], 'building', 'cb'])
    if R.get('club'):
        ring = [list(map(lambda v: round(v, 1), toyd(lo, la))) for lo, la in R['club']['ring']]
        if R['club']['src'].endswith('-fix') or not any(inpoly(p, *cen(ring)) for p in mown):   # hand-checked fixes win over map sand/fairway (Lido sits in a mapped waste area)
            for i in sorted(clash(ring), reverse=True): o['a'].pop(i)
            big = R['club']['src'].startswith('osm') and not R['club']['src'].startswith('osm-tag') and area(ring) > 5000   # a hotel or casino beside the course: a plain building
            o['a'].append([ring, R['club'].get('fixrec') or rec(R['club'].get('rec'), ring), 'building' if big else 'club']); tot['club'] += not big
            print(k, 'club', R['club']['src'], R['club'].get('name', ''), round(area(ring)), 'sq yd', o['a'][-1][1])
    for e in R.get('extra', []):
        ring = [list(map(lambda v: round(v, 1), toyd(lo, la))) for lo, la in e['ring']]
        if any(inpoly(p, *cen(ring)) for p in mown) or clash(ring): continue
        r = rec(e.get('rec'), ring)
        if not r: continue
        A = e.get('area', 0); kind = 'shack' if A < 55 else ('barn' if r[2] == 0 and A > 200 and A < 900 else 'building')
        o['a'].append([ring, r, kind, 'cb']); tot['extra'] += 1
    o['p'] = [[[round(v, 1) for v in toyd(lo, la)] for lo, la in ring] for ring in R.get('parking', [])]
    tot['park'] += len(o['p'])
json.dump(X, open(B + 'bldx.json', 'w'), separators=(',', ':')); print(tot)
