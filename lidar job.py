# Buildings from USGS lidar: for each course in bld_req.json, read the 3DEP lidar point cloud (AWS EPT) over the course,
# grid a 1 m surface model (highest return) and ground model (class 2), and measure every mapped building footprint:
# wall height to the eave, roof rise, roof type (flat / gable / hip) and ridge direction. Also finds course buildings the
# map is missing (snack shacks, restrooms, shelters, cart barns): raised, smooth, single-return blobs near the holes.
# Results go to the "course-data" branch as bld_<key>.json (main is untouched).
import json, math, os, time, re, traceback, subprocess
import numpy as np, requests
from concurrent.futures import ProcessPoolExecutor, as_completed
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
REQ = json.load(open('bld_req.json')); KEYS = REQ.pop('_keys', None) or list(REQ)
SUM = {'started': time.strftime('%Y-%m-%d %H:%M:%S'), 'courses': {}, 'errors': []}
def save(): json.dump(SUM, open(f'{OUT}/bld_summary.json', 'w'), indent=1)
def log(*a): print(time.strftime('%H:%M:%S'), *a, flush=True)
def err(where, e): SUM['errors'].append(f'{where}: {e}'); log('FAIL', where, e); traceback.print_exc(); save()
S = requests.Session(); S.headers['User-Agent'] = 'golf-go-course-builder (github.com/hartwigcam98-star/golf-go)'
def get(url, tries=4, timeout=300):
    for k in range(tries):
        try:
            r = S.get(url, timeout=timeout)
            if r.status_code == 200: return r
            log('  http', r.status_code, url[:90])
        except Exception as e: log('  err', e)
        time.sleep(6 * (k + 1))
    raise RuntimeError('failed ' + url)
