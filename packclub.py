"""club_bake output -> b10/club/<id>.js (int16 positions x200 round the clubhouse, sRGB colours, indices)"""
import sys, json, base64, numpy as np
src, dst, cid = sys.argv[1], sys.argv[2], sys.argv[3]
D = np.load(src)
P = D['tris'][:, :, :3].reshape(-1, 3).astype(np.float64); C = D['col'].reshape(-1, 3)
offc = D['offc']
Q = np.round(P * 200).astype(np.int32); assert np.abs(Q).max() < 32767, np.abs(Q).max()
Cb = np.round(np.clip(C, 0, 1) * 255).astype(np.int32)
u, inv = np.unique(np.concatenate([Q, Cb], 1), axis=0, return_inverse=True); inv = inv.ravel()
b = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
idx = inv.astype(np.uint16 if len(u) < 65536 else np.uint32)
o = {'id': cid, 's': 200, 'n': len(u), 'off': [round(float(x), 3) for x in offc], 'cx': round(float(offc[0]), 3), 'cy': round(float(offc[2]), 3),
     'pos': b(u[:, :3].astype(np.int16)), 'col': b(u[:, 3:].astype(np.uint8)), 'idx': b(idx)}
js = "/* Blender trial: %s clubhouse (the game's matched design + Blender window frames, sky light baked in Cycles) */\nwindow.B10CLUBS=window.B10CLUBS||{};B10CLUBS[%s]=%s;\n" % (cid, json.dumps(cid), json.dumps(o, separators=(',', ':')))
open(dst, 'w').write(js); print(cid, len(P) // 3, 'tris', len(u), 'verts', len(js) // 1024, 'KB')
