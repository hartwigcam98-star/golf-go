"""scenes/<course>/hNN.json (game exports) -> holes/<course>/hNN.npz (no tree arrays) + holes/<course>/protos.npz (shared)"""
import json, sys, os, glob, numpy as np
course, src, dst = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(dst, exist_ok=True)
PF = os.path.join(dst, 'protos.npz'); P = dict(np.load(PF)) if os.path.exists(PF) else {}
con = {'pine', 'spruce', 'redcedar', 'baldcypress', 'lpine'}
for f in sorted(glob.glob(os.path.join(src, 'h*.json'))):
    d = json.load(open(f))
    if not d or not isinstance(d, dict) or 'hg' not in d: os.remove(f); continue
    g = d['hg']; hg = np.array(g['data'], dtype=np.float32).reshape(g['ny'], g['nx'])
    A = {'hg': hg, 'hg_meta': np.array([g['nx'], g['ny'], g['st'], g['x0'], g['y0']], dtype=np.float64), 'bounds': np.array(d['bounds'], dtype=np.float64), 'sun': np.array(d['SUN'], dtype=np.float64)}
    keys = []
    for p in d['protos']:
        k = p['key'].replace('|', '~'); keys.append(p['key'])
        if k + '_bark' not in P:
            P[k + '_bark'] = np.array(p['bark'], np.float32).reshape(-1, 11); P[k + '_mass'] = np.array(p['mass'], np.float32).reshape(-1, 9); P[k + '_leaf'] = np.array(p['leaf'], np.float32).reshape(-1, 11)
    A['nproto'] = np.array([len(keys)]); A['proto_keys'] = np.array(keys)
    gp = []; M = []
    for gr in d['groups']:
        m = np.array(gr['M'], dtype=np.float32).reshape(-1, 16); M.append(m); gp += [gr['p']] * len(m)
    A['inst_p'] = np.array(gp, dtype=np.int32); A['inst_M'] = np.concatenate(M) if M else np.zeros((0, 16), np.float32)
    A['far'] = np.array([[t[0], t[1], t[2], t[3], 1 if t[4] in con else 0] for t in d['far']], dtype=np.float32).reshape(-1, 5)
    O = np.array(d['out']['pos'], dtype=np.float32).reshape(-1, 9)[:, :3].reshape(-1, 3, 3)
    ar = .5 * np.linalg.norm(np.cross(O[:, 1] - O[:, 0], O[:, 2] - O[:, 0]), axis=1)
    A['out'] = O[ar > .3].reshape(-1, 3)
    n = os.path.basename(f)[:-5]
    np.savez_compressed(os.path.join(dst, n + '.npz'), **A)
    json.dump({'b': d['bounds']}, open(os.path.join(dst, n + '.json'), 'w'))
    os.remove(f)
    print(course, n, 'trees', len(gp), 'bounds', d['bounds'], flush=True)
np.savez_compressed(PF, **P)
