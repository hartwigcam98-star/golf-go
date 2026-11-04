"""Golf Go measured trees, one course per run (GitHub Actions, trees.yml): python tree_all.py <key> cfg_trees.json
Lidar canopy + photo -> one tree per crown (treetop, height, crown radius, crown base) in course yards -> out/<key>/L.json
Steps: EPT points (newest scan that covers the course) -> 1 m canopy height (highest return above ground), ground,
2 m height profile; NAIP photo; lidar-to-map registration on the bunkers; treetops + watershed crowns; photo filters."""
import json, math, os, sys, time, traceback
import numpy as np, requests, cv2
from concurrent.futures import ProcessPoolExecutor, as_completed
from pyproj import Transformer
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
from skimage.segmentation import watershed
from skimage.feature import peak_local_max
KEY = sys.argv[1]; CFG = json.load(open(sys.argv[2]))[KEY]
OUT = f'out/{KEY}'; os.makedirs(OUT, exist_ok=True)
SUM = {'key': KEY, 'started': time.strftime('%Y-%m-%d %H:%M:%S'), 'errors': []}
def save(): json.dump(SUM, open(f'{OUT}/summary.json', 'w'), indent=1)
def log(*a): print(time.strftime('%H:%M:%S'), *a, flush=True)
EPT = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/%s/ept.json'
NB = 32; TS = 250.0; BUF = 15.0; YD = 1.09361
EPSG = CFG['epsg']; X = np.array(CFG['xf']); A = X[:2, :2]; T = X[2]; Ai = np.linalg.inv(A)
LL2U = Transformer.from_crs(4326, EPSG, always_xy=True); U2LL = Transformer.from_crs(EPSG, 4326, always_xy=True)
def c2u(cx, cy):
    ll = (np.stack([np.asarray(cx, float), np.asarray(cy, float)], -1) - T) @ Ai; return LL2U.transform(ll[..., 0], ll[..., 1])
def u2c(ux, uy):
    lon, lat = U2LL.transform(np.asarray(ux, float), np.asarray(uy, float)); return np.stack([lon, lat], -1) @ A + T

def read(res, epsg, ux0, uy0, w, h, buf, extra=None):
    import pdal
    tf = Transformer.from_crs(epsg, 3857, always_xy=True)
    xs, ys = tf.transform([ux0 - buf, ux0 + w + buf, ux0 - buf, ux0 + w + buf], [uy0 - buf, uy0 - buf, uy0 + h + buf, uy0 + h + buf])
    r = {'type': 'readers.ept', 'filename': EPT % res, 'bounds': f'([{min(xs):.2f},{max(xs):.2f}],[{min(ys):.2f},{max(ys):.2f}])', 'threads': 4}
    if extra: r.update(extra)
    spec = [r, {'type': 'filters.range', 'limits': 'Classification![7:7],Classification![18:18]'},
            {'type': 'filters.reprojection', 'in_srs': 'EPSG:3857', 'out_srs': f'EPSG:{epsg}'}]
    p = pdal.Pipeline(json.dumps(spec)); p.execute(); return p.arrays[0] if p.arrays else None

def tile(res, epsg, ux0, uy0):
    import pdal, tempfile
    td = f'/tmp/pd{os.getpid()}'; os.makedirs(td, exist_ok=True); os.environ['TMPDIR'] = td; tempfile.tempdir = td   # PDAL's temp tiles: one folder per worker
    tf = Transformer.from_crs(epsg, 3857, always_xy=True)
    xs, ys = tf.transform([ux0 - BUF, ux0 + TS + BUF, ux0 - BUF, ux0 + TS + BUF], [uy0 - BUF, uy0 - BUF, uy0 + TS + BUF, uy0 + TS + BUF])
    spec = [{'type': 'readers.ept', 'filename': EPT % res, 'bounds': f'([{min(xs):.2f},{max(xs):.2f}],[{min(ys):.2f},{max(ys):.2f}])', 'threads': 4},
            {'type': 'filters.range', 'limits': 'Classification![7:7],Classification![18:18]'},
            {'type': 'filters.reprojection', 'in_srs': 'EPSG:3857', 'out_srs': f'EPSG:{epsg}'},
            {'type': 'filters.hag_nn', 'count': 4}]
    for k in range(6):
        try:
            p = pdal.Pipeline(json.dumps(spec)); p.execute(); a = p.arrays[0] if p.arrays else None; break
        except Exception as e:
            if 'ground' in str(e).lower() and 'tile' not in str(e).lower(): return ux0, uy0, None
            if k == 5: raise
            time.sleep(4 * (k + 1))
    if a is None or len(a) == 0: return ux0, uy0, None
    Xp = np.asarray(a['X']); Yp = np.asarray(a['Y'])
    m = (Xp >= ux0) & (Xp < ux0 + TS) & (Yp >= uy0) & (Yp < uy0 + TS)
    return ux0, uy0, dict(x=Xp[m], y=Yp[m], z=np.asarray(a['Z'])[m].astype(np.float32), hag=np.asarray(a['HeightAboveGround'])[m].astype(np.float32),
                          g=(np.asarray(a['Classification'])[m] == 2))

