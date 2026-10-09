# RTJ Golf Trail at Silver Lakes (Glencoe, AL): Heartbreaker, Mindbreaker and Backbreaker nines on one map.
# Fetches OSM, NED, NAIP, 3DEP 1 m and lidar ground points around the greens; results go to the "course-data" branch.
import json, math, os, sys, time, re, traceback
import numpy as np, requests
from concurrent.futures import ProcessPoolExecutor, as_completed
JOB = {"name": "silver lakes (rtj trail, glencoe al)", "search": [[33.86, -86.04, 34.02, -85.84]],
       "want": {"silverlakes": r"silver lake"},
       "holes": {"silverlakes": r"silver lake|heartbreaker|mindbreaker|backbreaker"},
       "steps": {"silverlakes": "all"}}
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
SUM = {'started': time.strftime('%Y-%m-%d %H:%M:%S'), 'courses': {}, 'errors': [], 'naip_src': None}
def save(): json.dump(SUM, open(f'{OUT}/summary.json', 'w'), indent=1)
def log(*a): print(time.strftime('%H:%M:%S'), *a, flush=True)
def err(where, e):
    SUM['errors'].append(f'{where}: {e}'); log('FAIL', where, e); traceback.print_exc(); save()
from pyproj import Transformer
S = requests.Session(); S.headers['User-Agent'] = 'golf-go-course-builder (github.com/hartwigcam98-star/golf-go)'
def get(url, params=None, tries=5, post=None, timeout=300):
    for k in range(tries):
        try:
            r = S.post(url, data=post, timeout=timeout) if post is not None else S.get(url, params=params, timeout=timeout)
            if r.status_code == 200: return r
            log('  http', r.status_code, url[:80], r.text[:200])
        except Exception as e:
            log('  err', e)
        time.sleep(8 * (k + 1))
    raise RuntimeError('failed ' + url)
OVP = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
def overpass(q):
    last = None
    for u in OVP:
        try: return get(u, post={'data': q}, tries=2).json()
        except Exception as e: last = e; log('  overpass mirror failed', u, e)
    raise last
def bbox_of(el):
    if 'bounds' in el: b = el['bounds']; return [b['minlon'], b['minlat'], b['maxlon'], b['maxlat']]
    pts = [(p['lon'], p['lat']) for p in el.get('geometry', [])] + [(p['lon'], p['lat']) for m in el.get('members', []) for p in m.get('geometry', [])]
    if not pts: return None
    xs, ys = zip(*pts); return [min(xs), min(ys), max(xs), max(ys)]
def grow(b, m):  # metres
    lat = (b[1] + b[3]) / 2; dx = m / (111320 * math.cos(math.radians(lat))); dy = m / 110574
    return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy]
UTMZ = lambda lon: 26900 + int((lon + 180) // 6) + 1

# ---------- 1. find the courses in OpenStreetMap
def rings_el(el):
    if el.get('type') == 'way': return [[(p['lon'], p['lat']) for p in el.get('geometry', [])]]
    return [[(p['lon'], p['lat']) for p in m.get('geometry', [])] for m in el.get('members', []) if m.get('role') in ('outer', '') and m.get('geometry')]
def discover():
    boxes = JOB['search'] if isinstance(JOB['search'][0], list) else [JOB['search']]
    d = {'elements': []}
    for s, w, n, e in boxes:
        dd = overpass(f'[out:json][timeout:180];(nwr["leisure"="golf_course"]({s},{w},{n},{e});way["golf"="hole"]({s},{w},{n},{e}););out geom;')
        d['elements'] += dd['elements']
    json.dump(d, open(f'{OUT}/osm_courses.json', 'w'))
    gc = [el for el in d['elements'] if el.get('tags', {}).get('leisure') == 'golf_course']
    found = [(el.get('tags', {}).get('name', ''), el['type'] + '/' + str(el['id']), bbox_of(el)) for el in gc]
    holes = [el for el in d['elements'] if el.get('tags', {}).get('golf') == 'hole']
    SUM['osm_golf_courses'] = found; SUM['osm_hole_names'] = sorted({h.get('tags', {}).get('name', '') for h in holes})[:300]
    log('golf courses:', found)
    res = {}
    for key, rx in JOB['want'].items():
        if key in JOB.get('boxes', {}):
            b = JOB['boxes'][key]; res[key] = dict(osm=[], names=[key + ' box'], bbox=b, rings=[[(b[0], b[1]), (b[2], b[1]), (b[2], b[3]), (b[0], b[3]), (b[0], b[1])]], via='box'); continue
        m = [(f, el) for f, el in zip(found, gc) if f[2] and re.search(rx, f[0].lower())]
        if m:
            area = lambda b: (b[2] - b[0]) * (b[3] - b[1])
            f, el = min(m, key=lambda t: area(t[0][2]))
            res[key] = dict(osm=[f[1]], names=[f[0]], bbox=f[2], rings=rings_el(el), via='course outline')
        elif key in JOB.get('ids', {}):
            el = next((el for f, el in zip(found, gc) if f[1] == JOB['ids'][key]), None)
            if el is not None:
                f = next(f for f in found if f[1] == JOB['ids'][key])
                res[key] = dict(osm=[f[1]], names=[f[0] or 'unnamed outline'], bbox=f[2], rings=rings_el(el), via='osm id')
        else:   # no named outline: use the holes named after the course
            hs = [h for h in holes if re.search(JOB['holes'][key], (h.get('tags', {}).get('name', '') or '').lower())]
            if hs:
                pts = [(p['lon'], p['lat']) for h in hs for p in h.get('geometry', [])]
                b = grow([min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)], 120)
                res[key] = dict(osm=[], names=[f'{len(hs)} holes'], bbox=b, rings=[[(b[0], b[1]), (b[2], b[1]), (b[2], b[3]), (b[0], b[3])]], via='named holes')
    SUM['picked'] = {k: {kk: vv for kk, vv in v.items() if kk != 'rings'} for k, v in res.items()}; save()
    return res

