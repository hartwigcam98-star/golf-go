# Clubhouses and parking from USGS lidar + OpenStreetMap: for each course in cb_req.json, find the clubhouse when the game has
# none (an OSM building tagged as one, else the biggest building near the first tee / last green, else the biggest smooth raised
# block in the lidar there), measure its walls and roof, and collect the parking lots and side buildings round it.
# Results go to the "course-data" branch as cb_<key>.json (main is untouched).
import json, math, os, time, re, traceback, subprocess
import numpy as np, requests
from concurrent.futures import ProcessPoolExecutor, as_completed
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
REQ = json.load(open('cb_req.json')); KEYS = REQ.pop('_keys', None) or list(REQ)
SUM = {'started': time.strftime('%Y-%m-%d %H:%M:%S'), 'courses': {}, 'errors': []}
def save(): json.dump(SUM, open(f'{OUT}/cb_summary.json', 'w'), indent=1)
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
import socket, urllib3.util.connection as _uc
_uc.allowed_gai_family = lambda: socket.AF_INET
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
OVP = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter']
def overpass(q):
    for u in OVP:
        try:
            r = S.post(u, data={'data': q}, timeout=200)
            if r.status_code == 200: return r.json()['elements']
            log('  overpass', u, r.status_code)
        except Exception as e: log('  overpass', u, e)
        time.sleep(5)
    raise RuntimeError('overpass failed')
def ring_area_m(ring, tf):
    X, Y = tf.transform([p[0] for p in ring], [p[1] for p in ring]); X = np.array(X); Y = np.array(Y)
    return abs(np.dot(X, np.roll(Y, 1)) - np.dot(Y, np.roll(X, 1))) / 2, float(X.mean()), float(Y.mean())