from pyproj import Transformer
EPT = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/%s/ept.json'
UTMZ = lambda lon: 26900 + int((lon + 180) // 6) + 1
def merc(lon, lat): R = 6378137.0; return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
def rings_of(g):
    if g['type'] == 'Polygon': return [g['coordinates'][0]]
    if g['type'] == 'MultiPolygon': return [p[0] for p in g['coordinates']]
    return []
def pip(pt, r):
    x, y = pt; c = False
    for i in range(len(r)):
        x1, y1 = r[i]; x2, y2 = r[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c
def year_of(name):
    ys = [int(y) for y in re.findall(r'(?<!\d)(20[0-2]\d|19[89]\d)(?!\d)', name)] + [2000 + int(y) for y in re.findall(r'_B(\d\d)(?!\d)', name)]
    return max(ys) if ys else 0

def read_tile(res, box, epsg, x0, y1, W, H):
    """one tile: grids of max z (all non-noise returns), min ground z, return counts; in the course's 1 m UTM grid"""
    import pdal
    Wb, Sb, Eb, Nb = box; mx0, my0 = merc(Wb, Sb); mx1, my1 = merc(Eb, Nb)
    spec = [{'type': 'readers.ept', 'filename': EPT % res, 'bounds': f'([{mx0:.2f},{mx1:.2f}],[{my0:.2f},{my1:.2f}])', 'resolution': 0.8, 'threads': 2}]
    p = pdal.Pipeline(json.dumps(spec)); n = p.execute(); arrs = p.arrays
    if not arrs or len(arrs[0]) == 0: return None
    a = arrs[0]; cls = a['Classification'].astype(int)
    keep = (cls != 7) & (cls != 18) & (cls != 17) & (cls != 9)   # noise, bridge decks, water
    a = a[keep]; cls = cls[keep]
    tf = Transformer.from_crs(3857, epsg, always_xy=True); X, Y = tf.transform(a['X'], a['Y']); X = np.asarray(X); Y = np.asarray(Y); Z = np.asarray(a['Z'], float)
    c = np.floor(X - x0).astype(np.int64); r = np.floor(y1 - Y).astype(np.int64)
    ok = (c >= 0) & (c < W) & (r >= 0) & (r < H); c, r, Z, cls = c[ok], r[ok], Z[ok], cls[ok]
    rn = a['ReturnNumber'][ok].astype(int) if 'ReturnNumber' in a.dtype.names else np.ones(len(c), int)
    nr = a['NumberOfReturns'][ok].astype(int) if 'NumberOfReturns' in a.dtype.names else np.ones(len(c), int)
    idx = r * W + c
    zmax = np.full(W * H, -np.inf); np.maximum.at(zmax, idx, Z)
    g = cls == 2; gmin = np.full(W * H, np.inf); np.minimum.at(gmin, idx[g], Z[g])
    single = np.zeros(W * H, np.int32); np.add.at(single, idx[(nr == 1)], 1)
    tot = np.zeros(W * H, np.int32); np.add.at(tot, idx, 1)
    b6 = np.zeros(W * H, np.int32); np.add.at(b6, idx[cls == 6], 1)
    m = tot > 0
    return dict(i=np.nonzero(m)[0].astype(np.int64), zmax=zmax[m].astype(np.float32), gmin=np.where(np.isfinite(gmin[m]), gmin[m], np.nan).astype(np.float32),
                single=single[m].astype(np.int16), tot=tot[m].astype(np.int16), b6=b6[m].astype(np.int16), n=int(n))

def fill_nan(A, it=60):
    A = A.astype(np.float32).copy(); from scipy import ndimage as ndi
    for _ in range(it):
        m = np.isnan(A)
        if not m.any(): break
        k = np.ones((3, 3), np.float32); v = np.where(m, 0, A).astype(np.float32); w = (~m).astype(np.float32)
        s = ndi.convolve(v, k, mode='nearest'); n = ndi.convolve(w, k, mode='nearest')
        A[m & (n > 0)] = (s / np.maximum(n, 1))[m & (n > 0)]
    return A

def poly_mask(ring_xy, W, H):
    import cv2
    m = np.zeros((H, W), np.uint8); pts = np.round(np.array(ring_xy)).astype(np.int32); cv2.fillPoly(m, [pts], 1); return m.astype(bool)

def roof_of(dsm, gnd, m):
    """measure one footprint: (eave height m, roof rise m, roof 0/1/2, ridge angle in grid coords (rad, x right, y down), quality)"""
    from scipy import ndimage as ndi
    if m.sum() < 6: return None
    inner = ndi.binary_erosion(m, iterations=1) if m.sum() > 30 else m
    ring = ndi.binary_dilation(m, iterations=5) & ~ndi.binary_dilation(m, iterations=2)
    gz = np.nanmedian(gnd[ring]) if np.isfinite(gnd[ring]).any() else np.nanmedian(gnd[m])
    zin = dsm[inner]; zin = zin[np.isfinite(zin)]
    if len(zin) < 4 or not np.isfinite(gz): return None
    top = np.percentile(zin, 95) - gz
    if top < 2.0: return dict(q='low', top=round(float(top), 2))
    # plane fit
    rr, cc = np.nonzero(inner); z = dsm[rr, cc]; ok = np.isfinite(z); rr, cc, z = rr[ok], cc[ok], z[ok]
    A = np.c_[cc, rr, np.ones(len(cc))]; coef, *_ = np.linalg.lstsq(A, z, rcond=None); res = z - A @ coef
    slope = math.hypot(coef[0], coef[1]); sd = float(np.std(res))
    edge = m & ~ndi.binary_erosion(m, iterations=2)
    ze = dsm[edge]; ze = ze[np.isfinite(ze)]
    eave = (np.percentile(ze, 20) if len(ze) > 3 else np.percentile(zin, 10)) - gz
    if sd < 0.3 and slope < 0.1:
        return dict(roof=0, eave=float(np.median(z) - gz), rise=0.0, ang=0.0, q='flat', sd=round(sd, 2), lap=0.0)
    gy, gx = np.gradient(np.where(np.isfinite(dsm), dsm, np.nan))
    s = np.hypot(gx, gy); sel = inner & np.isfinite(s) & (s > 0.15) & (s < 2.5)
    if sel.sum() < 4: return dict(roof=0, eave=float(np.median(z) - gz), rise=0.0, ang=0.0, q='flatish', sd=round(sd, 2), lap=0.0)
    th = np.arctan2(gy[sel], gx[sel])           # downhill/uphill direction of each roof cell
    R2 = abs(np.mean(np.exp(2j * th))); R4 = abs(np.mean(np.exp(4j * th)))
    axis = np.angle(np.mean(np.exp(2j * th))) / 2   # slope axis (perpendicular to the ridge)
    pitch = float(np.median(s[sel]))
    import cv2
    mr, mc = np.nonzero(m); rect = cv2.minAreaRect(np.c_[mc, mr].astype(np.float32)); hw = max(1.0, min(rect[1]) / 2)
    rise = float(min(max(pitch * hw, 0.6), 0.6 * top)); eave = top - rise
    if eave < 2.2: eave = 2.2; rise = max(0.0, top - 2.2)
    roof = 1 if R2 > 0.55 else 2
    ridge = axis + math.pi / 2
    if roof == 2:   # hips: the ridge runs along the footprint's long axis
        mr, mc = np.nonzero(m); C = np.cov(np.c_[mc - mc.mean(), mr - mr.mean()].T); ev, evec = np.linalg.eigh(C); v = evec[:, 1]; ridge = math.atan2(v[1], v[0])
    lap = float(np.median(np.abs(ndi.laplace(np.nan_to_num(dsm, nan=0.0)))[inner]))
    return dict(roof=roof, eave=float(eave), rise=float(rise), ang=float(ridge), q='ok', R2=round(float(R2), 2), R4=round(float(R4), 2), pitch=round(pitch, 2), lap=round(lap, 2), sd=round(sd, 2))

OVP = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
def osm_buildings(bb):
    q = f'[out:json][timeout:120];(way["building"]({bb[1]},{bb[0]},{bb[3]},{bb[2]}););out geom;'
    for u in OVP:
        try:
            r = S.post(u, data={'data': q}, timeout=200)
            if r.status_code == 200: return [[[p['lon'], p['lat']] for p in el['geometry']] for el in r.json()['elements'] if el.get('geometry')]
        except Exception as e: log('  overpass', u, e)
    return []
def course(key, rq, resources):
    W_, S_, E_, N_ = rq['bbox']; epsg = UTMZ((W_ + E_) / 2); tf = Transformer.from_crs(4326, epsg, always_xy=True); tb = Transformer.from_crs(epsg, 4326, always_xy=True)
    xs, ys = tf.transform([W_, E_, W_, E_], [S_, S_, N_, N_]); x0, y0, x1, y1 = math.floor(min(xs)), math.floor(min(ys)), math.ceil(max(xs)), math.ceil(max(ys))
    W, H = x1 - x0, y1 - y0
    cx, cy = (W_ + E_) / 2, (S_ + N_) / 2
    pts = [(W_, S_), (E_, S_), (W_, N_), (E_, N_), (cx, cy)]
    cand = [f['properties']['name'] for f in resources if any(pip(q, r) for q in pts for r in rings_of(f['geometry']))]
    cand.sort(key=lambda n: -year_of(n))
    info = dict(cand=cand, W=W, H=H, epsg=epsg); SUM['courses'][key] = info; save()
    if not cand: raise RuntimeError('no lidar resource')
    # tiles of ~600 m
    T = 0.003; tiles = []
    lon = W_
    while lon < E_:
        lat = S_
        while lat < N_: tiles.append([lon, lat, min(E_, lon + T * 1.4), min(N_, lat + T)]); lat += T
        lon += T * 1.4
    best = None
    for res in cand[:4]:
        zmax = np.full(W * H, np.nan, np.float32); gmin = np.full(W * H, np.nan, np.float32); single = np.zeros(W * H, np.int32); tot = np.zeros(W * H, np.int32); b6 = np.zeros(W * H, np.int32); n = 0
        with ProcessPoolExecutor(3) as ex:
            fs = [ex.submit(read_tile, res, t, epsg, x0, y1, W, H) for t in tiles]
            for f in as_completed(fs):
                try: d = f.result()
                except Exception as e: err(f'tile {key} {res}', e); continue
                if d is None: continue
                i = d['i']; zmax[i] = np.fmax(zmax[i], d['zmax']); gmin[i] = np.fmin(gmin[i], d['gmin']); single[i] += d['single']; tot[i] += d['tot']; b6[i] += d['b6']; n += d['n']
        cover = float((tot > 0).mean())
        log(key, res, 'points', n, 'cover', round(cover, 3))
        info.setdefault('tried', {})[res] = dict(points=n, cover=round(cover, 3), b6=int((b6 > 0).sum()))
        if cover > 0.6: best = (res, zmax, gmin, single, tot, b6); break
        if best is None or cover > best[-1]: best = (res, zmax, gmin, single, tot, b6, cover)
    res, zmax, gmin, single, tot, b6 = best[:6]; info['used'] = res; save()
    dsm = zmax.reshape(H, W); gnd = fill_nan(gmin.reshape(H, W)); single = single.reshape(H, W); tot = tot.reshape(H, W); b6 = b6.reshape(H, W)
    toxy = lambda lo, la: (np.array(tf.transform(lo, la)[0]) - x0, y1 - np.array(tf.transform(lo, la)[1]))
    out = dict(src=res, fp={}, add=[], osm=[])
    if not rq['fps']:   # courses with no footprints in the game: measure the OpenStreetMap buildings near play
        try:
            obs = osm_buildings(rq['bbox']); import cv2 as _c
            for ring in obs:
                X, Y = toxy([p[0] for p in ring], [p[1] for p in ring])
                if len(ring) < 4: continue
                cxm, cym = float(np.mean(X)), float(np.mean(Y))
                rq['fps'].append(['o%d' % len(out['osm']), ring]); out['osm'].append(ring)
            info['osm'] = len(out['osm'])
        except Exception as e: err(f'osm {key}', e)
    allmask = np.zeros((H, W), bool)
    for fid, ring in rq['fps']:
        lo = [p[0] for p in ring]; la = [p[1] for p in ring]; X, Y = toxy(lo, la)
        pad = 8; R0, R1 = max(0, int(np.min(Y)) - pad), min(H, int(np.max(Y)) + pad + 1); C0, C1 = max(0, int(np.min(X)) - pad), min(W, int(np.max(X)) + pad + 1)
        if R1 <= R0 or C1 <= C0: out['fp'][fid] = None; continue
        m = poly_mask(np.c_[X - C0, Y - R0], C1 - C0, R1 - R0); allmask[R0:R1, C0:C1] |= m
        r = roof_of(dsm[R0:R1, C0:C1], gnd[R0:R1, C0:C1], m)
        if not r or 'roof' not in r: out['fp'][fid] = r; continue
        out['fp'][fid] = [round(r['eave'], 2), round(r['rise'], 2), r['roof'], round(r['ang'], 3), r.get('q'), int(m.sum()), r.get('lap'), r.get('sd')]
    # missing buildings: raised, smooth, mostly single-return (or class 6) blobs within ~140 m of a hole line
    from scipy import ndimage as ndi
    import cv2
    nd = dsm - gnd
    lines = np.zeros((H, W), np.uint8)
    for L in rq['lines']:
        X, Y = toxy([p[0] for p in L], [p[1] for p in L]); cv2.polylines(lines, [np.round(np.c_[X, Y]).astype(np.int32)], False, 1, 1)
    near = ndi.distance_transform_edt(lines == 0) < 80
    lap = np.abs(ndi.laplace(np.nan_to_num(dsm, nan=0.0).astype(np.float32)))
    sf = single / np.maximum(tot, 1)
    raised = near & np.isfinite(nd) & (nd > 2.2) & (nd < 40) & ~ndi.binary_dilation(allmask, iterations=3)
    raised = ndi.binary_closing(raised, iterations=1) & near
    smooth = lap < 0.9
    lab, nl = ndi.label(raised)
    for k, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None: continue
        r0, c0 = sl[0].start, sl[1].start
        m = ndi.binary_fill_holes(lab[sl] == k); area = int(m.sum())
        if area < 10 or area > 6000: continue
        rr, cc = np.nonzero(m); cnt = np.c_[cc + c0, rr + r0].astype(np.float32)
        rect = cv2.minAreaRect(cnt); (rw, rh) = rect[1]
        if min(rw, rh) < 2.5 or max(rw, rh) / max(min(rw, rh), .1) > 6 or area / max(rw * rh, 1) < 0.55: continue
        smf = float(smooth[sl][m].mean()); b6f = float((b6[sl][m] > 0).mean()); sff = float(sf[sl][m].mean())
        if b6f < 0.3 and (smf < 0.6 or sff < 0.6): continue
        box = cv2.boxPoints(rect)
        pad = 4; R0, R1 = max(0, int(box[:, 1].min()) - pad), min(H, int(box[:, 1].max()) + pad + 1); C0, C1 = max(0, int(box[:, 0].min()) - pad), min(W, int(box[:, 0].max()) + pad + 1)
        r = roof_of(dsm[R0:R1, C0:C1], gnd[R0:R1, C0:C1], poly_mask(box - [C0, R0], C1 - C0, R1 - R0))
        if not r or 'roof' not in r: continue
        lo, la = tb.transform(box[:, 0] + x0, y1 - box[:, 1])
        out['add'].append(dict(ring=[[round(a, 7), round(b, 7)] for a, b in zip(lo, la)], eave=round(r['eave'], 2), rise=round(r['rise'], 2), roof=r['roof'], ang=round(r['ang'], 3), area=area,
                               b6=round(b6f, 2), sf=round(sff, 2), smooth=round(smf, 2), rect=round(float(rw * rh), 1), lap=r.get('lap'), sd=r.get('sd'), q=r.get('q')))
    json.dump(out, open(f'{OUT}/bld_{key}.json', 'w'), separators=(',', ':'))
    info['fp'] = len(out['fp']); info['measured'] = sum(1 for v in out['fp'].values() if isinstance(v, list)); info['added'] = len(out['add']); save()
    log(key, 'footprints', info['fp'], 'measured', info['measured'], 'added', info['added'])

def main():
    subprocess.run('pip install -q scipy opencv-python-headless', shell=True)
    try:
        subprocess.run(['git', 'clone', '-q', '--depth', '1', '-b', 'course-data', f"https://github.com/{os.environ.get('GITHUB_REPOSITORY','hartwigcam98-star/golf-go')}", '/tmp/prev'], check=True)
        subprocess.run('cp -rn /tmp/prev/. out/ 2>/dev/null; rm -rf out/.git; true', shell=True)
    except Exception as e: SUM['errors'].append(f'keep old: {e}')
    try: resources = get('https://raw.githubusercontent.com/hobuinc/usgs-lidar/master/boundaries/resources.geojson').json()['features']
    except Exception as e: err('resources', e); return
    for key in KEYS:
        t = time.time()
        try: course(key, REQ[key], resources)
        except Exception as e: err(f'course {key}', e)
        SUM['courses'].setdefault(key, {})['sec'] = round(time.time() - t); save()
    SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save()

if __name__ == '__main__':
    main()
