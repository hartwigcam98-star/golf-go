# Oxmoor Valley (Ridge + Valley), Birmingham AL: a 1 m ground model from the 2023 USGS lidar (AL_11County_2_B23) over both
# courses, so the current (post-2021 renovation) layout shows: greens, tees, bunkers, fairway cuts. Plus every year of USDA
# NAIP aerial photo the public services offer for the area. Runs on GitHub Actions (fetch.yml); results to "course-data".
import json, math, os, time, traceback, subprocess
import numpy as np, requests
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
SUM = {'started': time.strftime('%Y-%m-%d %H:%M:%S'), 'errors': [], 'tiles': [], 'naip': []}
def save(): json.dump(SUM, open(f'{OUT}/summary.json', 'w'), indent=1)
def log(*a): print(time.strftime('%H:%M:%S'), *a, flush=True)
def err(w, e): SUM['errors'].append(f'{w}: {e}'); log('FAIL', w, e); traceback.print_exc(); save()
S = requests.Session(); S.headers['User-Agent'] = 'golf-go-course-builder (github.com/hartwigcam98-star/golf-go)'
def get(url, params=None, tries=4, timeout=300):
    for k in range(tries):
        try:
            r = S.get(url, params=params, timeout=timeout)
            if r.status_code == 200: return r
            log('  http', r.status_code, url[:90], r.text[:150])
        except Exception as e: log('  err', e)
        time.sleep(6 * (k + 1))
    raise RuntimeError('failed ' + url)
BBOX = [-86.9050, 33.4060, -86.8540, 33.4280]          # both courses + margin (lon/lat)
EPT = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/%s/ept.json'
SCANS = ['AL_11County_2_B23', 'USGS_LPC_AL_JeffersonCo_2013_LAS_2015']
from pyproj import Transformer
def merc(lon, lat): R = 6378137.0; return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
EPSG = 26916
def ground_dem(scan):
    import pdal
    tf = Transformer.from_crs(4326, EPSG, always_xy=True)
    xs, ys = tf.transform([BBOX[0], BBOX[2], BBOX[0], BBOX[2]], [BBOX[1], BBOX[1], BBOX[3], BBOX[3]])
    x0, y0, x1, y1 = math.floor(min(xs)), math.floor(min(ys)), math.ceil(max(xs)), math.ceil(max(ys))
    W, H = x1 - x0, y1 - y0; Z = np.full((H, W), np.nan, np.float32); N = np.zeros((H, W), np.uint16); T = 700
    back = Transformer.from_crs(EPSG, 3857, always_xy=True)
    for ty in range(y0, y1, T):
        for tx in range(x0, x1, T):
            bx = [tx - 5, min(tx + T, x1) + 5]; by = [ty - 5, min(ty + T, y1) + 5]
            mx, my = back.transform([bx[0], bx[1], bx[0], bx[1]], [by[0], by[0], by[1], by[1]])
            spec = [{'type': 'readers.ept', 'filename': EPT % scan, 'bounds': f'([{min(mx):.1f},{max(mx):.1f}],[{min(my):.1f},{max(my):.1f}])', 'threads': 8},
                    {'type': 'filters.range', 'limits': 'Classification[2:2]'},
                    {'type': 'filters.reprojection', 'out_srs': f'EPSG:{EPSG}'}]
            t = time.time()
            try:
                p = pdal.Pipeline(json.dumps(spec)); n = p.execute(); a = p.arrays[0] if p.arrays else None
            except Exception as e: err(f'{scan} tile {tx},{ty}', e); continue
            if a is None or not len(a): SUM['tiles'].append([scan, tx, ty, 0]); continue
            c = np.floor(a['X'] - x0).astype(np.int64); r = np.floor(y1 - a['Y']).astype(np.int64); z = np.asarray(a['Z'], np.float64)
            ok = (c >= 0) & (c < W) & (r >= 0) & (r < H); c, r, z = c[ok], r[ok], z[ok]
            idx = r * W + c; sm = np.bincount(idx, z, W * H); ct = np.bincount(idx, None, W * H)
            m = ct > 0; flat = Z.reshape(-1); cnt = N.reshape(-1)
            new = (flat[m] * cnt[m] + sm[m]) / (cnt[m] + ct[m]); new[np.isnan(new)] = (sm[m] / ct[m])[np.isnan(new)]
            flat[m] = new; cnt[m] = np.minimum(cnt[m] + ct[m], 65535)
            SUM['tiles'].append([scan, tx, ty, int(len(z)), round(time.time() - t)]); log(scan, 'tile', tx, ty, len(z), 'pts'); save()
    np.savez_compressed(f'{OUT}/g1m_{scan}.npz', z=Z, n=N, x0=x0, y1=y1, epsg=EPSG)
    SUM[scan] = dict(x0=x0, y0=y0, x1=x1, y1=y1, filled=float(np.isfinite(Z).mean())); save()
