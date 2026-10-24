"""scene json from the game -> holes/hNN.npz for bake.py"""
import json, sys, numpy as np
src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src))
g = d['hg']; hg = np.array(g['data'], dtype=np.float32).reshape(g['ny'], g['nx'])
A = {'hg': hg, 'hg_meta': np.array([g['nx'], g['ny'], g['st'], g['x0'], g['y0']], dtype=np.float64), 'bounds': np.array(d['bounds'], dtype=np.float64), 'sun': np.array(d['SUN'], dtype=np.float64)}
for i, p in enumerate(d['protos']):
    A['p%d_bark' % i] = np.array(p['bark'], dtype=np.float32).reshape(-1, 11)
    A['p%d_mass' % i] = np.array(p['mass'], dtype=np.float32).reshape(-1, 9)
    A['p%d_leaf' % i] = np.array(p['leaf'], dtype=np.float32).reshape(-1, 11)
A['nproto'] = np.array([len(d['protos'])])
gp = []; M = []
for gr in d['groups']:
    m = np.array(gr['M'], dtype=np.float32).reshape(-1, 16); M.append(m); gp += [gr['p']] * len(m)
A['inst_p'] = np.array(gp, dtype=np.int32); A['inst_M'] = np.concatenate(M) if M else np.zeros((0, 16), np.float32)
con = {'pine', 'spruce', 'redcedar', 'baldcypress', 'lpine'}
A['far'] = np.array([[t[0], t[1], t[2], t[3], 1 if t[4] in con else 0] for t in d['far']], dtype=np.float32).reshape(-1, 5)
O = np.array(d['out']['pos'], dtype=np.float32).reshape(-1, 9)[:, :3].reshape(-1, 3, 3)
ar = .5 * np.linalg.norm(np.cross(O[:, 1] - O[:, 0], O[:, 2] - O[:, 0]), axis=1)
A['out'] = O[ar > .3].reshape(-1, 3)
np.savez_compressed(dst, **A)
print(dst, 'bounds', d['bounds'], 'trees', len(gp), 'scenery', len(A['out']) // 3)
