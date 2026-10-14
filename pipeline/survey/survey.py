"""Course data survey (Oct 2026): for each course in sites.json, what open data exists, without building anything.
- OpenStreetMap: golf features (holes with ref/par, greens, fairways, tees, bunkers) inside the box, course outlines.
- Lidar: Geological Survey Ireland open lidar (ArcGIS image/map services, discovered at run time): samples a grid of
  points over the course and exports a hillshade picture if covered.
- A picture of the mapped holes over the lidar (or alone).
Output: out/survey/<id>.json, <id>_map.png, <id>_lidar.png, summary.txt"""
import json, os, sys, time, math, io, traceback
import requests, numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = 'out/survey'; os.makedirs(OUT, exist_ok=True)
S = requests.Session(); S.headers['User-Agent'] = 'golf-go-course-survey/1.0 (github actions)'
def log(*a): print(*a, flush=True); open(f'{OUT}/summary.txt', 'a').write(' '.join(str(x) for x in a) + '\n')
OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
def overpass(q):
    for u in OVERPASS:
        for k in range(2):
            try:
                r = S.post(u, data={'data': q}, timeout=180)
                if r.ok: return r.json()
                log('  overpass', u, r.status_code)
            except Exception as e: log('  overpass', u, e)
            time.sleep(5)
    return None
def osm(site):
    s, w, n, e = site['bbox']
    q = f'[out:json][timeout:120];(nwr["golf"]({s},{w},{n},{e});nwr["leisure"="golf_course"]({s},{w},{n},{e});nwr["natural"~"beach|sand|dune|water"]({s},{w},{n},{e});nwr["building"]({s},{w},{n},{e}););out geom tags;'
    d = overpass(q)
    if not d: return None
    els = d['elements']; cnt = {}; holes = []; courses = []
    for el in els:
        t = el.get('tags', {})
        if 'golf' in t: cnt[t['golf']] = cnt.get(t['golf'], 0) + 1
        if t.get('golf') == 'hole': holes.append({k: t.get(k) for k in ('ref', 'par', 'name', 'handicap', 'dist')})
        if t.get('leisure') == 'golf_course': courses.append(t.get('name'))
    cnt['building'] = sum(1 for el in els if 'building' in el.get('tags', {}))
    return dict(counts=cnt, holes=holes, courses=courses, els=els)
# ---------- GSI lidar
GSI_ROOTS = ['https://gsi.geodata.gov.ie/imagehost/rest/services/Lidar', 'https://gsi.geodata.gov.ie/server/rest/services/Lidar',
             'https://gsi.geodata.gov.ie/imagehost/rest/services', 'https://gsi.geodata.gov.ie/server/rest/services']
def gsi_services():
    found = []
    for root in GSI_ROOTS:
        try:
            r = S.get(root, params={'f': 'json'}, timeout=60); j = r.json()
            log('  gsi', root, 'folders', j.get('folders'), 'services', [(x['name'], x['type']) for x in j.get('services', [])])
            for x in j.get('services', []):
                base = root.split('/rest/services')[0] + '/rest/services/' + x['name'] + '/' + x['type']
                if x['type'] in ('ImageServer', 'MapServer') and ('idar' in x['name'] or 'DTM' in x['name'] or 'DEM' in x['name'] or 'Elev' in x['name']): found.append((base, x['type']))
        except Exception as e: log('  gsi', root, 'ERR', e)
    return list(dict.fromkeys(found))