NAIP_LISTS = ['https://gis.apfo.usda.gov/arcgis/rest/services/NAIP_Historical', 'https://gis.apfo.usda.gov/arcgis/rest/services/NAIP']
def naip_years():
    lat = (BBOX[1] + BBOX[3]) / 2; w = int((BBOX[2] - BBOX[0]) * 111320 * math.cos(math.radians(lat)) / .6); h = int((BBOX[3] - BBOX[1]) * 110574 / .6)
    sc = min(1, 4000 / max(w, h)); size = f'{int(w*sc)},{int(h*sc)}'
    svcs = []
    for base in NAIP_LISTS:
        try:
            j = get(base, {'f': 'json'}).json(); SUM.setdefault('naip_catalog', {})[base] = [s['name'] for s in j.get('services', [])]
            svcs += [(base.rsplit('/services/', 1)[0] + '/services/' + s['name'] + '/ImageServer') for s in j.get('services', []) if s.get('type') == 'ImageServer' and ('AL' in s['name'] or 'CONUS' in s['name'])]
        except Exception as e: err('naip list ' + base, e)
    svcs += ['https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer', 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer']
    for u in svcs:
        try:
            p = dict(bbox=','.join(map(str, BBOX)), bboxSR=4326, imageSR=4326, size=size, f='json', format='jpg', compressionQuality=88)
            j = get(u + '/exportImage', p, tries=2).json()
            if 'href' not in j: raise RuntimeError(str(j)[:200])
            img = get(j['href']).content
            if len(img) < 50000: raise RuntimeError('tiny')
            nm = u.split('/services/')[1].split('/ImageServer')[0].replace('/', '_')
            open(f'{OUT}/naip_{nm}.jpg', 'wb').write(img); ex = j['extent']
            SUM['naip'].append(dict(svc=u, file=f'naip_{nm}.jpg', ext=[ex['xmin'], ex['ymin'], ex['xmax'], ex['ymax']], size=[j['width'], j['height']]))
            log('naip', nm, len(img) // 1024, 'KB'); save()
        except Exception as e: err('naip ' + u, e)
def main():
    try:
        subprocess.run(['git', 'clone', '-q', '--depth', '1', '-b', 'course-data', f"https://github.com/{os.environ.get('GITHUB_REPOSITORY','hartwigcam98-star/golf-go')}", '/tmp/prev'], check=True)
        subprocess.run('cp -rn /tmp/prev/. out/ 2>/dev/null; rm -rf out/.git; [ -f out/summary.json ] && mv out/summary.json out/summary_prev_ox1.json; [ -f out/run.log ] && mv out/run.log out/run_prev_ox1.log; true', shell=True)
    except Exception as e: SUM['errors'].append(f'keep old: {e}')
    naip_years()
    for s in SCANS:
        try: ground_dem(s)
        except Exception as e: err('dem ' + s, e)
    SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save()
if __name__ == '__main__': main()