CLUBRX = re.compile(r'club|grill|pro ?shop|lodge|pavilion|chalet|restaurant|tavern|bar$', re.I)
def course(key, rq, resources):
    """clubhouse (when the game has none) and the parking lots round it"""
    from scipy import ndimage as ndi
    import cv2
    cx, cy = rq['center']; R = rq.get('radius', 450)
    epsg = UTMZ(cx); tf = Transformer.from_crs(4326, epsg, always_xy=True); tb = Transformer.from_crs(epsg, 4326, always_xy=True)
    mx, my = tf.transform(cx, cy); x0, y0, x1, y1 = math.floor(mx - R), math.floor(my - R), math.ceil(mx + R), math.ceil(my + R); W, H = x1 - x0, y1 - y0
    lo0, la0 = tb.transform(x0, y0); lo1, la1 = tb.transform(x1, y1); bb = [min(lo0, lo1), min(la0, la1), max(lo0, lo1), max(la0, la1)]
    info = dict(epsg=epsg); SUM['courses'][key] = info; save()
    out = dict(club=None, parking=[], extra=[])
    els = overpass(f'[out:json][timeout:120];(way["building"]({bb[1]},{bb[0]},{bb[3]},{bb[2]});way["amenity"="parking"]({bb[1]},{bb[0]},{bb[3]},{bb[2]});relation["amenity"="parking"]({bb[1]},{bb[0]},{bb[3]},{bb[2]}););out geom;')
    blds, parks = [], []
    for el in els:
        t = el.get('tags', {})
        rings = [[[p['lon'], p['lat']] for p in el['geometry']]] if el['type'] == 'way' and el.get('geometry') else [[[p['lon'], p['lat']] for p in m['geometry']] for m in el.get('members', []) if m.get('role') == 'outer' and m.get('geometry')]
        for rg in rings:
            if len(rg) < 4: continue
            a, ex, ey = ring_area_m(rg, tf)
            if t.get('amenity') == 'parking': parks.append(dict(ring=rg, area=a, x=ex, y=ey))
            elif 'building' in t: blds.append(dict(ring=rg, area=a, x=ex, y=ey, tags={k: v for k, v in t.items() if k in ('building', 'name', 'golf', 'amenity', 'leisure')}))
    info['osm_bld'] = len(blds); info['osm_park'] = len(parks); save()
    starts = [tf.transform(p[0], p[1]) for p in rq['starts']]
    dstart = lambda x, y: min(math.hypot(x - a, y - b) for a, b in starts)
    # lidar over the box
    cand = [f['properties']['name'] for f in resources if any(pip(q, r) for q in [(bb[0], bb[1]), (bb[2], bb[3]), (cx, cy)] for r in rings_of(f['geometry']))]
    cand.sort(key=lambda n: -year_of(n)); info['cand'] = cand; save()
    T = 0.003; tiles = []; lon = bb[0]
    while lon < bb[2]:
        lat = bb[1]
        while lat < bb[3]: tiles.append([lon, lat, min(bb[2], lon + T * 1.4), min(bb[3], lat + T)]); lat += T
        lon += T * 1.4
    best = None
    for res in cand[:4]:
        zmax = np.full(W * H, np.nan, np.float32); gmin = np.full(W * H, np.nan, np.float32); single = np.zeros(W * H, np.int32); tot = np.zeros(W * H, np.int32); b6 = np.zeros(W * H, np.int32)
        with ProcessPoolExecutor(3) as ex:
            fs = [ex.submit(read_tile, res, t, epsg, x0, y1, W, H) for t in tiles]
            for f in as_completed(fs):
                try: d = f.result()
                except Exception as e: err(f'tile {key} {res}', e); continue
                if d is None: continue
                i = d['i']; zmax[i] = np.fmax(zmax[i], d['zmax']); gmin[i] = np.fmin(gmin[i], d['gmin']); single[i] += d['single']; tot[i] += d['tot']; b6[i] += d['b6']
        cover = float((tot > 0).mean()); info.setdefault('tried', {})[res] = round(cover, 3)
        if cover > 0.6: best = (res, zmax, gmin, single, tot, b6); break
        if best is None or cover > best[-1]: best = (res, zmax, gmin, single, tot, b6, cover)
    if best is None: raise RuntimeError('no lidar')
    res, zmax, gmin, single, tot, b6 = best[:6]; info['used'] = res; save()
    dsm = zmax.reshape(H, W); gnd = fill_nan(gmin.reshape(H, W)); single = single.reshape(H, W); tot = tot.reshape(H, W); b6 = b6.reshape(H, W)
    toxy = lambda ring: (np.array(tf.transform([p[0] for p in ring], [p[1] for p in ring])[0]) - x0, y1 - np.array(tf.transform([p[0] for p in ring], [p[1] for p in ring])[1]))
    def measure(ring):
        X, Y = toxy(ring); pad = 8
        R0, R1 = max(0, int(np.min(Y)) - pad), min(H, int(np.max(Y)) + pad + 1); C0, C1 = max(0, int(np.min(X)) - pad), min(W, int(np.max(X)) + pad + 1)
        if R1 <= R0 or C1 <= C0: return None
        m = poly_mask(np.c_[X - C0, Y - R0], C1 - C0, R1 - R0); r = roof_of(dsm[R0:R1, C0:C1], gnd[R0:R1, C0:C1], m)
        if not r or 'roof' not in r: return None
        return [round(r['eave'], 2), round(r['rise'], 2), r['roof'], round(r['ang'], 3)]
    club = None
    if not rq.get('has_club'):
        tagged = [b for b in blds if b['area'] > 120 and (b['tags'].get('building') == 'clubhouse' or b['tags'].get('golf') == 'clubhouse' or CLUBRX.search(b['tags'].get('name', '')))]
        if tagged:
            b = min(tagged, key=lambda b: dstart(b['x'], b['y'])); club = dict(ring=b['ring'], src='osm-tag', name=b['tags'].get('name', ''), area=round(b['area']))
        else:
            near = [b for b in blds if b['area'] >= 250 and dstart(b['x'], b['y']) < 260]
            if near:
                b = max(near, key=lambda b: b['area'] * math.exp(-dstart(b['x'], b['y']) / 150)); club = dict(ring=b['ring'], src='osm', name=b['tags'].get('name', ''), area=round(b['area']))
        if club is None:   # lidar: the biggest smooth raised block near the first tee / last green
            nd = dsm - gnd; lap = np.abs(ndi.laplace(np.nan_to_num(dsm, nan=0.0).astype(np.float32))); sf = single / np.maximum(tot, 1)
            yy, xx = np.mgrid[0:H, 0:W]; dmin = np.full((H, W), 1e9, np.float32)
            for a, b in starts: dmin = np.minimum(dmin, np.hypot(xx - (a - x0), yy - (y1 - b)))
            raised = np.isfinite(nd) & (nd > 2.8) & (nd < 30) & (dmin < 280); raised = ndi.binary_opening(raised, iterations=1)
            lab, nl = ndi.label(raised); bestb = None
            for k, sl in enumerate(ndi.find_objects(lab), 1):
                if sl is None: continue
                m = ndi.binary_fill_holes(lab[sl] == k); area = int(m.sum())
                if area < 200 or area > 6000: continue
                smf = float((lap[sl][m] < 0.9).mean()); sff = float(sf[sl][m].mean()); b6f = float((b6[sl][m] > 0).mean())
                if b6f < 0.3 and (smf < 0.6 or sff < 0.55): continue
                rr, cc = np.nonzero(m); cnt = np.c_[cc + sl[1].start, rr + sl[0].start].astype(np.float32)
                rect = cv2.minAreaRect(cnt)
                if area / max(rect[1][0] * rect[1][1], 1) < 0.5: continue
                hull = cv2.approxPolyDP(cv2.convexHull(cnt), 1.2, True)[:, 0, :] if area / max(rect[1][0] * rect[1][1], 1) < 0.8 else cv2.boxPoints(rect)
                # keep L / T shapes: trace the outline instead of the hull when the block is not rectangular
                if area / max(rect[1][0] * rect[1][1], 1) < 0.8:
                    mm = np.zeros((H, W), np.uint8); mm[sl][m] = 1; cs, _ = cv2.findContours(mm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    if cs: hull = cv2.approxPolyDP(max(cs, key=cv2.contourArea), 1.2, True)[:, 0, :].astype(np.float32)
                sc = area * math.exp(-float(dmin[int(cnt[:, 1].mean()), int(cnt[:, 0].mean())]) / 150)
                if bestb is None or sc > bestb[0]: bestb = (sc, hull, area, smf, sff)
            if bestb:
                _, hull, area, smf, sff = bestb; lo, la = tb.transform(hull[:, 0] + x0, y1 - hull[:, 1])
                club = dict(ring=[[round(a, 7), round(b, 7)] for a, b in zip(lo, la)], src='lidar', name='', area=area, smooth=round(smf, 2), sf=round(sff, 2))
        if club:
            club['rec'] = measure(club['ring']); out['club'] = club
    # parking lots near the clubhouse (or near the start when there is none)
    if out['club']: ccx, ccy = tf.transform(*np.mean(np.array(out['club']['ring']), 0))
    elif rq.get('club_ll'): ccx, ccy = tf.transform(*rq['club_ll'])
    else: ccx, ccy = starts[0]
    out['parking'] = [[[round(a, 7), round(b, 7)] for a, b in p['ring']] for p in parks if math.hypot(p['x'] - ccx, p['y'] - ccy) < 320 and 150 < p['area'] < 40000]
    # other mapped buildings beside the clubhouse (cart barn, pro shop, halfway house) that the game doesn't have
    have = [tf.transform(*q) for q in rq.get('have', [])]
    for b in blds:
        if out['club'] and b['ring'] is out['club']['ring']: continue
        if b['area'] < 40 or math.hypot(b['x'] - ccx, b['y'] - ccy) > 220: continue
        if any(math.hypot(b['x'] - a, b['y'] - c) < 6 for a, c in have): continue
        if out['club'] and math.hypot(b['x'] - tf.transform(*np.mean(np.array(out['club']['ring']), 0))[0], b['y'] - tf.transform(*np.mean(np.array(out['club']['ring']), 0))[1]) < 3: continue
        r = measure(b['ring'])
        if r: out['extra'].append(dict(ring=b['ring'], rec=r, area=round(b['area'])))
    json.dump(out, open(f'{OUT}/cb_{key}.json', 'w'), separators=(',', ':'))
    info['club'] = (out['club'] or {}).get('src'); info['parking'] = len(out['parking']); info['extra'] = len(out['extra']); save()
    log(key, 'club', info['club'], 'parking', info['parking'], 'extra', info['extra'])

def main():
    subprocess.run('pip install -q scipy opencv-python-headless', shell=True)
    try: resources = get('https://raw.githubusercontent.com/hobuinc/usgs-lidar/master/boundaries/resources.geojson').json()['features']
    except Exception as e: err('resources', e); return
    for key in KEYS:
        t = time.time()
        try: course(key, REQ[key], resources)
        except Exception as e: err(f'course {key}', e)
        SUM['courses'].setdefault(key, {})['sec'] = round(time.time() - t); save(); time.sleep(2)
    SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save()

if __name__ == '__main__':
    main()