def pick_scan(gx0, gy1, w, h):
    """the newest candidate with points and ground over the middle of the course"""
    spots = [(gx0 + w * fx - 60, gy1 - h * fy - 60) for fx, fy in ((.5, .5), (.3, .3), (.7, .3), (.3, .7), (.7, .7))]   # the middle may be a lake
    for res in CFG['cand']:
        for cx, cy in spots:
            try:
                a = read(res, EPSG, cx, cy, 120, 120, 0, {'resolution': 1.0})
                n = 0 if a is None else len(a); gnd = 0 if a is None else int((a['Classification'] == 2).sum())
                log('probe', res, n, 'pts', gnd, 'ground'); SUM.setdefault('probe', {})[res] = [n, gnd]
                if n > 2000 and gnd > 500: return res
            except Exception as e: log('probe fail', res, e); SUM.setdefault('probe', {})[res] = str(e)[:200]
    return None

NAIP = ['https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage',
        'https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer/exportImage']
S = requests.Session(); S.headers['User-Agent'] = 'golf-go-course-builder (github.com/hartwigcam98-star/golf-go)'
import socket, urllib3.util.connection as _uc
_uc.allowed_gai_family = lambda: socket.AF_INET
def get(url, params=None, tries=4, timeout=300):
    for k in range(tries):
        try:
            r = S.get(url, params=params, timeout=timeout)
            if r.status_code == 200: return r
            log('  http', r.status_code, url[:80])
        except Exception as e: log('  err', e)
        time.sleep(8 * (k + 1))
    raise RuntimeError('failed ' + url)
def naip_piece(b, size):
    for u in NAIP:
        try:
            p = dict(bbox=','.join(map(str, b)), bboxSR=4326, imageSR=4326, size=f'{size[0]},{size[1]}', f='json', format='jpg', compressionQuality=90)
            j = get(u, params=p).json()
            if 'href' not in j: raise RuntimeError(str(j)[:200])
            img = cv2.imdecode(np.frombuffer(get(j['href']).content, np.uint8), cv2.IMREAD_COLOR); ex = j['extent']
            if img is None or img.shape[0] < 100: raise RuntimeError('bad image')
            return img, [ex['xmin'], ex['ymin'], ex['xmax'], ex['ymax']]
        except Exception as e: log('  naip source failed', u, e)
    raise RuntimeError('no NAIP')

