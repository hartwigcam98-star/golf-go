"""Golf Go measured bunkers, one course per run (GitHub Actions, bunkers.yml): python bunker_all.py <key> cfg_trees.json
For every mapped bunker: its sand colour from the NAIP photo and the shape of its edge from the lidar ground, so the game's
sand types and bunker faces come from the course itself rather than a guess.
Out: out/<key>/bunkers.json, summary.json, prev.jpg (photo crops, each bunker's edge coloured by lip height).

Per bunker (course yards):
  c     centroid [x, y]
  a     area (sq yd)
  rgb   median photo colour inside (eroded 1.5 m), 0-255
  fl    floor depth: rim median minus floor median (cm)
  lip   rim height above the floor at 24 points round the edge, evenly spaced along it, starting at the vertex nearest
        due north (-y) and running in outline order (cm); rim = highest ground 0.5-3 m outside the edge
  st    steepest edge slope (deg), from 1.5 m inside to 1 m outside
  fd    face direction: unit vector (outward) toward the high side, weighted by how much each point stands above the median
  n     ground returns used (a low count = a guess)
"""
import json, math, os, sys, time
import numpy as np, cv2
from scipy import ndimage as ndi
from concurrent.futures import ProcessPoolExecutor, as_completed
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'treelidar'))
KEY = sys.argv[1]
sys.argv = [sys.argv[0], KEY, sys.argv[2]]
import tree_all as T   # the scan picker, EPT reader, NAIP fetch and course <-> UTM transforms
CFG = T.CFG; OUT = f'out/{KEY}'; os.makedirs(OUT, exist_ok=True)
SUM = {'key': KEY, 'started': time.strftime('%Y-%m-%d %H:%M:%S'), 'errors': []}
def save(): json.dump(SUM, open(f'{OUT}/summary.json', 'w'), indent=1)
log = T.log; YD = 1.09361; TS = 250.0

def gtile(res, epsg, ux0, uy0):
    """ground returns only (class 2) over one 250 m tile"""
    import pdal, tempfile
    td = f'/tmp/pd{os.getpid()}'; os.makedirs(td, exist_ok=True); os.environ['TMPDIR'] = td; tempfile.tempdir = td
    from pyproj import Transformer
    tf = Transformer.from_crs(epsg, 3857, always_xy=True)
    xs, ys = tf.transform([ux0 - 5, ux0 + TS + 5, ux0 - 5, ux0 + TS + 5], [uy0 - 5, uy0 - 5, uy0 + TS + 5, uy0 + TS + 5])
    spec = [{'type': 'readers.ept', 'filename': T.EPT % res, 'bounds': f'([{min(xs):.2f},{max(xs):.2f}],[{min(ys):.2f},{max(ys):.2f}])', 'threads': 4},
            {'type': 'filters.range', 'limits': 'Classification[2:2]'},
            {'type': 'filters.reprojection', 'in_srs': 'EPSG:3857', 'out_srs': f'EPSG:{epsg}'}]
    for k in range(6):
        try:
            p = pdal.Pipeline(json.dumps(spec)); p.execute(); a = p.arrays[0] if p.arrays else None; break
        except Exception as e:
            if k == 5: raise
            time.sleep(4 * (k + 1))
    if a is None or len(a) == 0: return ux0, uy0, None
    X = np.asarray(a['X']); Y = np.asarray(a['Y']); m = (X >= ux0) & (X < ux0 + TS) & (Y >= uy0) & (Y < uy0 + TS)
    return ux0, uy0, (X[m], Y[m], np.asarray(a['Z'])[m].astype(np.float32))

def resample(P, n):
    """n points evenly spaced along a closed outline, starting at the vertex nearest due north (smallest y)"""
    P = np.asarray(P, float); i0 = int(np.argmin(P[:, 1])); P = np.roll(P, -i0, 0)
    Q = np.vstack([P, P[:1]]); seg = np.hypot(*np.diff(Q, axis=0).T); L = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, L[-1], n, endpoint=False); x = np.interp(t, L, Q[:, 0]); y = np.interp(t, L, Q[:, 1])
    return np.stack([x, y], -1)

