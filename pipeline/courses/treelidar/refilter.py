"""Re-filter a measured-trees run without fetching again: python3 refilter.py <trees-data checkout> [key ...]
Reads <dir>/<key>/crowns.npz (every crown tree_all.py found, with the photo and lidar stats it filtered on) and rewrites
<dir>/<key>/L.json with the rules below (the same as tree_all.py's, plus any change made here first)."""
import numpy as np, json, os, sys, base64
YD = 1.09361
def rules(C):
    desert = bool(C['desert']); havep = C['L'] > 0; area, top, sd, exg, L = C['area'], C['h'], C['sd'], C['exg'], C['L']
    roof = havep & (exg < (0.0 if desert else 0.06)) & (L > 0.25) & (sd < 1.5)
    flat = (sd < 0.45) & (area > 40)
    wet = (C['gd'] > 8) & (exg < 0.1)          # no ground within 8 m and not green in the photo: over open water
    keep = ~roof & ~flat & ~wet & (area >= 8) & (top >= 3) & (top <= 45)
    if desert: keep &= ~havep | ((C['contrast'] > 0.03) & (top <= 16))
    return keep
D = sys.argv[1]; keys = sys.argv[2:] or sorted(k for k in os.listdir(D) if os.path.exists(os.path.join(D, k, 'crowns.npz')))
q = lambda a, t: base64.b64encode(np.ascontiguousarray(a).astype(t).tobytes()).decode()
for k in keys:
    C = dict(np.load(os.path.join(D, k, 'crowns.npz'))); keep = rules(C)
    xy = C['xy'][keep]; cr = C['cr'][keep] * YD; h = C['h'][keep] * YD; cb = C['cb'][keep] * YD; cn = C['con'][keep]
    old = json.load(open(os.path.join(D, k, 'L.json')))
    Lj = dict(n=int(keep.sum()), xy=q(np.round(xy * 2).clip(-32767, 32767), np.int16), r=q(np.minimum(127, np.round(cr * 10)) + cn * 128, np.uint8),
              h=q(np.minimum(255, np.round(h * 4)), np.uint8), cb=q(np.minimum(255, np.round(cb * 4)), np.uint8), scan=old.get('scan'))
    json.dump(Lj, open(os.path.join(D, k, 'L.json'), 'w')); print(k, old['n'], '->', Lj['n'])
