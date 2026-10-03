# Golfer model search (not course data). Runs on GitHub Actions through the same workflow as the course jobs
# (.github/workflows/fetch.yml triggers on "lidar job.py" and pushes ./out to the course-data branch).
# Downloads free, openly licensed (CC0) rigged characters so they can be compared in the game:
#   - 100 Avatars R1-R3 (Polygonal Mind), ToxSam and NeonGlitch86 collections from the Open Source Avatars index
#     (github.com/ToxSam/open-source-avatars): turntable thumbnails + the VRM models (humanoid rigs)
#   - Grifters Squaddies: thumbnails only (a sample)
#   - Kenney character packs (kenney.nl, CC0): the pack zips
# Nothing on main or the live site is touched.
import json, os, re, time, traceback
import requests
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
S = requests.Session(); S.headers['User-Agent'] = 'golf-go-model-search (github.com/hartwigcam98-star/golf-go)'
LOG = []
def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)
def get(url, tries=4, timeout=120, stream=False):
    for k in range(tries):
        try:
            r = S.get(url, timeout=timeout, stream=stream)
            if r.status_code == 200: return r
            log('  http', r.status_code, url[:100])
        except Exception as e:
            log('  err', url[:100], e)
        time.sleep(4 * (k + 1))
    return None
RAW = 'https://raw.githubusercontent.com/ToxSam/open-source-avatars/main/data/'
MODEL_COLS = {'100avatars-r1', '100avatars-r2', '100avatars-r3', 'toxsam', 'NeonGlitch86-collection'}
THUMB_ONLY = {'grifters-squaddies': 120}
MAX_FILE = 12e6; MAX_TOTAL = 650e6; total = 0
cat = {'collections': {}, 'kenney': {}, 'errors': []}
def save(): json.dump(cat, open(f'{OUT}/catalog.json', 'w'), indent=1)
def ext_of(url, r, default):
    ct = (r.headers.get('content-type') or '').lower()
    for k, v in (('gif', '.gif'), ('png', '.png'), ('jpeg', '.jpg'), ('webp', '.webp')):
        if k in ct: return v
    return default
try:
    projects = get(RAW + 'projects.json').json()
    projects = projects if isinstance(projects, list) else projects.get('projects', [])
    for p in projects:
        pid = p.get('id'); lic = p.get('license')
        if pid not in MODEL_COLS and pid not in THUMB_ONLY: continue
        if lic != 'CC0': log('skip (licence)', pid, lic); continue
        f = p.get('avatar_data_file') or f'avatars/{pid}.json'
        r = get(RAW + f)
        if not r: cat['errors'].append(f'{pid}: no avatar list'); continue
        av = r.json(); lim = THUMB_ONLY.get(pid)
        if lim: av = av[:lim]
        col = cat['collections'][pid] = {'name': p.get('name'), 'license': lic, 'avatars': []}
        os.makedirs(f'{OUT}/thumbs/{pid}', exist_ok=True)
        if pid in MODEL_COLS: os.makedirs(f'{OUT}/models/{pid}', exist_ok=True)
        log(pid, len(av), 'avatars')
        for i, a in enumerate(av):
            num = (a.get('metadata') or {}).get('number') or f'{i:03d}'
            slug = re.sub(r'[^A-Za-z0-9]+', '_', f"{num}_{a.get('name', '')}").strip('_')[:60]
            ent = {'slug': slug, 'name': a.get('name'), 'desc': a.get('description'), 'model': a.get('model_file_url'), 'thumb': a.get('thumbnail_url')}
            if a.get('thumbnail_url'):
                t = get(a['thumbnail_url'], timeout=60)
                if t:
                    fn = f'thumbs/{pid}/{slug}{ext_of(a["thumbnail_url"], t, ".gif")}'
                    open(f'{OUT}/{fn}', 'wb').write(t.content); ent['thumb_file'] = fn
            if pid in MODEL_COLS and a.get('model_file_url') and total < MAX_TOTAL:
                m = get(a['model_file_url'], timeout=180)
                if m and len(m.content) <= MAX_FILE:
                    fn = f'models/{pid}/{slug}.vrm'; open(f'{OUT}/{fn}', 'wb').write(m.content)
                    total += len(m.content); ent['model_file'] = fn; ent['bytes'] = len(m.content)
                elif m: ent['bytes'] = len(m.content); ent['skipped'] = 'too big'
            col['avatars'].append(ent)
            if i % 20 == 0: log(' ', pid, i, 'models so far %.0f MB' % (total / 1e6)); save()
        save()
except Exception as e:
    cat['errors'].append(f'avatars: {e}'); traceback.print_exc()
# Kenney character packs (CC0): find the zip link on each asset page
try:
    os.makedirs(f'{OUT}/kenney', exist_ok=True)
    for page in ('animated-characters-1', 'animated-characters-2', 'animated-characters-3', 'blocky-characters', 'mini-characters'):
        r = get(f'https://kenney.nl/assets/{page}', timeout=60)
        if not r: cat['kenney'][page] = 'page not reached'; continue
        z = re.findall(r'href="([^"]+\.zip)"', r.text)
        imgs = re.findall(r'(https://kenney\.nl/media/pages/assets/[^"\s]+?\.(?:png|jpg))', r.text)
        ent = cat['kenney'][page] = {'zip': z[:1], 'previews': []}
        for k, u in enumerate(dict.fromkeys(imgs)):
            if k >= 4: break
            t = get(u, timeout=60)
            if t:
                fn = f'kenney/{page}_{k}{os.path.splitext(u)[1]}'; open(f'{OUT}/{fn}', 'wb').write(t.content); ent['previews'].append(fn)
        if z:
            u = z[0] if z[0].startswith('http') else 'https://kenney.nl' + z[0]
            t = get(u, timeout=180)
            if t and len(t.content) < 60e6:
                fn = f'kenney/{page}.zip'; open(f'{OUT}/{fn}', 'wb').write(t.content); ent['file'] = fn; ent['bytes'] = len(t.content)
        log('kenney', page, ent.get('bytes'), len(ent['previews']), 'previews')
        save()
except Exception as e:
    cat['errors'].append(f'kenney: {e}'); traceback.print_exc()
cat['total_model_mb'] = round(total / 1e6, 1); save()
log('done', cat['total_model_mb'], 'MB of models')
