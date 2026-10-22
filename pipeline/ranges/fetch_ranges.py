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

out = {}
for c in COURSES:
    if ONLY is not None and c['id'] not in ONLY: continue
    if ONLY is None and c['hasRange']: continue
    rec = out[c['id']] = {'name': c['name']}
    q = HINT.get(c['id']) or f"{c['name'].split(' · ')[0]} golf, {c['town']}"
    g = geocode(q) or geocode(f"{c['name'].split(' · ')[0]}, {c['town']}") or geocode(f"{c['name'].split(' · ')[0]} {c['town'].split(', ')[-1]}")
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
    if n < 6 or not off: rec['err'] = f'only {n} greens line up'; log(c['id'], rec['err'], rec['osm']); continue
    pairs = []
    for q in greens:
        p = min(G, key=lambda p: math.hypot(q[0] + off[0] - p[0], q[1] + off[1] - p[1]))
        if math.hypot(q[0] + off[0] - p[0], q[1] + off[1] - p[1]) < 10: pairs.append((p[0] - q[0], p[1] - q[1]))
    off = (sum(a for a, b in pairs) / len(pairs), sum(b for a, b in pairs) / len(pairs))
    rec['rms'] = round(math.sqrt(sum((a - off[0]) ** 2 + (b - off[1]) ** 2 for a, b in pairs) / len(pairs)), 1)
    rec['ranges'] = [{'tags': r['tags'], 'P': [[round(x + off[0], 1), round(y + off[1], 1)] for x, y in r['P']]} for r in ranges]
    log(c['id'], 'greens', n, 'rms', rec['rms'], 'ranges', len(ranges))
    time.sleep(2)
os.makedirs('out', exist_ok=True)
json.dump(out, open('out/ranges.json', 'w'), indent=1)
log('done', sum(1 for v in out.values() if v.get('ranges')), 'courses with a range of', len(out))
