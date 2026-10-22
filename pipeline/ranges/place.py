"""A driving range by the clubhouse for a course whose range can't be found (no OSM range, nothing on the photo):
the nearest 280 x 90 yd strip to the clubhouse (midway between the 1st tee and the 18th green) that stays 35+ yd clear of every hole.
Writes it into pipeline/ranges/traced.json. usage: python3 pipeline/ranges/place.py <key> <path to auto/<key>/<key>_course.json>"""
import json, math, os, sys
key, cf = sys.argv[1], sys.argv[2]
L = [h['line'] for h in json.load(open(cf))['holes']]
c = [(L[0][0][0] + L[-1][-1][0]) / 2, (L[0][0][1] + L[-1][-1][1]) / 2]
segs = [(a, b) for l in L for a, b in zip(l, l[1:])]
def segd(p, a, b):
    vx, vy = b[0] - a[0], b[1] - a[1]; n = vx * vx + vy * vy or 1; t = max(0, min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / n))
    return math.hypot(a[0] + vx * t - p[0], a[1] + vy * t - p[1])
best = None
for r in range(20, 900, 15):
    for k in range(36):
        tx, ty = c[0] + r * math.cos(k * math.pi / 18), c[1] + r * math.sin(k * math.pi / 18)
        for k2 in range(24):
            th = k2 * math.pi / 12; u = (math.cos(th), math.sin(th)); p = (-u[1], u[0])
            m = min(segd((tx + u[0] * s + p[0] * o, ty + u[1] * s + p[1] * o), a, b) for s in range(0, 281, 20) for o in (-40, 0, 40) for a, b in segs)
            if m < 35: continue
            sc = r + max(0, 60 - m)
            if best is None or sc < best[0]: best = (sc, tx, ty, u, p, m, r)
    if best and r > best[6] + 60: break
if not best: sys.exit('no clear spot within 900 yd of the clubhouse')
_, tx, ty, u, p, m, r = best
pt = lambda s, o: [round(tx + u[0] * s + p[0] * o, 1), round(ty + u[1] * s + p[1] * o, 1)]
f = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'traced.json'); T = json.load(open(f))
T[key] = {'P': [pt(-5, -42), pt(-5, 42), pt(285, 48), pt(285, -48)], 't': pt(5, 0)}
json.dump(T, open(f, 'w')); print(key, 'range placed', r, 'yd from the clubhouse,', round(m), 'yd clear of the holes')