def main():
    b = CFG['bbox']
    xs, ys = LL2U.transform([b[0], b[2], b[0], b[2]], [b[1], b[1], b[3], b[3]])
    gx0, gy0 = math.floor(min(xs)), math.floor(min(ys)); gx1, gy1 = math.ceil(max(xs)), math.ceil(max(ys))
    gx1 = gx0 + int(math.ceil((gx1 - gx0) / TS) * TS); gy1 = gy0 + int(math.ceil((gy1 - gy0) / TS) * TS)
    w, h = gx1 - gx0, gy1 - gy0; w2, h2 = w // 2, h // 2
    res = pick_scan(gx0, gy1, w, h); SUM['scan'] = res; save()
    if not res: raise RuntimeError('no scan with ground over the course')
    chm = np.zeros((h, w), np.float32); gs = np.zeros((h, w), np.float32); gn = np.zeros((h, w), np.uint16)
    prof = np.zeros((h2, w2, NB), np.uint16)
    jobs = [(gx0 + i * TS, gy0 + j * TS) for j in range(int(h / TS)) for i in range(int(w / TS))]
    SUM['tiles'] = len(jobs); SUM['grid'] = [w, h, gx0, gy1]; npts = 0
    def add(d):
            nonlocal npts
            ix = np.floor(d['x'] - gx0).astype(np.int64); iy = np.floor(gy1 - d['y']).astype(np.int64)
            k = (ix >= 0) & (iy >= 0) & (ix < w) & (iy < h); ix, iy = ix[k], iy[k]
            hg = np.clip(d['hag'][k], 0, 80); z = d['z'][k]; g = d['g'][k]
            np.maximum.at(chm, (iy, ix), hg); np.add.at(gs, (iy[g], ix[g]), z[g]); np.add.at(gn, (iy[g], ix[g]), 1)
            np.add.at(prof, (np.minimum(iy // 2, h2 - 1), np.minimum(ix // 2, w2 - 1), np.clip(np.floor(hg), 0, NB - 1).astype(np.int64)), 1)
            npts += len(hg)
    failed = []
    with ProcessPoolExecutor(3) as ex:
        fs = {ex.submit(tile, res, EPSG, ux, uy): (ux, uy) for ux, uy in jobs}
        for f in as_completed(fs):
            try: ux, uy, d = f.result()
            except Exception as e: failed.append(fs[f]); log('tile fail (will retry)', e); continue
            if d is not None: add(d)
    for ux, uy in failed:   # one at a time: a tile left out would be a hole in the woods
        try:
            _, _, d = tile(res, EPSG, ux, uy)
            if d is not None: add(d)
        except Exception as e: SUM['errors'].append(f'tile {ux},{uy}: {e}'[:300]); log('tile fail', e)
    SUM['tiles_retried'] = len(failed)
    SUM['points'] = npts; save(); log('points', npts)
    gnd = np.where(gn > 0, gs / np.maximum(gn, 1), np.nan).astype(np.float32)
    # stray returns (birds, haze, a wire) above the canopy: a cell's top is capped 1 m above the highest 3-m band with 3+ returns
    # in its 2-m column, so a lone point can't make a 40 m "tree" over a field
    cs3 = prof[..., :].astype(np.int32); c3 = cs3.copy(); c3[..., 1:] += cs3[..., :-1]; c3[..., 2:] += cs3[..., :-2]
    sup = c3[..., :NB - 1] >= 3; rt = np.where(sup.any(-1), (NB - 1) - np.argmax(sup[..., ::-1], -1), 0).astype(np.float32)   # top of the highest supported bin under 31 m
    tall = (prof[..., NB - 1] >= 3) & (prof[..., NB - 2] >= 3) & (prof[..., NB - 3] >= 2); rt[tall] = 80   # 31 m and up only for a crown that reaches it without a gap

    cap = np.kron(rt, np.ones((2, 2), np.float32))[:h, :w]; cap = np.pad(cap, ((0, h - cap.shape[0]), (0, w - cap.shape[1])), mode='edge')
    SUM['spikes'] = int((chm > cap + 1.0).sum()); chm = np.minimum(chm, cap + 1.0)
    if KEY in os.environ.get('DIAG', '').split(','): np.savez_compressed(f'{OUT}/grids.npz', chm=np.round(chm * 10).astype(np.uint16), gnd=gnd, prof=np.minimum(prof, 255).astype(np.uint8), x0=gx0, y1=gy1, epsg=EPSG)
    # ---- photo on the 1 m grid
    ph = np.zeros((h, w, 3), np.uint8)
    try:
        lat = (b[1] + b[3]) / 2; W_m = (b[2] - b[0]) * 111320 * math.cos(math.radians(lat)); H_m = (b[3] - b[1]) * 110574
        nx_, ny_ = max(1, math.ceil(W_m * 1.6 / 4000)), max(1, math.ceil(H_m * 1.6 / 4000))
        jj, ii = np.mgrid[0:h, 0:w]; lon, la = U2LL.transform(gx0 + ii + .5, gy1 - jj - .5)
        for a_ in range(nx_):
            for c_ in range(ny_):
                pb = [b[0] + (b[2] - b[0]) * a_ / nx_, b[1] + (b[3] - b[1]) * c_ / ny_, b[0] + (b[2] - b[0]) * (a_ + 1) / nx_, b[1] + (b[3] - b[1]) * (c_ + 1) / ny_]
                pw = int(W_m / nx_ / .6); phh = int(H_m / ny_ / .6); sc = min(1, 4000 / max(pw, phh))
                img, e = naip_piece(pb, [int(pw * sc), int(phh * sc)]); hh, ww = img.shape[:2]
                px = ((lon - e[0]) / (e[2] - e[0]) * ww - .5).astype(np.float32); py = ((e[3] - la) / (e[3] - e[1]) * hh - .5).astype(np.float32)
                s_ = cv2.remap(img, px, py, cv2.INTER_LINEAR, borderValue=(0, 0, 0)); ok = (s_.sum(-1) > 0) & (ph.sum(-1) == 0); ph[ok] = s_[ok]
        SUM['photo'] = float((ph.sum(-1) > 0).mean())
    except Exception as e: SUM['errors'].append(f'naip: {e}'[:300]); log('naip fail', e)
    # ---- registration: lidar = map + d, the shift that sinks the mapped bunkers deepest into the lidar ground
    gf = gnd.copy(); bad = ~np.isfinite(gf)
    if bad.any(): gf = gf[tuple(ndi.distance_transform_edt(bad, return_distances=False, return_indices=True))]
    gf = ndi.gaussian_filter(gf, .7)
    ins, outs = [], []
    for P in CFG['bunker']:
        P = np.array(P, float)
        if len(P) < 4: continue
        x0_, y0_ = P.min(0) - 4; x1_, y1_ = P.max(0) + 4
        gx_, gy_ = np.meshgrid(np.arange(x0_, x1_, .5), np.arange(y0_, y1_, .5))
        m_ = np.zeros(gx_.shape, np.uint8); cv2.fillPoly(m_, [((P - [x0_, y0_]) / .5).astype(np.int32)], 1); dil = cv2.dilate(m_, np.ones((13, 13), np.uint8))
        if m_.sum() < 4: continue
        ins.append(c2u(gx_[m_ > 0], gy_[m_ > 0])); outs.append(c2u(gx_[(dil > 0) & (m_ == 0)], gy_[(dil > 0) & (m_ == 0)]))
    def smp(img, xs_, ys_): return ndi.map_coordinates(img, [np.asarray(ys_, float), np.asarray(xs_, float)], order=1, mode='nearest')
    def depth(dx, dy):
        r = []
        for (ix_, iy_), (ox_, oy_) in zip(ins, outs):
            zi = smp(gf, ix_ + dx - gx0 - .5, gy1 - iy_ - dy - .5); zo = smp(gf, ox_ + dx - gx0 - .5, gy1 - oy_ - dy - .5)
            r.append(zi.mean() - zo.mean())
        return float(np.mean(r))
    best = (0., 0.); d0 = depth(0, 0) if ins else 0
    if len(ins) >= 5:
        step = 1.0
        for it in range(3):
            cand = [(best[0] + i * step, best[1] + j * step) for i in range(-3, 4) for j in range(-3, 4)]
            rr = {c: depth(*c) for c in cand}; best = min(rr, key=rr.get); step /= 2.5
        if abs(best[0]) > 6 or abs(best[1]) > 6 or rr[best] > -0.05: best = (0., 0.)
        SUM['reg'] = dict(shift_m=[round(best[0], 2), round(best[1], 2)], depth_m=round(rr.get(best, d0), 3), depth0_m=round(d0, 3), bunkers=len(ins))
    else: SUM['reg'] = dict(shift_m=[0, 0], bunkers=len(ins))
    save(); log('reg', SUM['reg'])
    # ---- crowns
    c2 = ndi.grey_closing(chm, size=3); cs = ndi.gaussian_filter(c2, 1.0)
    pk = peak_local_max(cs, min_distance=2, threshold_abs=3.0, exclude_border=False)
    hp = cs[pk[:, 0], pk[:, 1]]; rad = 0.5 * (2.5 + 0.009 * hp ** 2)
    keep = np.ones(len(pk), bool); kd = cKDTree(pk.astype(float))
    for i in np.argsort(-hp):
        if not keep[i]: continue
        for j in kd.query_ball_point(pk[i].astype(float), rad[i]):
            if j != i and keep[j] and hp[j] <= hp[i]: keep[j] = False
    pk = pk[keep]; hp = hp[keep]; n = len(pk)
    mk = np.zeros((h, w), np.int32); mk[pk[:, 0], pk[:, 1]] = np.arange(1, n + 1)
    lab = watershed(-cs, mk, mask=cs > 2.0)
    yy, xx = np.indices((h, w)); L = lab.ravel(); ok = L > 0; py, px = pk[:, 0], pk[:, 1]
    d = np.hypot(yy.ravel() - py[np.maximum(L - 1, 0)], xx.ravel() - px[np.maximum(L - 1, 0)])
    rmax = np.clip(1.2 + 0.32 * hp, 3.0, 11.0)
    bad = ok & ((d > rmax[np.maximum(L - 1, 0)]) | (cs.ravel() < 0.35 * hp[np.maximum(L - 1, 0)]))
    L[bad] = 0; lab = L.reshape(h, w); del yy, xx, d
    idx = np.arange(1, n + 1)
    area = np.bincount(lab.ravel(), minlength=n + 1)[1:].astype(float)
    top = ndi.maximum(chm, lab, idx)
    lab2 = lab[::2, ::2][:h2, :w2]; P = np.zeros((n + 1, NB), np.float64); np.add.at(P, lab2.ravel(), prof.reshape(-1, NB)); P = P[1:]
    base = np.full(n, np.nan)
    for i in range(n):
        p = P[i, 2:int(min(NB - 1, top[i])) + 1]
        if p.sum() >= 4: base[i] = 2 + np.searchsorted(np.cumsum(p) / p.sum(), 0.08)
    nb = np.isnan(base); base[nb] = 0.3 * top[nb]; base = np.minimum(base, 0.7 * top)
    # ---- photo stats per crown
    phf = ph.astype(np.float32) / 255; Bc, Gc, Rc = phf[..., 0], phf[..., 1], phf[..., 2]
    exg = (2 * Gc - Rc - Bc) / (Bc + Gc + Rc + 1e-3); Lum = .11 * Bc + .59 * Gc + .3 * Rc
    mexg = ndi.mean(exg, lab, idx); mL = ndi.mean(Lum, lab, idx); mbr = ndi.mean(Bc - Rc, lab, idx)
    sd = ndi.standard_deviation(ndi.gaussian_filter(chm, .7), lab, idx)
    desert = CFG.get('scen') == 'desert'
    havep = mL > 0
    # darker than the ground round it? (a crown is; a roof, rock or a slope the ground model missed isn't)
    ux0_ = (px + .5).astype(np.float32); uy0_ = (py + .5).astype(np.float32); crm = np.sqrt(np.maximum(area, 1) / np.pi).astype(np.float32)
    an = np.linspace(0, 2 * np.pi, 24, endpoint=False).astype(np.float32); Lb = cv2.GaussianBlur(Lum.astype(np.float32), (0, 0), 1.0)
    def ring(rr): return ndi.map_coordinates(Lb, [(uy0_[:, None] + np.sin(an)[None] * rr[:, None]).ravel(), (ux0_[:, None] + np.cos(an)[None] * rr[:, None]).ravel()], order=1, mode='constant').reshape(-1, len(an))
    Lin = np.concatenate([ring(crm * f) for f in (0., .3, .6)], 1).mean(1) if n else np.zeros(0); Lout = np.median(ring(crm + 3), 1) if n else np.zeros(0)
    contrast = Lout - Lin
    roof = havep & (mexg < (0.0 if desert else 0.06)) & (mL > 0.25) & (sd < 1.5)   # grey or pale, not green, and smooth: a roof (dark or blue-green rough crowns, e.g. pines, stay)
    # over open water (birds, spray, a lake's far shore in the scan): no ground return within 8 m of the crown
    gdist = ndi.distance_transform_edt(gn == 0); gd = ndi.minimum(gdist, lab, idx) if n else np.zeros(0)
    wet = (gd > 8) & (mexg < 0.1)   # ...and not green in the photo
    flat = (sd < 0.45) & (area > 40)                       # a flat top over a big footprint: a roof, not a crown
    keep = ~roof & ~flat & ~wet & (area >= 8) & (top >= 3) & (top <= 45)
    if desert: keep &= ~havep | ((contrast > 0.03) & (top <= 16))   # desert: a tree is a dark spot on bright ground, and none is taller than ~16 m
    con = havep & (mL < 0.31) & (mbr > -0.005)
    ux = gx0 + px + 0.5; uy = gy1 - py - 0.5
    cxy = u2c(ux - best[0], uy - best[1])
    cr = np.sqrt(np.maximum(area, 1) / np.pi)
    xy = cxy[keep]; crY = cr[keep] * YD; hY = top[keep] * YD; cbY = base[keep] * YD; cn = con[keep]
    import base64
    q = lambda a, t: base64.b64encode(np.ascontiguousarray(a).astype(t).tobytes()).decode()
    Lj = dict(n=int(keep.sum()), xy=q(np.round(xy * 2).clip(-32767, 32767), np.int16), r=q(np.minimum(127, np.round(crY * 10)) + cn * 128, np.uint8),
              h=q(np.minimum(255, np.round(hY * 4)), np.uint8), cb=q(np.minimum(255, np.round(cbY * 4)), np.uint8), scan=res)
    json.dump(Lj, open(f'{OUT}/L.json', 'w'))
    # every crown found, kept or not, with what the filters looked at: re-filter later without fetching again
    np.savez_compressed(f'{OUT}/crowns.npz', xy=cxy.astype(np.float32), cr=cr.astype(np.float32), h=top.astype(np.float32), cb=base.astype(np.float32),
                        area=area.astype(np.float32), exg=mexg.astype(np.float32), L=mL.astype(np.float32), br=mbr.astype(np.float32), sd=sd.astype(np.float32),
                        contrast=contrast.astype(np.float32), gd=np.asarray(gd, np.float32), keep=keep, con=con, desert=desert)
    pct = lambda a: [round(float(v), 1) for v in np.percentile(a, [10, 50, 90])] if len(a) else []
    SUM.update(crowns=int(n), kept=int(keep.sum()), wet=int(wet.sum()), roofs=int((roof & ~flat).sum()), flat=int(flat.sum()), tiny=int(((area < 8) | (top < 3)).sum()),
               h_yd=pct(hY), cr_yd=pct(crY), cb_yd=pct(cbY), conifer=round(float(cn.mean()), 3) if len(cn) else 0, contrast=pct(contrast[keep]) if n else [], dark_drop=int((desert and havep.any()) and (~((contrast > 0.03) & (top <= 16)) & havep & ~roof & ~flat).sum()), bytes=len(json.dumps(Lj)))
    # ---- preview: the busiest 300 m square near the middle, crowns over the photo (blue = dropped), height/base labels
    S_ = 300; dens = ndi.uniform_filter((lab > 0).astype(np.float32), 150)
    cyc, cxc = h // 2, w // 2; sub = dens[max(0, cyc - 600):cyc + 600, max(0, cxc - 600):cxc + 600]
    j0, i0 = np.unravel_index(np.argmax(np.abs(sub - 0.4) * -1), sub.shape); r0 = max(0, min(h - S_, cyc - 600 + j0 - S_ // 2)); c0 = max(0, min(w - S_, cxc - 600 + i0 - S_ // 2))
    im = cv2.resize(ph[r0:r0 + S_, c0:c0 + S_], None, fx=2, fy=2, interpolation=cv2.INTER_LINEAR)
    for k_ in range(n):
        x_, y_ = (px[k_] - c0) * 2, (py[k_] - r0) * 2
        if 0 <= x_ < S_ * 2 and 0 <= y_ < S_ * 2:
            cv2.circle(im, (int(x_), int(y_)), int(cr[k_] * 2), (0, 0, 255) if keep[k_] else (255, 80, 0), 1)
            if keep[k_]: cv2.putText(im, f'{top[k_]:.0f}/{base[k_]:.0f}', (int(x_) - 10, int(y_) + 4), 0, .3, (255, 255, 255), 1)
    cv2.imwrite(f'{OUT}/prev.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, 82])
    SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save(); log('done', SUM)

if __name__ == '__main__':
    try: main()
    except Exception as e:
        SUM['errors'].append(f'fatal: {e}'[:500]); traceback.print_exc(); save()