def main():
    b = CFG['bbox']; RES = 1.0   # metres per cell (0.5 m blew the runner's memory on the big resorts)
    xs, ys = T.LL2U.transform([b[0], b[2], b[0], b[2]], [b[1], b[1], b[3], b[3]])
    gx0, gy0 = math.floor(min(xs)), math.floor(min(ys)); gx1, gy1 = math.ceil(max(xs)), math.ceil(max(ys))
    gx1 = gx0 + int(math.ceil((gx1 - gx0) / TS) * TS); gy1 = gy0 + int(math.ceil((gy1 - gy0) / TS) * TS)
    w, h = int((gx1 - gx0) / RES), int((gy1 - gy0) / RES)
    BK = [np.array(P, float) for P in CFG['bunker'] if len(P) >= 4]
    SUM['bunkers'] = len(BK)
    # tiles that hold a bunker (plus 6 m round it)
    need = set()
    for P in BK:
        ux, uy = T.c2u(P[:, 0], P[:, 1]); ux, uy = np.asarray(ux), np.asarray(uy)
        for x_ in (ux.min() - 6, ux.max() + 6):
            for y_ in (uy.min() - 6, uy.max() + 6):
                need.add((gx0 + math.floor((x_ - gx0) / TS) * TS, gy0 + math.floor((y_ - gy0) / TS) * TS))
    jobs = sorted(need); SUM['tiles'] = len(jobs)
    res = T.pick_scan(gx0, gy1, gx1 - gx0, gy1 - gy0); SUM['scan'] = res; save()
    if not res: raise RuntimeError('no scan with ground over the course')
    zs = np.zeros((h, w), np.float32); zn = np.zeros((h, w), np.uint16); npts = 0
    def add(d):
        nonlocal npts
        X, Y, Z = d; ix = np.floor((X - gx0) / RES).astype(np.int64); iy = np.floor((gy1 - Y) / RES).astype(np.int64)
        k = (ix >= 0) & (iy >= 0) & (ix < w) & (iy < h); np.add.at(zs, (iy[k], ix[k]), Z[k]); np.add.at(zn, (iy[k], ix[k]), 1); npts += int(k.sum())
    failed = []
    with ProcessPoolExecutor(3) as ex:
        fs = {ex.submit(gtile, res, T.EPSG, ux, uy): (ux, uy) for ux, uy in jobs}
        for f in as_completed(fs):
            try: _, _, d = f.result()
            except Exception as e: failed.append(fs[f]); log('tile fail (retry)', e); continue
            if d is not None: add(d)
    for ux, uy in failed:
        try:
            _, _, d = gtile(res, T.EPSG, ux, uy)
            if d is not None: add(d)
        except Exception as e: SUM['errors'].append(f'tile {ux},{uy}: {e}'[:300])
    SUM['points'] = npts; save(); log('ground points', npts)
    have = zn > 0
    g = np.where(have, zs / np.maximum(zn, 1), np.nan).astype(np.float32)
    # fill small holes (no return in a cell) from the nearest return, then a light smooth (0.5 m)
    idx = ndi.distance_transform_edt(~have, return_distances=True, return_indices=True)
    dist, ind = idx; gf = g[tuple(ind)]; gf = ndi.gaussian_filter(gf, .6); del ind
    far = dist > 3   # more than 3 m from any return: no data
    # ---- photo on the same grid (0.6 m NAIP, averaged to 1 m)
    ph = np.zeros((h, w, 3), np.uint8)
    try:
        jj, ii = np.mgrid[0:h, 0:w]; lon, la = T.U2LL.transform(gx0 + (ii + .5) * RES, gy1 - (jj + .5) * RES)
        lat = (b[1] + b[3]) / 2; W_m = (b[2] - b[0]) * 111320 * math.cos(math.radians(lat)); H_m = (b[3] - b[1]) * 110574
        nx_, ny_ = max(1, math.ceil(W_m / .6 / 4000)), max(1, math.ceil(H_m / .6 / 4000))
        for a_ in range(nx_):
            for c_ in range(ny_):
                pb = [b[0] + (b[2] - b[0]) * a_ / nx_, b[1] + (b[3] - b[1]) * c_ / ny_, b[0] + (b[2] - b[0]) * (a_ + 1) / nx_, b[1] + (b[3] - b[1]) * (c_ + 1) / ny_]
                pw = int(W_m / nx_ / .6); phh = int(H_m / ny_ / .6)
                img, e = T.naip_piece(pb, [min(4000, pw), min(4000, phh)]); hh, ww = img.shape[:2]
                px = ((lon - e[0]) / (e[2] - e[0]) * ww - .5).astype(np.float32); py = ((e[3] - la) / (e[3] - e[1]) * hh - .5).astype(np.float32)
                s_ = cv2.remap(img, px, py, cv2.INTER_LINEAR, borderValue=(0, 0, 0)); ok = (s_.sum(-1) > 0) & (ph.sum(-1) == 0); ph[ok] = s_[ok]
        del jj, ii, lon, la
        SUM['photo'] = float((ph.sum(-1) > 0).mean())
    except Exception as e: SUM['errors'].append(f'naip: {e}'[:300]); log('naip fail', e)
    def smp(img, ux, uy, order=1):
        return ndi.map_coordinates(img, [(gy1 - np.asarray(uy, float)) / RES - .5, (np.asarray(ux, float) - gx0) / RES - .5], order=order, mode='nearest')
    # ---- registration (lidar = map + d): the shift that sinks the mapped bunkers deepest, as tree_all
    ins, outs = [], []
    for P in BK:
        x0_, y0_ = P.min(0) - 4; x1_, y1_ = P.max(0) + 4
        gx_, gy_ = np.meshgrid(np.arange(x0_, x1_, .5), np.arange(y0_, y1_, .5))
        m_ = np.zeros(gx_.shape, np.uint8); cv2.fillPoly(m_, [((P - [x0_, y0_]) / .5).astype(np.int32)], 1); dil = cv2.dilate(m_, np.ones((13, 13), np.uint8))
        if m_.sum() < 4: continue
        ins.append(T.c2u(gx_[m_ > 0], gy_[m_ > 0])); outs.append(T.c2u(gx_[(dil > 0) & (m_ == 0)], gy_[(dil > 0) & (m_ == 0)]))
    def depth(dx, dy):
        r = [smp(gf, ix_ + dx, iy_ + dy).mean() - smp(gf, ox_ + dx, oy_ + dy).mean() for (ix_, iy_), (ox_, oy_) in zip(ins, outs)]
        return float(np.mean(r))
    best = (0., 0.); rr = {best: depth(0, 0) if ins else 0}
    if len(ins) >= 5:
        step = 1.0
        for it in range(3):
            cand = [(best[0] + i * step, best[1] + j * step) for i in range(-3, 4) for j in range(-3, 4)]
            rr = {c: depth(*c) for c in cand}; best = min(rr, key=rr.get); step /= 2.5
        if abs(best[0]) > 6 or abs(best[1]) > 6 or rr[best] > -0.05: best = (0., 0.)
    SUM['reg'] = dict(shift_m=[round(best[0], 2), round(best[1], 2)], depth_m=round(rr.get(best, 0), 3)); save(); log('reg', SUM['reg'])
    dx, dy = best
    # ---- per bunker
    out = []; prev = []
    for P in BK:
        try:
            ctr = P.mean(0); area = abs(0.5 * np.sum(P[:, 0] * np.roll(P[:, 1], -1) - np.roll(P[:, 0], -1) * P[:, 1]))
            # interior cells (course yards, 0.5 yd), eroded 1.5 m for colour, 1 m for the floor
            x0_, y0_ = P.min(0) - 5; x1_, y1_ = P.max(0) + 5
            gx_, gy_ = np.meshgrid(np.arange(x0_, x1_, .5), np.arange(y0_, y1_, .5))
            m_ = np.zeros(gx_.shape, np.uint8); cv2.fillPoly(m_, [((P - [x0_, y0_]) / .5).astype(np.int32)], 1)
            if m_.sum() < 6: continue
            e1 = cv2.erode(m_, np.ones((5, 5), np.uint8)); e1 = e1 if e1.sum() >= 4 else m_
            e2 = cv2.erode(m_, np.ones((7, 7), np.uint8)); e2 = e2 if e2.sum() >= 4 else e1
            ux, uy = T.c2u(gx_[e1 > 0], gy_[e1 > 0]); ux, uy = np.asarray(ux) + dx, np.asarray(uy) + dy
            if far[np.clip(((gy1 - uy) / RES).astype(int), 0, h - 1), np.clip(((ux - gx0) / RES).astype(int), 0, w - 1)].mean() > .5: continue
            zin = smp(gf, ux, uy); floor = float(np.median(zin))
            ux2, uy2 = T.c2u(gx_[e2 > 0], gy_[e2 > 0]); ux2, uy2 = np.asarray(ux2) + dx, np.asarray(uy2) + dy
            col = [float(np.median(smp(ph[..., k].astype(np.float32), ux2, uy2, 0))) for k in (2, 1, 0)] if ph.any() else None
            # the edge: 24 points along it, outward normal from the outline's turning direction
            Q = resample(P, 48); sgn = 1 if np.sum(P[:, 0] * np.roll(P[:, 1], -1) - np.roll(P[:, 0], -1) * P[:, 1]) > 0 else -1
            tng = np.roll(Q, -1, 0) - np.roll(Q, 1, 0); nrm = np.stack([tng[:, 1], -tng[:, 0]], -1) * sgn; nrm /= np.maximum(np.hypot(*nrm.T), 1e-6)[:, None]
            # check the normal points outward (a point 1 yd along it is outside the outline)
            tp = Q[0] + nrm[0]; inside = cv2.pointPolygonTest(P.astype(np.float32), (float(tp[0]), float(tp[1])), False) > 0
            if inside: nrm = -nrm
            rim = []; slope = []
            for q, nv in zip(Q, nrm):
                ds = np.array([.5, 1, 1.5, 2, 2.5, 3]) * YD; pts = q + ds[:, None] * nv
                ox, oy = T.c2u(pts[:, 0], pts[:, 1]); zo = smp(gf, np.asarray(ox) + dx, np.asarray(oy) + dy); rim.append(float(zo.max()))
                a_ = q - 1.5 * YD * nv; b_ = q + 1.0 * YD * nv
                (ax, bx_), (ay, by_) = T.c2u(np.array([a_[0], b_[0]]), np.array([a_[1], b_[1]]))
                za, zb = smp(gf, np.array([ax, bx_]) + dx, np.array([ay, by_]) + dy); slope.append(math.degrees(math.atan2(zb - za, 2.5)))
            rim = np.array(rim); lip = rim - floor
            lip24 = lip.reshape(24, 2).mean(1)
            wgt = np.maximum(0, lip - np.median(lip)); fd = (nrm * wgt[:, None]).sum(0); fn = float(np.hypot(*fd))
            fd = (fd / fn).tolist() if fn > 1e-6 else [0, 0]
            nret = int(zn[np.clip(((gy1 - uy) / RES).astype(int), 0, h - 1), np.clip(((ux - gx0) / RES).astype(int), 0, w - 1)].sum())
            r = dict(c=[round(float(ctr[0]), 1), round(float(ctr[1]), 1)], a=round(float(area)), rgb=[round(v) for v in col] if col else None,
                     fl=round(100 * float(np.median(rim) - floor)), lip=[round(100 * float(v)) for v in lip24], st=round(float(max(slope)), 1),
                     fd=[round(v, 3) for v in fd], n=nret)
            out.append(r); prev.append((P, lip24))
        except Exception as e: SUM['errors'].append(f'bunker {P.mean(0).round(1).tolist()}: {e}'[:200])
    json.dump(out, open(f'{OUT}/bunkers.json', 'w'), separators=(',', ':'))
    if out:
        L = np.array([max(r['lip']) for r in out]); F = np.array([r['fl'] for r in out]); S_ = np.array([r['st'] for r in out])
        C = np.array([r['rgb'] for r in out if r['rgb']]) if any(r['rgb'] for r in out) else None
        SUM['measured'] = len(out); SUM['lip_max_cm'] = dict(p25=float(np.percentile(L, 25)), med=float(np.median(L)), p75=float(np.percentile(L, 75)), p95=float(np.percentile(L, 95)))
        SUM['floor_cm'] = dict(med=float(np.median(F)), p90=float(np.percentile(F, 90))); SUM['steep_deg'] = dict(med=float(np.median(S_)), p90=float(np.percentile(S_, 90)))
        if C is not None: SUM['rgb_med'] = [float(v) for v in np.median(C, 0)]
    save()
    # ---- preview: photo crops of the 12 deepest-lipped bunkers, each edge point coloured by lip (blue 0, red 1.5 m)
    try:
        if ph.any() and prev:
            order = np.argsort([-max(l) for _, l in prev])[:12]; tiles = []
            for i in order:
                P, l24 = prev[i]; c = P.mean(0); R_ = max(14, float(np.max(np.hypot(*(P - c).T))) + 8)
                gx_, gy_ = np.meshgrid(np.linspace(c[0] - R_, c[0] + R_, 240), np.linspace(c[1] - R_, c[1] + R_, 240))
                ux, uy = T.c2u(gx_.ravel(), gy_.ravel()); ux, uy = np.asarray(ux) + dx, np.asarray(uy) + dy
                im = np.stack([smp(ph[..., k].astype(np.float32), ux, uy).reshape(240, 240) for k in range(3)], -1).clip(0, 255).astype(np.uint8)
                Q = resample(P, 24); pts = ((Q - (c - R_)) / (2 * R_) * 240).astype(int)
                cv2.polylines(im, [pts.reshape(-1, 1, 2)], True, (255, 255, 255), 1)
                for p, v in zip(pts, l24):
                    k_ = min(1, max(0, v / 1.5)); cv2.circle(im, tuple(int(t) for t in p), 4, (int(255 * (1 - k_)), 40, int(255 * k_)), -1)
                cv2.putText(im, f'{max(l24) * 100:.0f}cm', (4, 14), cv2.FONT_HERSHEY_SIMPLEX, .45, (255, 255, 255), 1)
                tiles.append(im)
            while len(tiles) % 4: tiles.append(np.zeros_like(tiles[0]))
            grid = np.vstack([np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)]); cv2.imwrite(f'{OUT}/prev.jpg', grid, [cv2.IMWRITE_JPEG_QUALITY, 85])
    except Exception as e: SUM['errors'].append(f'prev: {e}'[:200])
    SUM['done'] = time.strftime('%Y-%m-%d %H:%M:%S'); save(); log('done', SUM.get('measured'))

if __name__ == '__main__':
    try: main()
    except Exception as e:
        import traceback; SUM['errors'].append(traceback.format_exc()[-800:]); save(); raise
