"""Royal Golf Club clubhouse: lidar point cloud (all classes) + DSM, and aerial photos (NAIP + MN Geospatial Commons WMS), around the clubhouse."""
import json, math, os, time, io, requests, numpy as np
from pyproj import Transformer
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
LAT, LON, R = 44.97462, -92.86909, 110.0          # clubhouse centre, half-box in metres
LOG = open(f'{OUT}/log.txt', 'w')
def log(*a): s = ' '.join(map(str, a)); print(s, flush=True); LOG.write(s + '\n'); LOG.flush()
tf = Transformer.from_crs(4326, 26915, always_xy=True); cx, cy = tf.transform(LON, LAT)
X0, Y0, X1, Y1 = cx - R, cy - R, cx + R, cy + R
inv = Transformer.from_crs(26915, 4326, always_xy=True)
W, S = inv.transform(X0, Y0); E, N = inv.transform(X1, Y1)
json.dump(dict(utm=[X0, Y0, X1, Y1], ll=[W, S, E, N], centre=[LON, LAT], epsg=26915), open(f'{OUT}/box.json', 'w'))
def get(u, params=None, t=120):
    for k in range(3):
        try:
            r = requests.get(u, params=params, timeout=t)
            if r.status_code == 200: return r
            log('http', r.status_code, u, r.text[:200])
        except Exception as e: log('err', u, e)
        time.sleep(3)
    return None
# 1. aerials
r = get('https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage',
        dict(bbox=f'{X0},{Y0},{X1},{Y1}', bboxSR=26915, imageSR=26915, size='1100,1100', format='jpg', f='image'))
if r: open(f'{OUT}/naip.jpg', 'wb').write(r.content); log('naip', len(r.content))
cap = get('https://imageserver.gisdata.mn.gov/cgi-bin/wms', dict(service='WMS', request='GetCapabilities'))
layers = []
if cap:
    open(f'{OUT}/mn_wms_caps.xml', 'w').write(cap.text)
    import re
    layers = re.findall(r'<Layer[^>]*>\s*<Name>([^<]+)</Name>\s*<Title>([^<]*)</Title>', cap.text)
    log('mn layers', len(layers), layers[:80])
for name, title in layers:
    if not re.search(r'met|wash|20(1[8-9]|2\d)|fsa|naip', name + ' ' + title, re.I): continue
    r = get('https://imageserver.gisdata.mn.gov/cgi-bin/wms', dict(service='WMS', version='1.1.1', request='GetMap', layers=name, styles='', srs='EPSG:26915',
            bbox=f'{X0},{Y0},{X1},{Y1}', width=1600, height=1600, format='image/jpeg'))
    if r and r.headers.get('content-type', '').startswith('image') and len(r.content) > 20000:
        open(f'{OUT}/mn_{name}.jpg', 'wb').write(r.content); log('mn', name, title, len(r.content))
# 2. lidar
import pdal
def merc(lon, lat):
    Rr = 6378137.0; return Rr * math.radians(lon), Rr * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
mx0, my0 = merc(W, S); mx1, my1 = merc(E, N)
for res in ['MN_CentralMissRiver_5_B22', 'MN_FullState', 'USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016']:
    try:
        spec = [{'type': 'readers.ept', 'filename': f'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/{res}/ept.json', 'bounds': f'([{mx0:.2f},{mx1:.2f}],[{my0:.2f},{my1:.2f}])', 'threads': 6}]
        p = pdal.Pipeline(json.dumps(spec)); n = p.execute(); a = p.arrays[0]
        t3 = Transformer.from_crs(3857, 26915, always_xy=True); X, Y = t3.transform(a['X'], a['Y']); X = np.asarray(X); Y = np.asarray(Y); Z = np.asarray(a['Z'])
        d = dict(x=((X - X0) * 100).astype(np.int32), y=((Y - Y0) * 100).astype(np.int32), z=(Z * 1000).astype(np.int32), c=a['Classification'].astype(np.uint8))
        for k in ('Intensity', 'ReturnNumber', 'NumberOfReturns', 'Red', 'Green', 'Blue'):
            if k in a.dtype.names: d[k] = a[k]
        if 'GpsTime' in a.dtype.names: log(res, 'gps', float(a['GpsTime'].min()), float(a['GpsTime'].max()))
        np.savez_compressed(f'{OUT}/pts_{res}.npz', **d); log(res, 'points', n, 'dims', a.dtype.names)
    except Exception as e: log('lidar', res, e)
log('done')
