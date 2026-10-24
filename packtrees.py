"""trees.npz (+ optional baked colours trees_col.npz) -> b10/trees.js for the game"""
import sys, json, base64, numpy as np
src, dst = sys.argv[1], sys.argv[2]
col = np.load(sys.argv[3]) if len(sys.argv) > 3 else None
D = np.load(src); meta = json.load(open(src.replace('.npz', '.json')))
b = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
out = {}
for key in meta:
    e = {'trunkN': meta[key]['trunkN'], 'snag': 1 if meta[key].get('snag') else 0}
    for kind, us in (('bark', 100), ('mass', 0), ('leaf', 30000)):
        A = D['%s|%s' % (key, kind)].astype(np.float64)
        if col is not None and ('%s|%s' % (key, kind)) in col.files: A[:, 6:9] = col['%s|%s' % (key, kind)]
        if len(A) == 0: e[kind] = {'n': 0, 'P': '', 'N': '', 'C': ''}; continue
        r = {'n': len(A), 'P': b(np.round(A[:, :3] * 1000).astype(np.int16)), 'N': b(np.round(np.clip(A[:, 3:6], -1, 1) * 127).astype(np.int8)),
             'C': b(np.round(np.clip(A[:, 6:9], 0, 1) * 255).astype(np.uint8))}
        if us: r['U'] = b(np.round(A[:, 9:11] * us).astype(np.int16)); r['us'] = us
        e[kind] = r
    out[key] = e
js = "/* Broadleaf trees grown in Python (space colonisation) with light baked in Blender Cycles: Troy Burne hole 10 trial (b10). */\nwindow.B10TREES=" + json.dumps(out, separators=(',', ':')) + ";\n"
open(dst, 'w').write(js); print(dst, len(js))