def gsi_sample(svc, site):
    base, typ = svc; s, w, n, e = site['bbox']; res = {'service': base}
    try: res['info'] = {k: v for k, v in S.get(base, params={'f': 'json'}, timeout=60).json().items() if k in ('name', 'description', 'pixelSizeX', 'pixelSizeY', 'extent', 'copyrightText', 'serviceDescription', 'units')}
    except Exception as ex: res['info_err'] = str(ex)
    if typ != 'ImageServer':   # coverage layers: which survey footprints touch the course box
        try:
            env=json.dumps({'xmin':w,'ymin':s,'xmax':e,'ymax':n,'spatialReference':{'wkid':4326}})
            j=S.get(base+'/0/query',params={'geometry':env,'geometryType':'esriGeometryEnvelope','inSR':4326,'spatialRel':'esriSpatialRelIntersects','outFields':'*','returnGeometry':'false','f':'json'},timeout=60).json()
            res['footprints']=[f.get('attributes') for f in j.get('features',[])][:20];res['covered']=len(j.get('features',[]))
            if 'error' in j:res['q_err']=j['error']
        except Exception as ex: res['q_err']=str(ex)
        return res
    vals = []
    for la in np.linspace(s, n, 6):
        for lo in np.linspace(w, e, 6):
            try:
                g = json.dumps({'x': lo, 'y': la, 'spatialReference': {'wkid': 4326}})
                j = S.get(base + '/identify', params={'geometry': g, 'geometryType': 'esriGeometryPoint', 'returnGeometry': 'false', 'returnCatalogItems': 'false', 'f': 'json'}, timeout=60).json()
                vals.append(j.get('value'))
            except Exception as ex: vals.append('ERR ' + str(ex)[:60])
    ctl=[(53.3438,-6.2546),(51.8985,-8.4756),(53.5,-7.35),(52.67,-8.63),(53.27,-9.05)]
    cv=[]
    for la,lo in ctl:
        try:cv.append(S.get(base+'/identify',params={'geometry':json.dumps({'x':lo,'y':la,'spatialReference':{'wkid':4326}}),'geometryType':'esriGeometryPoint','returnGeometry':'false','returnCatalogItems':'false','f':'json'},timeout=60).json().get('value'))
        except Exception as ex:cv.append('ERR')
    res['control']=cv
    res['values'] = vals; res['covered'] = sum(1 for v in vals if v not in (None, 'NoData', '') and not str(v).startswith('ERR'))
    if res['covered']:
        try:
            r = S.get(base + '/exportImage', params={'bbox': f'{w},{s},{e},{n}', 'bboxSR': 4326, 'imageSR': 4326, 'size': '1400,1200', 'format': 'tiff', 'pixelType': 'F32', 'noData': -9999, 'f': 'image'}, timeout=180)
            open(f"{OUT}/{site['id']}_{base.split('/')[-2].replace('/', '_')}.tif", 'wb').write(r.content); res['tif_bytes'] = len(r.content)
        except Exception as ex: res['export_err'] = str(ex)
    return res
def picture(site, O, tifs):
    fig, ax = plt.subplots(figsize=(12, 12), dpi=110); s, w, n, e = site['bbox']
    for t in tifs:
        try:
            import tifffile; Z = tifffile.imread(t).astype(float); Z[Z < -100] = np.nan
            gy, gx = np.gradient(np.nan_to_num(Z, nan=np.nanmean(Z))); hs = np.clip(.6 - .9 * gx / 2 + .9 * gy / 2, 0, 1)
            ax.imshow(hs, extent=[w, e, s, n], cmap='gray', origin='upper', alpha=.9); break
        except Exception as ex: log('  hillshade', t, ex)
    col = {'hole': '#d22', 'green': '#2a2', 'fairway': '#9d6', 'tee': '#6a3', 'bunker': '#eda', 'rough': '#686', 'water_hazard': '#39f', 'lateral_water_hazard': '#39f'}
    for el in (O or {}).get('els', []):
        t = el.get('tags', {}); k = t.get('golf'); g = el.get('geometry')
        if not g or not k: continue
        xs = [p['lon'] for p in g]; ys = [p['lat'] for p in g]
        if k == 'hole':
            ax.plot(xs, ys, color='#d22', lw=1.5); ax.text(xs[0], ys[0], t.get('ref', '?'), color='#d22', fontsize=9, weight='bold')
        else: ax.fill(xs, ys, color=col.get(k, '#888'), alpha=.75, lw=.3)
    ax.set_xlim(w, e); ax.set_ylim(s, n); ax.set_aspect(1 / math.cos(math.radians((s + n) / 2))); ax.set_title(site['name'] + ' — OpenStreetMap golf features' + (' over GSI lidar hillshade' if tifs else ''))
    fig.savefig(f"{OUT}/{site['id']}_map.png", bbox_inches='tight'); plt.close(fig)
if __name__ == '__main__':
    sites = json.load(open(os.path.join(HERE, 'sites.json'))); svcs = None
    for site in sites:
        try:
            log('==', site['id'], site['name'])
            O = osm(site)
            if O: log('  OSM counts', O['counts'], 'courses', O['courses'], 'holes', len(O['holes'])); log('  holes', sorted(O['holes'], key=lambda h: (h.get('name') or '', int(h['ref']) if (h.get('ref') or '').isdigit() else 99)))
            else: log('  OSM: no answer')
            L = []
            if site.get('country') == 'IE':
                if svcs is None: svcs = gsi_services(); log('  GSI elevation services', svcs)
                for sv in svcs:
                    r = gsi_sample(sv, site); L.append(r); log('  GSI', sv[0].split('/Lidar/')[-1], 'covered', r.get('covered'), 'control(Dublin,Cork,Midlands,Limerick,Galway)', r.get('control'), 'footprints', json.dumps(r.get('footprints'))[:800] if r.get('footprints') else '', r.get('q_err',''), 'px', (r.get('info') or {}).get('pixelSizeX'))
            tifs = sorted(os.path.join(OUT, f) for f in os.listdir(OUT) if f.startswith(site['id']) and f.endswith('.tif'))
            picture(site, O, tifs)
            json.dump({'osm': {k: v for k, v in (O or {}).items() if k != 'els'}, 'lidar': L}, open(f"{OUT}/{site['id']}.json", 'w'), indent=1)
        except Exception: log(traceback.format_exc())
