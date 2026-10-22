"""Driving ranges for the courses whose game map has none (Oct 2026). Runs on GitHub Actions (.github/workflows/ranges.yml);
results go to the 'range-data' branch as ranges.json.

For each course: find it (Nominatim: name + town, or the hint below), fetch OpenStreetMap greens and driving ranges around it
(Overpass), then line the OSM greens up with the game's greens to find the game's frame (course yards: x east, y south, from an
origin we no longer have on file) and bring the ranges into it. A course counts only when at least six greens line up."""
import json, math, os, time, requests

HERE = os.path.dirname(os.path.abspath(__file__))
COURSES = json.load(open(os.path.join(HERE, 'courses.json')))
ONLY = json.load(open(os.path.join(HERE, 'only.json'))) if os.path.exists(os.path.join(HERE, 'only.json')) else None
HINT = {  # better search text where the game's name is a routing, not the club
    'crsc': 'Cambrian Ridge Golf Course, Greenville, Alabama', 'crls': 'Cambrian Ridge Golf Course, Greenville, Alabama',
    'valley': 'Oxmoor Valley Golf Course, Birmingham, Alabama', 'ridge': 'Oxmoor Valley Golf Course, Birmingham, Alabama',
    'gnlinks': 'Grand National Golf Course, Opelika, Alabama', 'gnlake': 'Grand National Golf Course, Opelika, Alabama',
    'legislator': 'Capitol Hill Golf Course, Prattville, Alabama', 'judge': 'Capitol Hill Golf Course, Prattville, Alabama', 'senator': 'Capitol Hill Golf Course, Prattville, Alabama',
    'slmh': 'Silver Lakes Golf Course, Glencoe, Alabama', 'slbm': 'Silver Lakes Golf Course, Glencoe, Alabama',
    'quarry': 'Giants Ridge, Biwabik, Minnesota', 'legend': 'Giants Ridge, Biwabik, Minnesota',
    'wilderness': 'Fortune Bay Resort Casino, Tower, Minnesota', 'lehman': "Cragun's Resort, Brainerd, Minnesota",
    'maddens': "Madden's on Gull Lake, Brainerd, Minnesota", 'pines': 'Grand View Lodge, Nisswa, Minnesota', 'preserve': 'The Preserve Golf Course, Pequot Lakes, Minnesota',
    'deacon': "Deacon's Lodge Golf Course, Breezy Point, Minnesota", 'wigwam': 'The Wigwam Golf, Litchfield Park, Arizona',
    'mystic': 'The Meadows at Mystic Lake, Prior Lake, Minnesota', 'legends': 'Legends Club, Prior Lake, Minnesota',
    'sandvalley': 'Sand Valley Golf Resort, Nekoosa, Wisconsin', 'mammoth': 'Sand Valley Golf Resort, Nekoosa, Wisconsin',
    'lido': 'Sand Valley Golf Resort, Nekoosa, Wisconsin', 'sedge': 'Sand Valley Golf Resort, Nekoosa, Wisconsin',
    'heritage': 'Heritage Club, Pawleys Island, South Carolina', 'orangeburg': 'Orangeburg Country Club, Orangeburg, South Carolina',
    'santee': 'Santee National Golf Course, Santee, South Carolina', 'willingers': "Willinger's Golf Club, Northfield, Minnesota",
    'northfork': 'Links at Northfork, Ramsey, Minnesota', 'wyboo': 'Wyboo Golf Club, Manning, South Carolina', 'desertcanyon': 'Desert Canyon Golf Club, Fountain Hills, Arizona',
}
S = requests.Session(); S.headers['User-Agent'] = 'golf-go-range-finder (github.com/hartwigcam98-star/golf-go)'
import socket, urllib3.util.connection as _uc
_uc.allowed_gai_family = lambda: socket.AF_INET   # GitHub runners have no IPv6 route
OVP = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
       'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
def log(*a): print(time.strftime('%H:%M:%S'), *a, flush=True)

def geocode(q):
    for k in range(3):
        try:
            r = S.get('https://nominatim.openstreetmap.org/search', params={'q': q, 'format': 'json', 'limit': 5}, timeout=60); time.sleep(1.2)
            if r.status_code == 200 and r.json():
                j = r.json(); g = next((x for x in j if 'golf' in (x.get('type', '') + x.get('class', '') + x.get('display_name', '').lower())), j[0])
                return float(g['lat']), float(g['lon']), g.get('display_name', '')
        except Exception as e: log('  geocode err', e)
        time.sleep(3)
    return None

