# Checks every public lidar index for scans of Sand Valley newer than 2019 (Sedge Valley and The Lido were built after it).
# Read-only: it only asks the USGS, Wisconsin DNR and AWS indexes what exists. Results go to the course-data branch next to the earlier files.
import json, os, subprocess, time, requests
PTS = json.loads(r"""{"sedge": [[-89.859437, 44.174547], [-89.869181, 44.171672], [-89.871868, 44.171577], [-89.87248, 44.168979], [-89.870685, 44.165842], [-89.86534, 44.168872]], "lido": [[-89.848386, 44.192173], [-89.854814, 44.196914], [-89.853205, 44.186664], [-89.849312, 44.19213], [-89.853821, 44.193737], [-89.851473, 44.194802]], "sandvalley": [[-89.854956, 44.16746], [-89.854507, 44.16397], [-89.848719, 44.168093], [-89.860231, 44.169259], [-89.864683, 44.165508], [-89.856903, 44.171881]]}""")
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
R = {'started': time.strftime('%Y-%m-%d %H:%M:%S'), 'errors': []}
S = requests.Session(); S.headers['User-Agent'] = 'golf-go-lidar-check (github.com/hartwigcam98-star/golf-go)'
def save(): json.dump(R, open(f'{OUT}/lidar_check.json', 'w'), indent=1)
def get(url, params=None):
    for k in range(4):
        try:
            r = S.get(url, params=params, timeout=120)
            if r.status_code == 200: return r
            print('http', r.status_code, url[:90], r.text[:200], flush=True)
        except Exception as e: print('err', e, flush=True)
        time.sleep(5 * (k + 1))
    raise RuntimeError('failed ' + url)
# keep the earlier Sand Valley data on the branch
try:
    subprocess.run(['git', 'clone', '-q', '--depth', '1', '-b', 'course-data', f"https://github.com/{os.environ.get('GITHUB_REPOSITORY','hartwigcam98-star/golf-go')}", '/tmp/prev'], check=True)
    subprocess.run('cp -n /tmp/prev/* out/ 2>/dev/null; true', shell=True)
except Exception as e: R['errors'].append(f'keep old: {e}')
allp = [p for v in PTS.values() for p in v]
W = min(p[0] for p in allp) - .01; E = max(p[0] for p in allp) + .01; Sx = min(p[1] for p in allp) - .01; N = max(p[1] for p in allp) + .01
# 1. The National Map product catalogue: every lidar point cloud and 1 m DEM product touching the resort
for ds in ['Lidar Point Cloud (LPC)', 'Digital Elevation Model (DEM) 1 meter', 'Ifsar Digital Surface Model (DSM)']:
    try:
        j = get('https://tnmaccess.nationalmap.gov/api/v1/products', dict(bbox=f'{W},{Sx},{E},{N}', datasets=ds, max=500, outputFormat='JSON')).json()
        items = j.get('items', [])
        R.setdefault('tnm', {})[ds] = sorted({(i.get('title', '')[:120], i.get('publicationDate', ''), i.get('lastUpdated', '')[:10], (i.get('downloadURL') or '')[:160]) for i in items}, key=lambda t: t[1])
        print(ds, len(items), flush=True)
    except Exception as e: R['errors'].append(f'tnm {ds}: {e}')
    save()