# ---------- 2. all map features (course + surroundings)
def osm_all(resort):
    w, s, e, n = grow(resort, 3200)
    B = f'({s},{w},{n},{e})'
    q = (f'[out:json][timeout:600][maxsize:536870912];('
         f'nwr["golf"]{B};nwr["leisure"]{B};nwr["natural"]{B};nwr["landuse"]{B};nwr["waterway"]{B};'
         f'nwr["highway"]{B};nwr["building"]{B};nwr["amenity"="parking"]{B};nwr["railway"]{B};nwr["man_made"]{B};nwr["barrier"]{B};'
         f');out geom;')
    d = overpass(q); json.dump(d, open(f'{OUT}/osm_all.json', 'w'))
    SUM['osm_all'] = dict(bbox=[w, s, e, n], n=len(d['elements'])); log('osm features', len(d['elements'])); save()
    return d

# ---------- 3. NED 10 m grids (same as the original courses: opentopodata ned10m)
def ned(points):
    out = []
    for i in range(0, len(points), 100):
        chunk = points[i:i + 100]
        r = get('https://api.opentopodata.org/v1/ned10m', params={'locations': '|'.join(f'{la:.6f},{lo:.6f}' for la, lo in chunk)})
        out += [x['elevation'] for x in r.json()['results']]
        time.sleep(1.1)
    return out
def ned_grids(key, b):
    W, S_, E, N = grow(b, 150); st = 0.0005
    latN = math.ceil(N / st) * st; latS = math.floor(S_ / st) * st; lonW = math.floor(W / st) * st; lonE = math.ceil(E / st) * st
    NR = int(round((latN - latS) / st)) + 1; NC = int(round((lonE - lonW) / st)) + 1
    pts = [(latN - r * st, lonW + c * st) for r in range(NR) for c in range(NC)]
    z = ned(pts); json.dump(dict(latN=latN, latS=latS, lonW=lonW, lonE=lonE, st=st, NR=NR, NC=NC, z=z), open(f'{OUT}/ned_{key}.json', 'w'))
    # wide grid for the distant land: 17x17 over about 4 x 4 km round the course
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2; hy = 0.018; hx = hy / math.cos(math.radians(cy)) * 1.0
    wn = 17; pts = [(cy + hy - r * 2 * hy / (wn - 1), cx - hx + c * 2 * hx / (wn - 1)) for r in range(wn) for c in range(wn)]
    zw = ned(pts); json.dump(dict(latN=cy + hy, latS=cy - hy, lonW=cx - hx, lonE=cx + hx, N=wn, z=zw), open(f'{OUT}/nedwide_{key}.json', 'w'))
    log(key, 'ned', NR, 'x', NC, 'wide', wn)

# ---------- 4. NAIP aerial photo (about 0.6 m pixels)
NAIP = ['https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer/exportImage',
        'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage',
        'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage']
