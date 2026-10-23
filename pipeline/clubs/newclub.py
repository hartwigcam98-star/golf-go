"""The clubhouse of a new course (nightly build, RUNBOOK step 6b). Run from /home/claude/golf.

  python3 clubs/newclub.py find <key> run_<key> /tmp/<key>_club.jpg
      Lists clubhouse candidates in course yards: the map's golf=clubhouse outlines first, then the buildings
      near the 1st tee and the 9th/18th greens (largest first). Draws them, numbered, over the aerial photo round
      those holes. Look at the picture and pick the real clubhouse (the photos from the extras job help).
  python3 clubs/newclub.py pick <key> <n>  [--ring '[[x,y],...]']
      Records candidate n (or a ring you traced on the photo, course yards) as the clubhouse in
      pipeline/courses/extras/<key>.json and prints the "club" block for the extras job request
      (lat, lon, radius; add "pref" from the course fetch's lidar project). If the map had no golf=clubhouse
      outline, the building also becomes a BLDX clubhouse entry so the game draws it as the clubhouse.
"""
import json, math, os, sys
import numpy as np
G = '/home/claude/golf/'
EX = '/home/claude/golf-go/pipeline/courses/extras/'

def load(key):
    C = json.load(open(f'{G}auto/{key}/{key}_course.json')); S = json.load(open(f'{G}auto/{key}/{key}_surr.json'))
    return C, S

def area(P):
    return abs(sum(P[i - 1][0] * P[i][1] - P[i][0] * P[i - 1][1] for i in range(len(P)))) / 2

def cen(P):
    return [sum(q[0] for q in P) / len(P), sum(q[1] for q in P) / len(P)]

def candidates(key):
    C, S = load(key); H = C['holes']
    spots = [('tee 1', H[0]['line'][0]), ('green 18', H[-1]['line'][-1])] + ([('green 9', H[8]['line'][-1]), ('tee 10', H[9]['line'][0])] if len(H) >= 10 else [])
    out = []
    for P in C['polys'].get('clubhouse', []):
        out.append(dict(src='map clubhouse', pts=P))
    for P, hgt in S.get('bld', []):
        out.append(dict(src='map building', pts=P, hgt=hgt))
    for c in out:
        c['area'] = round(area(c['pts'])); c['c'] = [round(v, 1) for v in cen(c['pts'])]
        c['near'] = min((round(math.hypot(c['c'][0] - p[0], c['c'][1] - p[1])), n) for n, p in spots)
    out = [c for c in out if c['src'] == 'map clubhouse' or (c['near'][0] < 350 and c['area'] > 150)]
    out.sort(key=lambda c: (c['src'] != 'map clubhouse', -c['area'] / (1 + c['near'][0] / 120)))
    return C, out[:12], spots

def find(key, run, img):
    C, cs, spots = candidates(key)
    for i, c in enumerate(cs):
        print(f"{i:2d} {c['src']:14s} area {c['area']:6d} sq yd  centre {c['c']}  {c['near'][0]} yd from {c['near'][1]}")
    if not cs: print('no candidates: trace the clubhouse on the photo (draw.py window round the 1st tee) and use pick --ring')
    try:
        import cv2
        R = run.rstrip('/') + '/'; X = np.array(json.load(open(f'{G}naip/xf.json'))[key]) if os.path.exists(f'{G}naip/xf.json') and key in json.load(open(f'{G}naip/xf.json')) else None
        meta = json.load(open(f'{R}naip_{key}.json')); W, Sb, E, N = meta['ext']; im = cv2.imread(f'{R}naip_{key}.jpg'); h, w = im.shape[:2]
        lat0, lon0 = C['origin']; K = math.cos(math.radians(lat0)) * 111320 * 1.0936; L = 110574 * 1.0936
        pts = np.array([c['c'] for c in cs] + [p for _, p in spots]); res = 0.4
        xa, ya = pts.min(0) - 60; xb, yb = pts.max(0) + 60
        if (xb - xa) / res > 2400: res = (xb - xa) / 2400
        nx = int((xb - xa) / res); ny = int((yb - ya) / res); GX, GY = np.meshgrid(xa + np.arange(nx) * res, ya + np.arange(ny) * res)
        if X is not None:
            LL = np.stack([GX - X[2][0], GY - X[2][1]], -1) @ np.linalg.inv(X[:2, :2]); lon, lat = LL[..., 0], LL[..., 1]
        else:
            lon = lon0 + GX / K; lat = lat0 - GY / L
        px = ((lon - W) / (E - W) * w).astype(np.float32); py = ((N - lat) / (N - Sb) * h).astype(np.float32)
        I = cv2.remap(im, px, py, cv2.INTER_LINEAR); P = lambda q: (int((q[0] - xa) / res), int((q[1] - ya) / res))
        for hh in C['holes']:
            cv2.polylines(I, [np.array([P(q) for q in hh['line']], np.int32)], False, (0, 0, 255), 1)
        for n, p in spots: cv2.circle(I, P(p), 6, (0, 255, 255), 2); cv2.putText(I, n, (P(p)[0] + 8, P(p)[1]), 0, .5, (0, 255, 255), 1)
        for i, c in enumerate(cs):
            cv2.polylines(I, [np.array([P(q) for q in c['pts']], np.int32)], True, (0, 255, 0) if c['src'] == 'map clubhouse' else (255, 255, 0), 2)
            q = P(c['c']); cv2.putText(I, str(i), q, 0, .8, (0, 0, 0), 4); cv2.putText(I, str(i), q, 0, .8, (255, 255, 255), 2)
        cv2.imwrite(img, I, [cv2.IMWRITE_JPEG_QUALITY, 85]); print('picture', img, I.shape[1], 'x', I.shape[0], f'({res:.2f} yd/px, course yd = ({xa:.0f}+px*{res:.2f}, {ya:.0f}+py*{res:.2f}))')
    except Exception as e:
        print('no picture:', e)