def overpass(lat, lon, rad=3500):
    q = f'[out:json][timeout:180];(way["golf"="green"](around:{rad},{lat},{lon});way["golf"~"driving_range|range|practice"](around:{rad},{lat},{lon});relation["golf"~"driving_range|range"](around:{rad},{lat},{lon});way["leisure"="golf_course"]["name"~"[Rr]ange"](around:{rad},{lat},{lon}););out geom;'
    for k in range(8):
        url = OVP[k % len(OVP)]
        try:
            r = S.post(url, data={'data': q}, timeout=240)
            if r.status_code == 200: return r.json()['elements']
            log('  overpass', r.status_code, url)
        except Exception as e: log('  overpass err', url, e)
        time.sleep(6 * (k + 1))
    return None

def rings(el):
    if el['type'] == 'way' and 'geometry' in el: return [[(p['lat'], p['lon']) for p in el['geometry']]]
    if el['type'] == 'relation': return [[(p['lat'], p['lon']) for p in m['geometry']] for m in el.get('members', []) if m.get('role', 'outer') == 'outer' and 'geometry' in m]
    return []

AERIAL = bool(os.environ.get('AERIAL'))
NAIP = ['https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer/exportImage',
        'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage',
        'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage']
def aerial(c, F, box=None):
    """An aerial photo of the whole property (the game's greens plus 450 yd), saved with its corners in the game frame, for tracing ranges."""
    pts = c['pins'] + c['greens']; x0 = min(p[0] for p in pts) - 450; x1 = max(p[0] for p in pts) + 450; y0 = min(p[1] for p in pts) - 450; y1 = max(p[1] for p in pts) + 450
    if box: x0, y0, x1, y1 = box   # (unaligned: yards around the course's map pin)
    lon = lambda x: F['lon0'] + (x - F['off'][0]) / F['K']; lat = lambda y: F['lat0'] - (y - F['off'][1]) / F['L']
    b = [lon(x0), lat(y1), lon(x1), lat(y0)]   # west, south, east, north
    w = int((x1 - x0) / .75); h = int((y1 - y0) / .75); sc = min(1, 4000 / max(w, h)); size = [int(w * sc), int(h * sc)]
    for u in NAIP + NAIP + ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export']:   # each NAIP source twice (they time out now and then), then Esri's world imagery
        try:
            j = S.get(u, params=dict(bbox=','.join(map(str, b)), bboxSR=4326, imageSR=4326, size=f'{size[0]},{size[1]}', f='json', format='jpg', compressionQuality=85), timeout=240).json()
            if 'href' not in j: raise RuntimeError(str(j)[:200])
            img = S.get(j['href'], timeout=240).content
            if len(img) < 50000 or len(img) < size[0] * size[1] / 40: raise RuntimeError('blank or tiny image %d' % len(img))
            ex = j['extent']; gx = lambda lo: (lo - F['lon0']) * F['K'] + F['off'][0]; gy = lambda la: -(la - F['lat0']) * F['L'] + F['off'][1]
            os.makedirs('out', exist_ok=True); open(f"out/aerial_{c['id']}.jpg", 'wb').write(img)
            json.dump({'size': [j['width'], j['height']], 'game': [gx(ex['xmin']), gy(ex['ymax']), gx(ex['xmax']), gy(ex['ymin'])], 'src': u}, open(f"out/aerial_{c['id']}.json", 'w'))   # game x left..right, y top..bottom
            log('  aerial', c['id'], j['width'], 'x', j['height'], len(img) // 1024, 'KB'); return
        except Exception as e: log('  naip failed', u, e)
    raise RuntimeError('no NAIP source worked')

WIDE_R = {'santee': 1600, 'willingers': 1600}   # photo half-width (yd) where the course may be off centre
COORD = {   # where the name search found the wrong place (lat, lon of the course)
    'wilderness': [47.836, -92.315], 'santee': [33.4859, -80.4841], 'willingers': [44.4899, -93.3203], 'chaska': [44.815, -93.637], 'jewel': [44.432, -92.283]}

LIDAR = bool(os.environ.get('LIDAR'))
WANT = json.load(open(os.path.join(HERE, 'lidar_want.json'))) if os.path.exists(os.path.join(HERE, 'lidar_want.json')) else {}
DEP = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage'
def venc(q):   # the game's lidar encoding (pipeline/courses/lidar/build_patches.py enc): planar prediction, zigzag varints
    import numpy as np
    p = np.zeros_like(q); p[0, 1:] = q[0, :-1]; p[1:, 0] = q[:-1, 0]; p[1:, 1:] = q[1:, :-1] + q[:-1, 1:] - q[:-1, :-1]
    rr = (q - p).ravel(); z = np.where(rr >= 0, 2 * rr, -2 * rr - 1).astype(np.int64); o = bytearray()
    for v in z:
        v = int(v)
        while v >= 128: o.append((v & 127) | 128); v >>= 7
        o.append(v)
    return bytes(o)
def range_lidar(c, F, box, ST=3.0):
    """3DEP 1 m ground (from lidar) over the range, as a grid in the course frame (yards, absolute height in yards) like LIDW."""
    import numpy as np, base64
    x0, y0, x1, y1 = box
    lon = lambda x: F['lon0'] + (x - F['off'][0]) / F['K']; lat = lambda y: F['lat0'] - (y - F['off'][1]) / F['L']
    b = [lon(x0 - 20), lat(y1 + 20), lon(x1 + 20), lat(y0 - 20)]
    w = int((b[2] - b[0]) * 111320 * math.cos(math.radians(b[1]))); h = int((b[3] - b[1]) * 110574)
    rr = S.get(DEP, params=dict(bbox=','.join(map(str, b)), bboxSR=4326, imageSR=4326, size=f'{w},{h}', format='bsq', pixelType='F32', interpolation='RSP_BilinearInterpolation', f='image'), timeout=300)
    if len(rr.content) < w * h * 4: raise RuntimeError('short dem %d' % len(rr.content))
    Z = np.frombuffer(rr.content[:w * h * 4], '<f4').reshape(h, w).astype(np.float64)
    bad = ~np.isfinite(Z) | (Z < -500)
    if bad.all(): raise RuntimeError('no elevation')
    if bad.any(): Z[bad] = np.median(Z[~bad])
    res = max((b[2] - b[0]) / w, (b[3] - b[1]) / h); cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2; W0 = cx - res * w / 2; N0 = cy + res * h / 2   # square-degree pixels
    k = 2; Zs = Z.copy()   # a light 5x5 box blur (about 2 yd), like the course grids' smoothing
    acc = np.zeros_like(Z); n = 0
    for dy in range(-k, k + 1):
        for dx in range(-k, k + 1): acc += np.roll(np.roll(Z, dy, 0), dx, 1); n += 1
    Zs = acc / n
    nx = int((x1 - x0) / ST) + 1; ny = int((y1 - y0) / ST) + 1
    GX, GY = np.meshgrid(x0 + np.arange(nx) * ST, y0 + np.arange(ny) * ST)
    px = (lon(GX) - W0) / res - .5; py = (N0 - lat(GY)) / res - .5
    i0 = np.clip(np.floor(px).astype(int), 0, w - 2); j0 = np.clip(np.floor(py).astype(int), 0, h - 2); tx = np.clip(px - i0, 0, 1); ty = np.clip(py - j0, 0, 1)
    zz = (Zs[j0, i0] * (1 - tx) * (1 - ty) + Zs[j0, i0 + 1] * tx * (1 - ty) + Zs[j0 + 1, i0] * (1 - tx) * ty + Zs[j0 + 1, i0 + 1] * tx * ty) * 1.09361
    zmin = float(zz.min()); q = np.round((zz - zmin) * 100).astype(np.int64)
    os.makedirs('out', exist_ok=True)
    json.dump([round(x0, 2), round(y0, 2), ST, nx, ny, round(zmin, 3), base64.b64encode(venc(q)).decode()], open(f"out/rlid_{c['id']}.json", 'w'))
    log('  range lidar', c['id'], nx, 'x', ny, 'z yd', round(zmin, 1), round(float(zz.max()), 1))

if os.path.exists(os.path.join(HERE, 'coords.json')): COORD.update(json.load(open(os.path.join(HERE, 'coords.json'))))   # new courses: [lat, lon] from the research step

out = {}
for c in COURSES:
    if ONLY is not None and c['id'] not in ONLY: continue
    if ONLY is None and c['hasRange']: continue
    rec = out[c['id']] = {'name': c['name']}
    q = HINT.get(c['id']) or f"{c['name'].split(' · ')[0]} golf, {c['town']}"
    g = (COORD[c['id']] + ['given']) if c['id'] in COORD else geocode(q) or geocode(f"{c['name'].split(' · ')[0]}, {c['town']}") or geocode(f"{c['name'].split(' · ')[0]} {c['town'].split(', ')[-1]}")
    if not g: rec['err'] = 'not found: ' + q; log(c['id'], rec['err']); continue
    lat0, lon0, disp = g; rec['geo'] = [lat0, lon0, disp]
    K = math.cos(math.radians(lat0)) * 111320 * 1.0936; L = 110574 * 1.0936
    xy = lambda la, lo: (round((lo - lon0) * K, 1), round(-(la - lat0) * L, 1))
    els = overpass(lat0, lon0)
    if els is None: rec['err'] = 'overpass failed'; log(c['id'], rec['err']); continue
    greens, ranges = [], []
    for e in els:
        t = e.get('tags', {})
        for ring in rings(e):
            P = [xy(a, b) for a, b in ring]
            if t.get('golf') == 'green': greens.append((sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P)))
            else: ranges.append({'tags': t, 'P': P})
    rec['osm'] = {'greens': len(greens), 'ranges': len(ranges)}
    G = [tuple(p) for p in (c['greens'] or c['pins'])]
    # the game frame: the shift that lines up the most greens (within 10 yd)
    best = (0, None)
    for o in greens:
        for gg in G:
            dx, dy = gg[0] - o[0], gg[1] - o[1]
            n = sum(1 for q in greens if min(math.hypot(q[0] + dx - p[0], q[1] + dy - p[1]) for p in G) < 10)
            if n > best[0]: best = (n, (dx, dy))
    n, off = best; rec['matched'] = n
    if n < 6 or not off:
        rec['err'] = f'only {n} greens line up'; log(c['id'], rec['err'], rec['osm'])
        if AERIAL:   # still a photo around the place the search found, for finding the range by eye (frame not lined up with the game)
            rec['frame'] = {'lat0': lat0, 'lon0': lon0, 'K': K, 'L': L, 'off': [0, 0], 'unaligned': True}
            rr = WIDE_R.get(c['id'], 1300)
            try: aerial(c, rec['frame'], [-rr, -rr, rr, rr])
            except Exception as e: log('  aerial failed', c['id'], e)
        continue
    pairs = []
    for q in greens:
        p = min(G, key=lambda p: math.hypot(q[0] + off[0] - p[0], q[1] + off[1] - p[1]))
        if math.hypot(q[0] + off[0] - p[0], q[1] + off[1] - p[1]) < 10: pairs.append((p[0] - q[0], p[1] - q[1]))
    off = (sum(a for a, b in pairs) / len(pairs), sum(b for a, b in pairs) / len(pairs))
    rec['rms'] = round(math.sqrt(sum((a - off[0]) ** 2 + (b - off[1]) ** 2 for a, b in pairs) / len(pairs)), 1)
    rec['ranges'] = [{'tags': r['tags'], 'P': [[round(x + off[0], 1), round(y + off[1], 1)] for x, y in r['P']]} for r in ranges]
    rec['frame'] = {'lat0': lat0, 'lon0': lon0, 'K': K, 'L': L, 'off': off}   # game (x, y) = ((lon-lon0)*K + off x, -(lat-lat0)*L + off y)
    log(c['id'], 'greens', n, 'rms', rec['rms'], 'ranges', len(ranges))
    if LIDAR and c['id'] in WANT:
        try: range_lidar(c, rec['frame'], WANT[c['id']])
        except Exception as e: log('  lidar failed', c['id'], e); rec['lidar_err'] = str(e)
    if AERIAL:
        try: aerial(c, rec['frame'])
        except Exception as e: log('  aerial failed', c['id'], e); rec['aerial_err'] = str(e)
    time.sleep(2)
os.makedirs('out', exist_ok=True)
json.dump(out, open('out/ranges.json', 'w'), indent=1)
log('done', sum(1 for v in out.values() if v.get('ranges')), 'courses with a range of', len(out))