def export_json(url, b, size, **kw):
    p = dict(bbox=','.join(map(str, b)), bboxSR=4326, imageSR=4326, size=f'{size[0]},{size[1]}', f='json', **kw)
    j = get(url, params=p).json()
    if 'href' not in j: raise RuntimeError(str(j)[:300])
    img = get(j['href']).content; ex = j['extent']
    return img, [ex['xmin'], ex['ymin'], ex['xmax'], ex['ymax']], [j['width'], j['height']]
def naip(key, b):
    b = grow(b, 60); lat = (b[1] + b[3]) / 2
    w = int((b[2] - b[0]) * 111320 * math.cos(math.radians(lat)) / .6); h = int((b[3] - b[1]) * 110574 / .6)
    sc = min(1, 4000 / max(w, h)); size = [int(w * sc), int(h * sc)]
    for u in ([SUM['naip_src']] if SUM['naip_src'] else []) + NAIP:
        try:
            img, ext, sz = export_json(u, b, size, format='jpg', compressionQuality=90)
            if len(img) < 50000: raise RuntimeError('tiny image %d' % len(img))
            open(f'{OUT}/naip_{key}.jpg', 'wb').write(img)
            json.dump(dict(bbox=b, size=sz, ext=ext, src=u), open(f'{OUT}/naip_{key}.json', 'w'))
            SUM['naip_src'] = u; log(key, 'naip', sz, len(img) // 1024, 'KB from', u); return
        except Exception as e: log('  naip source failed', u, e)
    raise RuntimeError('no NAIP source worked')

# ---------- 5. 3DEP 1 m elevation: the original lon/lat export (course-wide grid) and square UTM metres (greens)
IMG = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage'
def dem_ll(key, b):
    b = grow(b, 120); lat = (b[1] + b[3]) / 2
    w = int((b[2] - b[0]) * 111320 * math.cos(math.radians(lat))); h = int((b[3] - b[1]) * 110574)
    r = get(IMG, dict(bbox=','.join(map(str, b)), bboxSR=4326, imageSR=4326, size=f'{w},{h}', format='bsq', pixelType='F32',
                      interpolation='RSP_BilinearInterpolation', f='image'))
    if len(r.content) < w * h * 4: raise RuntimeError('short dem %d for %dx%d' % (len(r.content), w, h))
    Z = np.frombuffer(r.content[:w * h * 4], '<f4').reshape(h, w).copy()
    res = max((b[2] - b[0]) / w, (b[3] - b[1]) / h); cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2   # the server widens to square-degree pixels
    ext = [cx - res * w / 2, cy - res * h / 2, cx + res * w / 2, cy + res * h / 2]
    np.savez_compressed(f'{OUT}/demll_{key}.npz', z=Z)
    json.dump(dict(bbox=b, size=[w, h], fmt='bsq', ext=ext), open(f'{OUT}/lidar_{key}.json', 'w')); log(key, 'dem lon/lat', w, h)
def dem_utm(key, b):
    W, S_, E, N = grow(b, 120); EPSG = UTMZ((W + E) / 2)
    tf = Transformer.from_crs(4326, EPSG, always_xy=True)
    xs, ys = tf.transform([W, E, W, E], [S_, S_, N, N])
    x0, y0, x1, y1 = math.floor(min(xs)), math.floor(min(ys)), math.ceil(max(xs)), math.ceil(max(ys))
    w, h = x1 - x0, y1 - y0; Z = np.full((h, w), np.nan, np.float32); T = 1000
    for ty in range(y0, y1, T):
        for tx in range(x0, x1, T):
            tw, th = min(T, x1 - tx), min(T, y1 - ty)
            r = get(IMG, dict(bbox=f'{tx},{ty},{tx+tw},{ty+th}', bboxSR=EPSG, imageSR=EPSG, size=f'{tw},{th}', format='bsq',
                               pixelType='F32', interpolation='RSP_BilinearInterpolation', f='image'))
            a = np.frombuffer(r.content[:tw * th * 4], '<f4').reshape(th, tw).copy(); a[(a < -1000) | (a > 10000)] = np.nan
            r0 = y1 - (ty + th); Z[r0:r0 + th, tx - x0:tx - x0 + tw] = a
    np.savez_compressed(f'{OUT}/dem_{key}.npz', z=Z, x0=x0, y1=y1, res=1.0, epsg=EPSG)
    lo = np.linspace(W, E, 5); la = np.linspace(S_, N, 5); LO, LA = np.meshgrid(lo, la); X, Y = tf.transform(LO.ravel(), LA.ravel())
    SUM['courses'][key]['dem'] = dict(epsg=EPSG, x0=x0, y0=y0, x1=x1, y1=y1, w=w, h=h, nan=int(np.isnan(Z).sum()),
        ctrl=[[float(a), float(b_), float(c), float(d)] for a, b_, c, d in zip(LO.ravel(), LA.ravel(), X, Y)])
    log(key, 'dem utm', w, 'x', h)

# ---------- 6. raw lidar ground points round every green
EPT = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/%s/ept.json'
def merc(lon, lat): R = 6378137.0; return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
def read_green(key, gi, res, box, epsg):
    import pdal
    W, S_, E, N = box; x0, y0 = merc(W, S_); x1, y1 = merc(E, N)
    spec = [{'type': 'readers.ept', 'filename': EPT % res, 'bounds': f'([{x0:.2f},{x1:.2f}],[{y0:.2f},{y1:.2f}])', 'threads': 6}]
    t = time.time(); p = pdal.Pipeline(json.dumps(spec)); n = p.execute(); arrs = p.arrays; a = arrs[0] if arrs else None
    info = dict(n=int(n), sec=round(time.time() - t, 1))
    if a is None or len(a) == 0: return key, gi, res, info, None
    cls = a['Classification'].astype(int); info['classes'] = {int(k): int(v) for k, v in zip(*np.unique(cls, return_counts=True))}
    g = a[cls == 2]
    if len(g) == 0: return key, gi, res, info, None
    tf = Transformer.from_crs(3857, epsg, always_xy=True); X, Y = tf.transform(g['X'], g['Y']); X = np.asarray(X); Y = np.asarray(Y)
    ox, oy = math.floor(X.min()), math.floor(Y.min())
    d = dict(ox=ox, oy=oy, x=np.round((X - ox) * 100).astype(np.int32), y=np.round((Y - oy) * 100).astype(np.int32), z=np.round(np.asarray(g['Z']) * 1000).astype(np.int32))
    if 'GpsTime' in g.dtype.names: info['gps'] = [float(g['GpsTime'].min()), float(g['GpsTime'].max())]
    info['ground'] = int(len(g)); info['gdens'] = round(len(g) / max((X.max() - X.min()) * (Y.max() - Y.min()), 1), 2)
    return key, gi, res, info, d
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
def greens_points(key, b, osm, resources, rings):
    W, S_, E, N = grow(b, 60); epsg = UTMZ((W + E) / 2)
    greens = [dict(id=f'traced/{i}', bbox=grow(list(bb), 25)) for i, bb in enumerate(JOB.get('greens', {}).get(key, []))]
    for el in ([] if greens else osm['elements']):
        if el.get('tags', {}).get('golf') != 'green': continue
        bb = bbox_of(el)
        if not bb: continue
        c = ((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)
        if not any(len(r) > 2 and pip(c, r) for r in rings): continue
        greens.append(dict(id=el['type'] + '/' + str(el['id']), bbox=grow(bb, 25)))
    for g in greens:
        x0, y0, x1, y1 = g['bbox']; pts = [(x0, y0), (x1, y0), (x0, y1), (x1, y1), ((x0 + x1) / 2, (y0 + y1) / 2)]
        g['cand'] = [f['properties']['name'] for f in resources if any(pip(q, r) for q in pts for r in rings_of(f['geometry']))]
    try:
        base = 'https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/24/query'
        for g in greens:
            x0, y0, x1, y1 = g['bbox']; q = get(base, dict(geometry=f'{(x0+x1)/2},{(y0+y1)/2}', geometryType='esriGeometryPoint', inSR=4326, spatialRel='esriSpatialRelIntersects', outFields='workunit,project,collect_start,collect_end,ql', returnGeometry='false', f='json')).json()
            g['wesm'] = [ft['attributes'] for ft in q.get('features', [])]
            names = {f['properties']['name'] for f in resources}
            for a in g['wesm']:
                for nm in (a.get('workunit'), a.get('project')):
                    if nm and nm in names and nm not in g['cand']: g['cand'].append(nm)
    except Exception as e: err(f'wesm {key}', e)
    SUM['courses'][key]['greens'] = greens; save()
    jobs = [(key, gi, r, g['bbox'], epsg) for gi, g in enumerate(greens) for r in g['cand']]
    pack = {}; info_all = {}
    with ProcessPoolExecutor(6) as ex:
        fs = [ex.submit(read_green, *j) for j in jobs]
        for f in as_completed(fs):
            try: k, gi, r, info, d = f.result()
            except Exception as e: err(f'points {key}', e); continue
            info_all.setdefault(str(gi), {})[r] = info; log(key, gi, r, info.get('ground'), 'ground', info.get('gdens'), '/m2')
            if d is not None:
                for kk, v in d.items(): pack[f'g{gi}|{r}|{kk}'] = np.asarray(v)
    np.savez_compressed(f'{OUT}/pts_{key}.npz', **pack); SUM['courses'][key]['points'] = info_all
    log(key, 'points saved', os.path.getsize(f'{OUT}/pts_{key}.npz') // 1024, 'KB'); save()

def main():
    import subprocess   # keep the earlier courses' files on the results branch
    try:
        subprocess.run(['git', 'clone', '-q', '--depth', '1', '-b', 'course-data', f"https://github.com/{os.environ.get('GITHUB_REPOSITORY','hartwigcam98-star/golf-go')}", '/tmp/prev'], check=True)
        subprocess.run('cp -rn /tmp/prev/. out/ 2>/dev/null; rm -rf out/.git; [ -f out/summary.json ] && mv out/summary.json out/summary_prev_az0.json; [ -f out/run.log ] && mv out/run.log out/run_prev_az0.log; true', shell=True)
    except Exception as e: SUM['errors'].append(f'keep old: {e}')
    try: res = discover()
    except Exception as e: err('discover', e); return
    if not res: err('discover', 'none of the wanted courses found; see osm_golf_courses'); return
    if JOB.get('discover_only'):
        # hole summary per wanted course: refs, names, pars, and the golf feature counts inside each picked box
        d = json.load(open(f'{OUT}/osm_courses.json'))
        for key, c in res.items():
            b = c['bbox']; inb = lambda el: (lambda bb: bb and b[0] - .003 < (bb[0] + bb[2]) / 2 < b[2] + .003 and b[1] - .003 < (bb[1] + bb[3]) / 2 < b[3] + .003)(bbox_of(el))
            hs = [el for el in d['elements'] if el.get('tags', {}).get('golf') == 'hole' and inb(el)]
            c['holes'] = sorted([[el['tags'].get('ref', ''), el['tags'].get('name', ''), el['tags'].get('par', ''), el['id']] for el in hs], key=lambda t: (t[1], t[0]))
        SUM['picked'] = {k: {kk: vv for kk, vv in v.items() if kk != 'rings'} for k, v in res.items()}
        SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save(); return
    try: resources = get('https://raw.githubusercontent.com/hobuinc/usgs-lidar/master/boundaries/resources.geojson').json()['features']
    except Exception as e: resources = []; err('resources', e)
    # one map download per resort: courses within 6 km of each other share it
    groups = []
    for key, c in res.items():
        cx, cy = (c['bbox'][0] + c['bbox'][2]) / 2, (c['bbox'][1] + c['bbox'][3]) / 2
        for g in groups:
            if abs(g['c'][0] - cx) * 76000 < 6000 and abs(g['c'][1] - cy) * 111000 < 6000: g['k'].append(key); break
        else: groups.append({'c': (cx, cy), 'k': [key]})
    for gi_, g in enumerate(groups):
        bb = [min(res[k]['bbox'][0] for k in g['k']), min(res[k]['bbox'][1] for k in g['k']), max(res[k]['bbox'][2] for k in g['k']), max(res[k]['bbox'][3] for k in g['k'])]
        osm = None
        try:
            osm = osm_all(bb); os.replace(f'{OUT}/osm_all.json', f'{OUT}/osm_{"_".join(g["k"])}.json')
        except Exception as e: err('osm_all', e)
        for key in g['k']:
            c = res[key]; SUM['courses'][key] = {k: v for k, v in c.items() if k != 'rings'}; save(); b = c['bbox']
            mode = JOB['steps'].get(key)
            if not mode: continue
            for step in ((ned_grids, naip, dem_ll, dem_utm) if mode == 'all' else ()):   # mode 'points': green point clouds only
                try: step(key, b)
                except Exception as e: err(f'{step.__name__} {key}', e)
                save()
            if osm is not None:
                try: greens_points(key, b, osm, resources, c['rings'])
                except Exception as e: err(f'greens {key}', e)
    SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save()

if __name__ == '__main__':
    main()