def obb(P):
    best = None
    for i in range(len(P)):
        a = math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]); ca, sa = math.cos(a), math.sin(a)
        us = [q[0] * ca + q[1] * sa for q in P]; vs = [-q[0] * sa + q[1] * ca for q in P]
        ar = (max(us) - min(us)) * (max(vs) - min(vs))
        if best is None or ar < best[0]: best = (ar, a, max(us) - min(us), max(vs) - min(vs))
    return best

def pick(key, n, ring=None):
    C, cs, _ = candidates(key)
    if ring is None:
        c = cs[n]; P = c['pts']; mapped = c['src'] == 'map clubhouse'
    else:
        P = ring; mapped = False
    os.makedirs(EX, exist_ok=True); f = EX + key + '.json'
    E = json.load(open(f)) if os.path.exists(f) else {}
    _, ang, Lu, Lv = obb(P); short = min(Lu, Lv)
    rec = [4.0, round(min(4.5, 0.22 * short), 1), 2, round(math.degrees(ang if Lu >= Lv else ang + math.pi / 2) % 180, 1), 9474192]
    E['club'] = dict(pts=[[round(q[0], 1), round(q[1], 1)] for q in P], mapped=mapped)
    if not mapped:
        E.setdefault('bldx', {}); E['bldx']['a'] = [[E['club']['pts'], rec, 'club']]
    lat0, lon0 = C['origin']; K = math.cos(math.radians(lat0)) * 111320 * 1.0936; L = 110574 * 1.0936; cx, cy = cen(P)
    req = dict(lat=round(lat0 - cy / L, 7), lon=round(lon0 + cx / K, 7), R=int(max(80, math.hypot(Lu, Lv) / 1.0936 / 2 + 45)))
    E['club']['req'] = req
    json.dump(E, open(f, 'w'), indent=1)
    # the block-modelling kit's inventory entry (bk.py prep reads clubs/inv.json)
    inv_f = G + 'clubs/inv.json'; inv = json.load(open(inv_f)) if os.path.exists(inv_f) else {}
    inv[key] = dict(geo=dict(origin=C['origin']), main=dict(src='map' if mapped else 'bldx', pts=E['club']['pts'], area=round(area(P), 1), c=[round(v, 1) for v in cen(P)]))
    json.dump(inv, open(inv_f, 'w'))
    print('clubhouse recorded in', f, '(BLDX clubhouse entry added)' if not mapped else '(map clubhouse)')
    print('club request:', json.dumps(req), '-> add "pref":[<lidar project from summary.json>]')

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'find': find(a[1], a[2], a[3])
    elif a[0] == 'pick':
        ring = json.loads(a[a.index('--ring') + 1]) if '--ring' in a else None
        pick(a[1], int(a[2]) if a[2] != '--ring' else 0, ring)
