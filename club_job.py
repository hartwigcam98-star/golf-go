"""Clubhouse survey for every course: lidar (all classes, rasterised to DSM/ground/building-class grids) and aerial photos round each clubhouse.
Input clubs.json {id: {"lat":..,"lon":..,"R":metres,"pref":[ept names]}}"""
import json, math, os, time, re, requests, numpy as np, concurrent.futures as cf
from pyproj import Transformer
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
C = json.load(open('clubs.json'))
LOG = open(f'{OUT}/log.txt', 'w')
def log(*a): s = ' '.join(map(str, a)); print(s, flush=True); LOG.write(s + '\n'); LOG.flush()
def get(u, params=None, t=120, tries=3):
    for k in range(tries):
        try:
            r = requests.get(u, params=params, timeout=t)
            if r.status_code == 200: return r
            log('http', r.status_code, u[:90])
        except Exception as e: log('err', u[:90], e)
        time.sleep(3 * (k + 1))
    return None
# EPT resource index (name, polygon) to pick the newest survey over each clubhouse
res_index = []
r = get('https://raw.githubusercontent.com/hobuinc/usgs-lidar/master/boundaries/resources.geojson', t=300)
if r:
    try:
        from shapely.geometry import shape, Point
        for f in r.json()['features']:
            try: res_index.append((f['properties']['name'], shape(f['geometry'])))
            except Exception: pass
        log('resources', len(res_index))
    except Exception as e: log('index parse', e)
def year(n):
    m = re.findall(r'(20\d\d)', n); return int(m[-1]) if m else (2022 if re.search(r'_B2[0-4]', n) else 2000)
def utm_epsg(lon, lat): return (32600 if lat >= 0 else 32700) + int((lon + 180) // 6) + 1
def merc(lon, lat): R = 6378137.0; return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
def lidar(cid, c):
    import pdal
    from shapely.geometry import Point
    lat, lon, R = c['lat'], c['lon'], c.get('R', 110)
    E = utm_epsg(lon, lat); tf = Transformer.from_crs(4326, E, always_xy=True); inv = Transformer.from_crs(E, 4326, always_xy=True)
    cx, cy = tf.transform(lon, lat); X0, Y0, X1, Y1 = cx - R, cy - R, cx + R, cy + R
    W, S = inv.transform(X0, Y0); Ea, N = inv.transform(X1, Y1)
    cands = [n for n, g in res_index if g.contains(Point(lon, lat))]
    cands = sorted(set(cands), key=lambda n: (-year(n), 'FullState' in n))
    order = list(dict.fromkeys((c.get('pref') or []) + cands))[:5]
    info = dict(box=[X0, Y0, X1, Y1], epsg=E, ll=[W, S, Ea, N], cands=order)
    mx0, my0 = merc(W, S); mx1, my1 = merc(Ea, N); t3 = Transformer.from_crs(3857, E, always_xy=True)
    best = None
    for res in order:
        try:
            spec = [{'type': 'readers.ept', 'filename': f'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/{res}/ept.json', 'bounds': f'([{mx0:.2f},{mx1:.2f}],[{my0:.2f},{my1:.2f}])', 'threads': 4}]
            p = pdal.Pipeline(json.dumps(spec)); n = p.execute(); a = p.arrays[0]
            dens = n / (4 * R * R); log(cid, res, n, 'pts', round(dens, 1), '/m2')
            if n < 2000: continue
            best = (res, a, dens); break
        except Exception as e: log(cid, 'lidar', res, str(e)[:120])
    if not best: info['err'] = 'no lidar'; return info
    res, a, dens = best; info.update(src=res, dens=dens)
    X, Y = t3.transform(a['X'], a['Y']); X = np.asarray(X); Y = np.asarray(Y); Z = np.asarray(a['Z'], float); cl = np.asarray(a['Classification'])
    rs = 0.25; n_ = int(2 * R / rs); ix = np.clip(((X - X0) / rs).astype(int), 0, n_ - 1); iy = np.clip(((Y1 - Y) / rs).astype(int), 0, n_ - 1)
    dsm = np.full((n_, n_), np.nan, np.float32); np.fmax.at(dsm, (iy, ix), Z.astype(np.float32))
    # ground: class 2, gridded at 1 m then nearest-filled
    g = cl == 2; gs = np.full((n_ // 4, n_ // 4), np.nan, np.float32); np.fmin.at(gs, (iy[g] // 4, ix[g] // 4), Z[g].astype(np.float32))
    bc = np.zeros((n_, n_), np.uint8); np.maximum.at(bc, (iy, ix), (cl == 6).astype(np.uint8))
    # vegetation hint: share of returns at 0.5 m that are not the last return of their pulse (canopy lets pulses through, roofs don't)
    nm = n_ // 2; tot = np.zeros((nm, nm), np.int32); mlt = np.zeros((nm, nm), np.int32)
    np.add.at(tot, (iy // 2, ix // 2), 1)
    if 'ReturnNumber' in a.dtype.names and 'NumberOfReturns' in a.dtype.names:
        m = (np.asarray(a['NumberOfReturns']) > 1) & (np.asarray(a['ReturnNumber']) < np.asarray(a['NumberOfReturns']))
        np.add.at(mlt, (iy[m] // 2, ix[m] // 2), 1)
    multi = (np.clip(mlt * 255 // np.maximum(tot, 1), 0, 255)).astype(np.uint8)
    np.savez_compressed(f'{OUT}/{cid}_lidar.npz', dsm=dsm, ground=gs, bld=bc, multi=multi, box=np.array([X0, Y0, X1, Y1]), epsg=E, res=rs)
    if 'GpsTime' in a.dtype.names: info['gps'] = [float(a['GpsTime'].min()), float(a['GpsTime'].max())]
    info['classes'] = {int(k): int(v) for k, v in zip(*np.unique(cl, return_counts=True))}
    return info
MN = None
def aerial(cid, c, info):
    if 'box' not in info: return
    X0, Y0, X1, Y1 = info['box']; E = info['epsg']; W, S, Ea, N = info['ll']; got = []
    if -97.3 < c['lon'] < -89.4 and 43.4 < c['lat'] < 49.4:   # Minnesota imagery server
        for lay in ['met25', 'met20', 'fsa2025', 'fsa2023']:
            r = get('https://imageserver.gisdata.mn.gov/cgi-bin/wms', dict(service='WMS', version='1.1.1', request='GetMap', layers=lay, styles='', srs='EPSG:4326',
                    bbox=f'{W},{S},{Ea},{N}', width=1600, height=1600, format='image/jpeg'))
            if r and r.headers.get('content-type', '').startswith('image') and len(r.content) > 60000:
                open(f'{OUT}/{cid}_{lay}.jpg', 'wb').write(r.content); got.append(lay); break
    r = get('https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage',
            dict(bbox=f'{X0},{Y0},{X1},{Y1}', bboxSR=E, imageSR=E, size='1000,1000', format='jpg', f='image'), tries=4)
    if r and len(r.content) > 20000: open(f'{OUT}/{cid}_naip.jpg', 'wb').write(r.content); got.append('naip')
    info['aerial'] = got
SUM = {}
def one(kv):
    cid, c = kv
    try: info = lidar(cid, c)
    except Exception as e: info = dict(err=str(e)[:200])
    return cid, info
with cf.ThreadPoolExecutor(3) as ex:
    for cid, info in ex.map(one, C.items()):
        SUM[cid] = info; log('done', cid, {k: v for k, v in info.items() if k not in ('box', 'll')})
        json.dump(SUM, open(f'{OUT}/summary.json', 'w'), indent=1)
log('all done')
