# Golf Go course fetch job (template auto/fetch_job_tmpl.py, filled by auto/mkjob.py). Results go to the 'course-data' branch (this run only).
# Fetches OSM, NED, NAIP, 3DEP 1 m and lidar ground points around the greens; results go to the "course-data" branch.
import json, math, os, sys, time, re, traceback
import numpy as np, requests
from concurrent.futures import ProcessPoolExecutor, as_completed
JOB = json.loads(r'''{"rushcreek": {"res": "MN_CentralMissRiver_4_B22", "epsg": 32615, "tiles": [[-93.5352297, 45.1018643, -93.5326845, 45.103673], [-93.5326845, 45.1018643, -93.5301393, 45.103673], [-93.5301393, 45.1018643, -93.5275941, 45.103673], [-93.5275941, 45.1018643, -93.525049, 45.103673], [-93.5199586, 45.1018643, -93.5174134, 45.103673], [-93.5174134, 45.1018643, -93.5148682, 45.103673], [-93.5148682, 45.1018643, -93.5123231, 45.103673], [-93.5123231, 45.1018643, -93.5097779, 45.103673], [-93.5097779, 45.1018643, -93.5072327, 45.103673], [-93.5352297, 45.1000555, -93.5326845, 45.1018643], [-93.5326845, 45.1000555, -93.5301393, 45.1018643], [-93.5301393, 45.1000555, -93.5275941, 45.1018643], [-93.5275941, 45.1000555, -93.525049, 45.1018643], [-93.525049, 45.1000555, -93.5225038, 45.1018643], [-93.5225038, 45.1000555, -93.5199586, 45.1018643], [-93.5199586, 45.1000555, -93.5174134, 45.1018643], [-93.5174134, 45.1000555, -93.5148682, 45.1018643], [-93.5148682, 45.1000555, -93.5123231, 45.1018643], [-93.5123231, 45.1000555, -93.5097779, 45.1018643], [-93.5097779, 45.1000555, -93.5072327, 45.1018643], [-93.5275941, 45.0982468, -93.525049, 45.1000555], [-93.525049, 45.0982468, -93.5225038, 45.1000555], [-93.5225038, 45.0982468, -93.5199586, 45.1000555], [-93.5199586, 45.0982468, -93.5174134, 45.1000555], [-93.5174134, 45.0982468, -93.5148682, 45.1000555], [-93.5148682, 45.0982468, -93.5123231, 45.1000555], [-93.5123231, 45.0982468, -93.5097779, 45.1000555], [-93.5275941, 45.0964381, -93.525049, 45.0982468], [-93.525049, 45.0964381, -93.5225038, 45.0982468], [-93.5225038, 45.0964381, -93.5199586, 45.0982468], [-93.5199586, 45.0964381, -93.5174134, 45.0982468], [-93.5174134, 45.0964381, -93.5148682, 45.0982468], [-93.5148682, 45.0964381, -93.5123231, 45.0982468], [-93.5123231, 45.0964381, -93.5097779, 45.0982468], [-93.525049, 45.0946293, -93.5225038, 45.0964381], [-93.5225038, 45.0946293, -93.5199586, 45.0964381], [-93.5199586, 45.0946293, -93.5174134, 45.0964381], [-93.5174134, 45.0946293, -93.5148682, 45.0964381], [-93.5148682, 45.0946293, -93.5123231, 45.0964381], [-93.5123231, 45.0946293, -93.5097779, 45.0964381], [-93.5225038, 45.0928206, -93.5199586, 45.0946293], [-93.5199586, 45.0928206, -93.5174134, 45.0946293], [-93.5123231, 45.0928206, -93.5097779, 45.0946293], [-93.5225038, 45.0910118, -93.5199586, 45.0928206], [-93.5199586, 45.0910118, -93.5174134, 45.0928206]], "bbox": [-93.53522968417407, 45.09270743453929, -93.50966732934951, 45.10367302449815]}, "mystic": {"res": "MN_CentralMissRiver_6_B22", "epsg": 26915, "tiles": [[-93.4883602, 44.7336435, -93.4858312, 44.7354522], [-93.4858312, 44.7336435, -93.4833023, 44.7354522], [-93.4833023, 44.7336435, -93.4807734, 44.7354522], [-93.4807734, 44.7336435, -93.4782445, 44.7354522], [-93.4782445, 44.7336435, -93.4757156, 44.7354522], [-93.4757156, 44.7336435, -93.4731866, 44.7354522], [-93.4731866, 44.7336435, -93.4706577, 44.7354522], [-93.4883602, 44.7318347, -93.4858312, 44.7336435], [-93.4858312, 44.7318347, -93.4833023, 44.7336435], [-93.4833023, 44.7318347, -93.4807734, 44.7336435], [-93.4807734, 44.7318347, -93.4782445, 44.7336435], [-93.4782445, 44.7318347, -93.4757156, 44.7336435], [-93.4883602, 44.730026, -93.4858312, 44.7318347], [-93.4858312, 44.730026, -93.4833023, 44.7318347], [-93.4833023, 44.730026, -93.4807734, 44.7318347], [-93.4807734, 44.730026, -93.4782445, 44.7318347], [-93.4782445, 44.730026, -93.4757156, 44.7318347], [-93.4883602, 44.7282172, -93.4858312, 44.730026], [-93.4858312, 44.7282172, -93.4833023, 44.730026], [-93.4833023, 44.7282172, -93.4807734, 44.730026], [-93.4807734, 44.7282172, -93.4782445, 44.730026], [-93.4782445, 44.7282172, -93.4757156, 44.730026], [-93.4883602, 44.7264085, -93.4858312, 44.7282172], [-93.4858312, 44.7264085, -93.4833023, 44.7282172], [-93.4833023, 44.7264085, -93.4807734, 44.7282172], [-93.4807734, 44.7264085, -93.4782445, 44.7282172], [-93.4757156, 44.7264085, -93.4731866, 44.7282172], [-93.4731866, 44.7264085, -93.4706577, 44.7282172], [-93.4883602, 44.7245997, -93.4858312, 44.7264085], [-93.4858312, 44.7245997, -93.4833023, 44.7264085], [-93.4833023, 44.7245997, -93.4807734, 44.7264085], [-93.4807734, 44.7245997, -93.4782445, 44.7264085], [-93.4782445, 44.7245997, -93.4757156, 44.7264085], [-93.4757156, 44.7245997, -93.4731866, 44.7264085], [-93.4731866, 44.7245997, -93.4706577, 44.7264085], [-93.4883602, 44.722791, -93.4858312, 44.7245997], [-93.4858312, 44.722791, -93.4833023, 44.7245997], [-93.4833023, 44.722791, -93.4807734, 44.7245997], [-93.4807734, 44.722791, -93.4782445, 44.7245997], [-93.4782445, 44.722791, -93.4757156, 44.7245997], [-93.4757156, 44.722791, -93.4731866, 44.7245997], [-93.4731866, 44.722791, -93.4706577, 44.7245997], [-93.4883602, 44.7209822, -93.4858312, 44.722791], [-93.4858312, 44.7209822, -93.4833023, 44.722791], [-93.4833023, 44.7209822, -93.4807734, 44.722791], [-93.4807734, 44.7209822, -93.4782445, 44.722791], [-93.4782445, 44.7209822, -93.4757156, 44.722791], [-93.4757156, 44.7209822, -93.4731866, 44.722791], [-93.4731866, 44.7209822, -93.4706577, 44.722791]], "bbox": [-93.48836015888119, 44.722305893742295, -93.47239601354231, 44.7354521971794]}}''')
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
# GitHub runners have no IPv6 route: make requests use IPv4 only
import socket, urllib3.util.connection as _uc
_uc.allowed_gai_family = lambda: socket.AF_INET
OVP = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
       'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.osm.jp/api/interpreter']
