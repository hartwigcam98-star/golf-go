# Fetches everything the golf game needs for new courses, on GitHub Actions (see .github/workflows/lidar.yml).
# Same sources as the original 8 courses: OpenStreetMap (Overpass), USGS NED 10 m (opentopodata), NAIP aerial photos,
# USGS 3DEP 1 m elevation, and the raw USGS lidar ground points around every green (AWS EPT archive).
# Results are pushed to the "lidar-data" branch. Nothing on main or the live site is touched.
import json, math, os, sys, time, re, traceback
import numpy as np, requests
from concurrent.futures import ProcessPoolExecutor, as_completed
JOB = {"name": "sandvalley", "search": [44.10, -90.10, 44.50, -89.60],
       "want": {"sandvalley": r"sand valley(?!.*(sedge|sandbox|lido|mammoth|commons|craig))", "mammoth": r"mammoth", "lido": r"lido", "sedge": r"sedge"},
       "resort": r"sand valley|mammoth|lido|sedge|sandbox|commons|craig"}
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
CFG = json.loads(r'''{"sandvalley": {"name": "Sand Valley", "bbox": [-89.87005554625414, 44.16232302826704, -89.84597775374587, 44.17521167173296], "greens": [[-89.85549528656354, 44.16705550706676, -89.85441581343646, 44.16786489293324, "way/883280332", 0], [-89.85959138656354, 44.16600520706676, -89.85854231343646, 44.16666589293324, "way/883280333", 0], [-89.86198768656354, 44.16564450706676, -89.86096321343646, 44.16638679293324, "way/860763741", 0], [-89.85497798656354, 44.16361790706676, -89.85403531343647, 44.16432309293324, "way/883280340", 0], [-89.85314298656354, 44.16463780706676, -89.85208381343647, 44.16533789293324, "way/883280341", 0], [-89.84826548656353, 44.16300130706676, -89.84710491343647, 44.16380889293324, "way/883280342", 0], [-89.84919118656353, 44.16773720706676, -89.84824651343646, 44.16844829293324, "way/883280344", 0], [-89.85015858656354, 44.16811150706676, -89.84930481343646, 44.16892669293324, "way/883280345", 0], [-89.85311218656354, 44.16981390706676, -89.85214451343646, 44.17046879293324, "way/883280338", 0], [-89.86080388656353, 44.168916707066764, -89.85965881343647, 44.16960059293324, "way/860763739", 0], [-89.86355308656354, 44.16628950706676, -89.86259971343647, 44.16702839293324, "way/883280334", 0], [-89.86888348656353, 44.16736730706676, -89.86780131343646, 44.16808879293324, "way/883280337", 0], [-89.86520078656353, 44.16513520706676, -89.86416491343647, 44.16588019293324, "way/883280335", 0], [-89.86271538656354, 44.16519630706676, -89.86160431343646, 44.16589599293324, "way/883280336", 0], [-89.86151178656354, 44.16896400706676, -89.86050341343646, 44.16974999293324, "way/860763740", 0], [-89.85743758656353, 44.17153660706676, -89.85636901343646, 44.17222489293324, "way/883280330", 0], [-89.85838258656354, 44.173772407066764, -89.85732991343646, 44.17453339293324, "way/883280331", 0], [-89.85419388656354, 44.17027740706676, -89.85311941343646, 44.17123239293324, "way/892518900", 0]]}, "mammoth": {"name": "Mammoth Dunes", "bbox": [-89.85622231779243, 44.16858782826704, -89.83394168220758, 44.18318087173296], "greens": [[-89.8508667294481, 44.17360570706676, -89.8497308705519, 44.17449989293324, "way/766418711", 0], [-89.84640642944811, 44.17549680706676, -89.84542037055189, 44.17637759293324, "way/883369088", 0], [-89.8406818294481, 44.17313120706676, -89.8396259705519, 44.174002092933236, "way/883369089", 0], [-89.8437789294481, 44.17227040706676, -89.8424872705519, 44.17303069293324, "way/883369087", 0], [-89.8486846294481, 44.16946910706676, -89.8474526705519, 44.17021869293324, "way/883369086", 0], [-89.8446984294481, 44.17007670706676, -89.84355377055189, 44.17095929293324, "way/883369085", 0], [-89.8388536294481, 44.17186490706676, -89.8375602705519, 44.17267619293324, "way/883369084", 0], [-89.8363083294481, 44.17360230706676, -89.8353535705519, 44.17426419293324, "way/883369083", 0], [-89.8405691294481, 44.175962507066764, -89.83955657055189, 44.17676599293324, "way/883369082", 0], [-89.8416907294481, 44.17841090706676, -89.84055667055189, 44.17909019293324, "way/883369081", 0], [-89.8445917294481, 44.18165100706676, -89.8436890705519, 44.18250259293324, "way/883369080", 0], [-89.8429043294481, 44.17819510706676, -89.8418728705519, 44.17901279293324, "way/883369079", 0], [-89.8427652294481, 44.17661860706676, -89.84173387055189, 44.17744339293324, "way/883369078", 0], [-89.8472650294481, 44.17695850706676, -89.84600827055189, 44.17763509293324, "way/883369075", 0], [-89.8524423294481, 44.17936950706676, -89.8512433705519, 44.18001409293324, "way/883369077", 0], [-89.8524992294481, 44.17793150706676, -89.85131217055189, 44.17881449293324, "way/883369076", 0], [-89.84851262944811, 44.17540640706676, -89.8473482705519, 44.17636599293324, "way/884429136", 0], [-89.85528292944811, 44.17541240706676, -89.8540121705519, 44.17630669293324, "way/890505256", 0]]}, "lido": {"name": "Lido", "bbox": [-89.85707417313547, 44.18504622826704, -89.84641072686453, 44.198188571732956], "greens": [[-89.84896481828386, 44.19177700706676, -89.84780728171613, 44.19256969293324, "way/1167421602", 0], [-89.84904811828386, 44.19522880706676, -89.84791908171614, 44.19613019293324, "way/1167421603", 0], [-89.84858041828386, 44.19675950706676, -89.84752698171613, 44.19748959293324, "way/1167421604", 0], [-89.85534631828386, 44.19653760706676, -89.85428218171613, 44.19728969293324, "way/1167421599", 0], [-89.85560071828387, 44.19381880706676, -89.85444918171613, 44.19451939293324, "way/1167421586", 0], [-89.85283441828386, 44.19016130706676, -89.85179528171614, 44.190950792933236, "way/1167421584", 0], [-89.85372031828386, 44.18625030706676, -89.85268868171613, 44.18707679293324, "way/1167421583", 0], [-89.85141421828386, 44.18608370706676, -89.85027708171613, 44.18690049293324, "way/1167421580", 0], [-89.84956631828386, 44.188092607066764, -89.84858478171614, 44.18883099293324, "way/1167421579", 0], [-89.84983071828387, 44.19175180706676, -89.84879308171614, 44.192507292933236, "way/1167421591", 0], [-89.84980381828386, 44.19525090706676, -89.84856368171613, 44.19601539293324, "way/1167421594", 0], [-89.85512701828387, 44.19609650706676, -89.85416318171613, 44.19680609293324, "way/1167421598", 0], [-89.85437941828387, 44.19335180706676, -89.85326288171613, 44.19412159293324, "way/1167421582", 0], [-89.85438891828386, 44.19459310706676, -89.85340428171614, 44.19534369293324, "way/1167421587", 0], [-89.85214191828386, 44.19193020706676, -89.85102988171613, 44.19277839293324, "way/1167421585", 0], [-89.85201011828386, 44.19440360706676, -89.85093678171613, 44.19519979293324, "way/1167421588", 0], [-89.85107141828387, 44.18996220706676, -89.84993268171614, 44.19074169293324, "way/1167421595", 0], [-89.85286051828386, 44.18666500706676, -89.85161608171613, 44.18761569293324, "way/1167421596", 0]]}, "sedge": {"name": "Sedge Valley", "bbox": [-89.87808390016373, 44.162733828267044, -89.85770049983627, 44.175834571732956], "greens": [[-89.85994200004093, 44.17420110706676, -89.85893219995907, 44.17489339293324, "way/1294854742", 0], [-89.86377780004092, 44.17337360706676, -89.86279439995907, 44.17413499293324, "way/1294854744", 0], [-89.86499560004093, 44.16939420706676, -89.86401319995907, 44.17013069293324, "way/1294854734", 0], [-89.86974710004093, 44.17133390706676, -89.86861539995907, 44.17200969293324, "way/1294854739", 0], [-89.86885170004092, 44.17227150706676, -89.86784609995907, 44.17303039293324, "way/1294854746", 0], [-89.87243520004093, 44.17261610706676, -89.87131859995907, 44.173305292933236, "way/1294854740", 0], [-89.87230000004092, 44.17116540706676, -89.87143649995907, 44.17198869293324, "way/1294854738", 0], [-89.87251780004092, 44.16931080706676, -89.87165249995907, 44.17007949293324, "way/1294854741", 0], [-89.87698470004092, 44.16840480706676, -89.87597619995907, 44.16913099293324, "way/1294854752", 0], [-89.87298134869629, 44.16861705130682, -89.87197945130372, 44.16934054869318, "hole-end", 0], [-89.87164950004093, 44.163701107066764, -89.87068519995907, 44.16451109293324, "way/1489464113", 0], [-89.86995610004092, 44.16506470706676, -89.86896139995908, 44.165795592933236, "way/1489464115", 0], [-89.87123790004092, 44.16546440706676, -89.87013159995907, 44.166219392933236, "way/1489464116", 0], [-89.87005140004092, 44.168900907066764, -89.86901719995907, 44.16961209293324, "way/1294854736", 0], [-89.87057680004092, 44.17064380706676, -89.86954819995907, 44.17141919293324, "way/1294854735", 0], [-89.86588990004093, 44.16855670706676, -89.86478979995907, 44.16918749293324, "way/1294854733", 0], [-89.86686670004093, 44.17230730706676, -89.86578209995908, 44.17305909293324, "way/1294854737", 0], [-89.86479780004093, 44.17436560706676, -89.86382969995907, 44.17503489293324, "way/1294854745", 0]]}}''')
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
def discover():
    s, w, n, e = JOB['search']
    d = overpass(f'[out:json][timeout:180];nwr["leisure"="golf_course"]({s},{w},{n},{e});out geom;')
    json.dump(d, open(f'{OUT}/osm_courses.json', 'w'))
    found = [(el.get('tags', {}).get('name', ''), el['type'] + '/' + str(el['id']), bbox_of(el)) for el in d['elements']]
    SUM['osm_golf_courses'] = found; log('golf courses:', found)
    res = {}
    for key, rx in JOB['want'].items():
        m = [f for f in found if f[2] and re.search(rx, f[0].lower())]
        if m:   # the smallest match is the course itself (a resort-wide polygon can match the same words)
            area = lambda b: (b[2] - b[0]) * (b[3] - b[1])
            x = min(m, key=lambda f: area(f[2]))
            res[key] = dict(osm=[x[1]], names=[x[0]], bbox=x[2], all_matches=[[f[0], f[1], f[2]] for f in m])
    rs = [f[2] for f in found if f[2] and re.search(JOB['resort'], f[0].lower())] or [f[2] for f in found if f[2]]
    resort = [min(b[0] for b in rs), min(b[1] for b in rs), max(b[2] for b in rs), max(b[3] for b in rs)]
    SUM['resort_bbox'] = resort; SUM['picked'] = res; save()
    return res, resort

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
def greens_points(key, b, osm, resources):
    W, S_, E, N = b; epsg = UTMZ((W + E) / 2)
    greens = [dict(id=g[4], bbox=g[:4]) for g in CFG[key]['greens']]
    for g in greens:
        x0, y0, x1, y1 = g['bbox']; pts = [(x0, y0), (x1, y0), (x0, y1), (x1, y1), ((x0 + x1) / 2, (y0 + y1) / 2)]
        g['cand'] = [f['properties']['name'] for f in resources if any(pip(q, r) for q in pts for r in rings_of(f['geometry']))]
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
    try: resources = get('https://raw.githubusercontent.com/hobuinc/usgs-lidar/master/boundaries/resources.geojson').json()['features']
    except Exception as e: resources = []; err('resources', e)
    for key, c in CFG.items():
        SUM['courses'][key] = dict(name=c['name'], bbox=c['bbox']); save(); b = c['bbox']
        for step in (ned_grids, naip, dem_ll, dem_utm):
            try: step(key, b)
            except Exception as e: err(f'{step.__name__} {key}', e)
            save()
        try: greens_points(key, b, None, resources)
        except Exception as e: err(f'greens {key}', e)
    SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save()

if __name__ == '__main__':
    main()