# 2. USGS WESM (the official list of every 3DEP lidar project and its collection dates), queried at each green
try:
    base = 'https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer'
    info = get(base, dict(f='json')).json(); R['wesm_layers'] = [(l['id'], l['name']) for l in info.get('layers', [])]
    hits = {}
    for lid, name in R['wesm_layers']:
        for key, pl in PTS.items():
            for x, y in pl:
                try:
                    q = get(f'{base}/{lid}/query', dict(geometry=f'{x},{y}', geometryType='esriGeometryPoint', inSR=4326, spatialRel='esriSpatialRelIntersects', outFields='*', returnGeometry='false', f='json')).json()
                    for ft in q.get('features', []):
                        a = ft['attributes']; k = str(a.get('workunit') or a.get('project') or a.get('Project') or a.get('name') or a)[:120]
                        hits.setdefault(f'{lid} {name}', {}).setdefault(k, {'courses': set(), 'attrs': {kk: (str(vv)[:80]) for kk, vv in a.items()}})['courses'].add(key)
                except Exception as e: R['errors'].append(f'wesm {lid}: {e}')
    R['wesm'] = {L: {k: {'courses': sorted(v['courses']), 'attrs': v['attrs']} for k, v in d.items()} for L, d in hits.items()}
except Exception as e: R['errors'].append(f'wesm: {e}')
save()
# 3. Which source the 3DEP elevation service actually uses at each green
for key, pl in PTS.items():
    for x, y in pl[:2]:
        try:
            j = get('https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/identify', dict(geometry=json.dumps({'x': x, 'y': y, 'spatialReference': {'wkid': 4326}}), geometryType='esriGeometryPoint', returnCatalogItems='true', returnGeometry='false', f='json')).json()
            R.setdefault('dep_identify', {}).setdefault(key, []).append({'value': j.get('value'), 'items': [{k: str(v)[:100] for k, v in f.get('attributes', {}).items()} for f in (j.get('catalogItems') or {}).get('features', [])][:8]})
        except Exception as e: R['errors'].append(f'identify {key}: {e}')
save()
# 4. Wisconsin DNR lidar index
try:
    base = 'https://dnrmaps.wi.gov/arcgis_image/rest/services/DW_Map_Dynamic/EN_DEM_from_LiDAR_Index/MapServer'
    info = get(base, dict(f='json')).json(); R['wi_layers'] = [(l['id'], l['name']) for l in info.get('layers', [])]
    for lid, name in R['wi_layers']:
        for key, pl in PTS.items():
            x, y = pl[0]
            q = get(f'{base}/{lid}/query', dict(geometry=f'{x},{y}', geometryType='esriGeometryPoint', inSR=4326, spatialRel='esriSpatialRelIntersects', outFields='*', returnGeometry='false', f='json')).json()
            for ft in q.get('features', []): R.setdefault('wi', {}).setdefault(f'{lid} {name}', {}).setdefault(key, []).append({k: str(v)[:80] for k, v in ft['attributes'].items()})
except Exception as e: R['errors'].append(f'wi: {e}')
save()
# 5. The AWS point-cloud archive (fresh list) and the AWS EPT for each green
try:
    F = get('https://raw.githubusercontent.com/hobuinc/usgs-lidar/master/boundaries/resources.geojson').json()['features']
    def pip(pt, r):
        x, y = pt; c = False
        for i in range(len(r)):
            x1, y1 = r[i]; x2, y2 = r[i - 1]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
        return c
    rings = lambda g: [g['coordinates'][0]] if g['type'] == 'Polygon' else [p[0] for p in g['coordinates']]
    R['ept'] = {key: sorted({f['properties']['name'] for f in F for p in pl if any(pip(p, r) for r in rings(f['geometry']))}) for key, pl in PTS.items()}
    near = [f['properties']['name'] for f in F if any(abs(q[0] - (W + E) / 2) < .6 and abs(q[1] - (Sx + N) / 2) < .4 for r in rings(f['geometry']) for q in r[::max(1, len(r) // 50)])]
    R['ept_nearby'] = sorted(set(near))
except Exception as e: R['errors'].append(f'ept: {e}')
R['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save()
def ser(o):
    if isinstance(o, set): return sorted(o)
    return str(o)
json.dump(R, open(f'{OUT}/lidar_check.json', 'w'), indent=1, default=ser)
print(json.dumps({k: v for k, v in R.items() if k in ('tnm', 'ept', 'errors')}, indent=1, default=ser)[:6000])