def osmapi_box(w, s, e, n, step=0.02):
    """Fallback without Overpass: the main OSM API map call, tiled, rebuilt as Overpass 'out geom' JSON"""
    import xml.etree.ElementTree as ET
    nodes, ways, rels = {}, {}, {}
    xs = [w + i * step for i in range(int((e - w) / step) + 1)] + [e]; ys = [s + i * step for i in range(int((n - s) / step) + 1)] + [n]
    tiles = [(a, b, c, d) for a, c in zip(xs, xs[1:]) if c > a for b, d in zip(ys, ys[1:]) if d > b]
    def fetch(t, depth=0):
        a, b, c, d = t
        r = S.get(f'https://api.openstreetmap.org/api/0.6/map?bbox={a:.6f},{b:.6f},{c:.6f},{d:.6f}', timeout=300)
        if r.status_code == 400 and depth < 3:   # too many nodes: split
            mx, my = (a + c) / 2, (b + d) / 2
            for q in ((a, b, mx, my), (mx, b, c, my), (a, my, mx, d), (mx, my, c, d)): fetch(q, depth + 1)
            return
        if r.status_code != 200: raise RuntimeError(f'osm api {r.status_code} {t}')
        root = ET.fromstring(r.content)
        for el in root:
            tags = {t.get('k'): t.get('v') for t in el.findall('tag')}
            if el.tag == 'node': nodes[int(el.get('id'))] = (float(el.get('lat')), float(el.get('lon')), tags)
            elif el.tag == 'way': ways[int(el.get('id'))] = ([int(x.get('ref')) for x in el.findall('nd')], tags)
            elif el.tag == 'relation': rels[int(el.get('id'))] = ([(m.get('type'), int(m.get('ref')), m.get('role')) for m in el.findall('member')], tags)
    for t in tiles:
        for k in range(4):
            try: fetch(t); break
            except Exception as ex: log('  osm api', ex); time.sleep(10 * (k + 1))
    log('  osm api', len(tiles), 'tiles', len(nodes), 'nodes', len(ways), 'ways', len(rels), 'relations')
    geom = lambda refs: [{'lat': nodes[r][0], 'lon': nodes[r][1]} for r in refs if r in nodes]
    els = []
    for i, (la, lo, tg) in nodes.items():
        if tg: els.append({'type': 'node', 'id': i, 'lat': la, 'lon': lo, 'tags': tg})
    for i, (refs, tg) in ways.items():
        g = geom(refs)
        if len(g) >= 2: els.append({'type': 'way', 'id': i, 'geometry': g, 'nodes': refs, 'tags': tg})
    for i, (mem, tg) in rels.items():
        ms = []
        for ty, ref, role in mem:
            if ty == 'way' and ref in ways: ms.append({'type': 'way', 'ref': ref, 'role': role, 'geometry': geom(ways[ref][0])})
            elif ty == 'node' and ref in nodes: ms.append({'type': 'node', 'ref': ref, 'role': role, 'lat': nodes[ref][0], 'lon': nodes[ref][1]})
        if ms: els.append({'type': 'relation', 'id': i, 'members': ms, 'tags': tg})
    return {'elements': els}
