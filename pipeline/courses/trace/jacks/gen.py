"""trace.json -> overlay picture + hole lengths + OSM ways (run_jacks_t/osm_jacks.json).
usage: python3 gen.py [overlay.jpg] [scale]"""
import json, math, sys, os, shutil, cv2, numpy as np
T = json.load(open('/home/claude/golf/trace/trace.json'))
N = json.load(open('/home/claude/golf/run_jacks/naip_jacks.json')); W, H = N['size']; e = N['ext']
lat0 = (e[1] + e[3]) / 2
YX = (e[2] - e[0]) / W * math.cos(math.radians(lat0)) * 111320 * 1.0936   # yd per px in x
YY = (e[3] - e[1]) / H * 110574 * 1.0936 * 1.005                          # yd per px in y
YY = (e[3] - e[1]) / H * 111132 * 1.0936
def ll(p): return (e[0] + (p[0] + .5) * (e[2] - e[0]) / W, e[3] - (p[1] + .5) * (e[3] - e[1]) / H)
def toY(p): return (p[0] * YX, p[1] * YY)
def toP(q): return (q[0] / YX, q[1] / YY)
def ellipse(cx, cy, rx, ry, ang, n=28):
    c = toY((cx, cy)); a = math.radians(ang)
    return [toP((c[0] + rx * math.cos(t) * math.cos(a) - ry * math.sin(t) * math.sin(a),
                 c[1] + rx * math.cos(t) * math.sin(a) + ry * math.sin(t) * math.cos(a))) for t in np.linspace(0, 2 * math.pi, n, endpoint=False)]
def rect(cx, cy, L, Wd, dirv):
    c = toY((cx, cy)); ux, uy = dirv; vx, vy = -uy, ux
    return [toP((c[0] + sx * L / 2 * ux + sy * Wd / 2 * vx, c[1] + sx * L / 2 * uy + sy * Wd / 2 * vy)) for sx, sy in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
def corridor(nodes):
    P = [toY((x, y)) for x, y, w in nodes]; Wd = [w for x, y, w in nodes]
    L, R = [], []
    for i, p in enumerate(P):
        a = P[max(i - 1, 0)]; b = P[min(i + 1, len(P) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy) or 1; nx, ny = -dy / l, dx / l
        L.append((p[0] + nx * Wd[i], p[1] + ny * Wd[i])); R.append((p[0] - nx * Wd[i], p[1] - ny * Wd[i]))
    # round the ends
    def cap(p, q, w, rev):
        dx, dy = p[0] - q[0], p[1] - q[1]; l = math.hypot(dx, dy) or 1; ux, uy = dx / l, dy / l
        pts = []
        for t in np.linspace(-math.pi / 2, math.pi / 2, 7):
            pts.append((p[0] + w * (ux * math.cos(t) - uy * math.sin(t)) * 0.8 + 0, p[1] + w * (uy * math.cos(t) + ux * math.sin(t)) * 0.8))
        return pts
    end = cap(P[-1], P[-2], Wd[-1], 0); start = cap(P[0], P[1], Wd[0], 0)
    ring = L + end[::-1] + R[::-1] + start[::-1]
    # make consistent: simple polygon via convex-ish ordering is not guaranteed; accept
    return [toP(q) for q in ring]
def ylen(line): return sum(math.hypot((b[0] - a[0]) * YX, (b[1] - a[1]) * YY) for a, b in zip(line, line[1:]))
card = json.load(open('/home/claude/golf/auto/jacks/scorecard.json'))['card']
feats = []  # (kind, ring_px, tags)
tot = 0
for ref, h in T['holes'].items():
    line = h['line']; L = ylen(line); tot += L
    c = card[int(ref) - 1]
    print(f"hole {ref:>2} par {h['par']} line {L:5.0f} card {c[2]}  {L - c[2]:+5.0f}  ({L / c[2] * 100:3.0f}%)")
    feats.append(('hole', line, {'golf': 'hole', 'ref': ref, 'par': str(h['par'])}))
    feats.append(('green', ellipse(*h['green']), {'golf': 'green'}))
    for b in h['bunkers']: feats.append(('bunker', ellipse(*b, n=14), {'golf': 'bunker'}))
    for i, t in enumerate(h['tees']):
        a = toY(line[0]); b = toY(line[1]); dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy)
        feats.append(('tee', rect(t[0], t[1], t[2], t[3], (dx / l, dy / l)), {'golf': 'tee'}))
    if h['fairway']: feats.append(('fairway', corridor(h['fairway']), {'golf': 'fairway'}))
for p in T.get('ponds', []): feats.append(('pond', p, {'natural': 'water', 'golf': 'water_hazard'}))
print('total', round(tot), 'card', sum(c[2] for c in card), f"{tot / sum(c[2] for c in card) * 100:.1f}%")
if len(sys.argv) > 1:
    im = cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg')
    col = {'hole': (0, 0, 255), 'green': (0, 255, 0), 'bunker': (255, 255, 255), 'tee': (255, 0, 255), 'fairway': (0, 255, 255), 'pond': (255, 128, 0)}
    for k, r, t in feats:
        pts = np.array([[int(x), int(y)] for x, y in r], np.int32)
        cv2.polylines(im, [pts], k != 'hole', col[k], 2)
        if k == 'hole':
            cv2.putText(im, t['ref'], (pts[0][0] - 10, pts[0][1] + 25), 0, 1.0, (0, 0, 255), 3)
    rg = T.get('range')
    if rg: cv2.polylines(im, [np.array(rg['P'], np.int32)], True, (255, 255, 0), 2)
    sc = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
    if len(sys.argv) > 3:
        x0, y0, x1, y1 = map(int, sys.argv[3:7]); im = im[y0:y1, x0:x1]
    cv2.imwrite(sys.argv[1], cv2.resize(im, None, fx=sc, fy=sc), [cv2.IMWRITE_JPEG_QUALITY, 85])
# OSM output
src = '/home/claude/golf/run_jacks'; dst = '/home/claude/golf/run_jacks_t'
if not os.path.exists(dst): shutil.copytree(src, dst)
O = json.load(open(src + '/osm_jacks.json'))
nid = 9_000_000_000
for k, r, t in feats:
    nid += 1
    g = [ll(p) for p in r]
    if k != 'hole': g = g + [g[0]]
    O['elements'].append({'type': 'way', 'id': nid, 'geometry': [{'lat': round(b, 7), 'lon': round(a, 7)} for a, b in g], 'tags': t})
json.dump(O, open(dst + '/osm_jacks.json', 'w'))
# range in course yards is written later (needs the course origin)
json.dump({'YX': YX, 'YY': YY}, open('/home/claude/golf/trace/scale.json', 'w'))