import re as _re
def overpass(q):
    last = None
    for u in OVP:
        try: return get(u, post={'data': q}, tries=2).json()
        except Exception as e: last = e; log('  overpass mirror failed', u, e)
    m = _re.search(r'\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)\)', q)
    if m:
        s_, w_, n_, e_ = map(float, m.groups()); log('  falling back to the OSM API for', s_, w_, n_, e_)
        d = osmapi_box(w_, s_, e_, n_)
        if 'golf_course' in q and 'nwr["highway"]' not in q:   # discover query: only outlines and holes
            d['elements'] = [el for el in d['elements'] if el.get('tags', {}).get('leisure') == 'golf_course' or el.get('tags', {}).get('golf') == 'hole']
        return d
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



def grow(b, m):
    lat = (b[1] + b[3]) / 2; dx = m / (111320 * math.cos(math.radians(lat))); dy = m / 110574
    return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy]
EPT = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/%s/ept.json'
def merc(lon, lat): R = 6378137.0; return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
def tile(key, ti, res, box, epsg):
    import pdal
    W, S_, E, N = box; x0, y0 = merc(W, S_); x1, y1 = merc(E, N)
    spec = [{'type': 'readers.ept', 'filename': EPT % res, 'bounds': f'([{x0:.2f},{x1:.2f}],[{y0:.2f},{y1:.2f}])', 'resolution': 0.5, 'threads': 4}]
    p = pdal.Pipeline(json.dumps(spec)); n = p.execute(); a = p.arrays[0] if p.arrays else None
    if a is None or len(a) == 0: return key, ti, None
    cls = a['Classification'].astype(int); ok = (cls != 7) & (cls != 18)
    tf = Transformer.from_crs(3857, epsg, always_xy=True); X, Y = tf.transform(a['X'][ok], a['Y'][ok]); X = np.asarray(X); Y = np.asarray(Y); Z = np.asarray(a['Z'][ok]); c = cls[ok]
    return key, ti, dict(x=X.astype(np.float64), y=Y.astype(np.float64), z=Z.astype(np.float32), g=(c == 2))
def main():
    for key, J in JOB.items():
        SUM['courses'][key] = {'tiles': len(J['tiles'])}; save()
        try: naip(key, J['bbox'])
        except Exception as e: err(f'naip {key}', e)
        tf = Transformer.from_crs(4326, J['epsg'], always_xy=True)
        b = J['bbox']; xs, ys = tf.transform([b[0], b[2], b[0], b[2]], [b[1], b[1], b[3], b[3]])
        gx0, gy0, gx1, gy1 = math.floor(min(xs)), math.floor(min(ys)), math.ceil(max(xs)), math.ceil(max(ys))
        w, h = gx1 - gx0, gy1 - gy0
        top = np.full((h, w), -1e9, np.float32); gs = np.zeros((h, w), np.float32); gn = np.zeros((h, w), np.uint16); cnt = np.zeros((h, w), np.uint16)
        with ProcessPoolExecutor(4) as ex:
            fs = [ex.submit(tile, key, ti, J['res'], t, J['epsg']) for ti, t in enumerate(J['tiles'])]
            for f in as_completed(fs):
                try: k, ti, d = f.result()
                except Exception as e: err(f'tile {key}', e); continue
                if d is None: log(key, ti, 'no points'); continue
                ix = np.floor(d['x'] - gx0).astype(np.int64); iy = np.floor(gy1 - d['y']).astype(np.int64); m = (ix >= 0) & (iy >= 0) & (ix < w) & (iy < h)
                ix, iy, z, g = ix[m], iy[m], d['z'][m], d['g'][m]
                np.maximum.at(top, (iy, ix), z); np.add.at(cnt, (iy, ix), 1)
                np.add.at(gs, (iy[g], ix[g]), z[g]); np.add.at(gn, (iy[g], ix[g]), 1)
                log(key, ti, len(z), 'pts')
        ground = np.where(gn > 0, gs / np.maximum(gn, 1), np.nan).astype(np.float32); top[top < -1e8] = np.nan
        np.savez_compressed(f'{OUT}/chm_{key}.npz', top=top, ground=ground, cnt=cnt, x0=gx0, y1=gy1, epsg=J['epsg'])
        SUM['courses'][key]['grid'] = [w, h]; save(); log(key, 'saved', w, h)
    SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save()
if __name__ == '__main__':
    main()
