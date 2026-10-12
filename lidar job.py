"""Mixamo character survey (Oct 2026): list the GbotHQ/mixamo-characters dataset, download every FBX and convert each to a
small preview char file (1024 atlas) with pipeline/chars/export_char.py, so the main session can render them and pick bodies
for the tour legends. Output: out/mx/char_mx_<slug>.js, out/mx/list.json (name, size, ok/error)."""
import os, sys, json, re, subprocess, time, traceback
subprocess.run('pip install -q requests pillow numpy', shell=True)
import requests
sys.path.insert(0, 'pipeline/chars')
from export_char import export
OUT = 'out/mx'; os.makedirs(OUT, exist_ok=True)
API = 'https://huggingface.co/api/datasets/GbotHQ/mixamo-characters/tree/main'
files, url = [], API
while url:
    r = requests.get(url, timeout=60); r.raise_for_status(); files += r.json()
    m = re.search(r'<([^>]+)>;\s*rel="next"', r.headers.get('Link', '')); url = m.group(1) if m else None
fbx = [f for f in files if f.get('type') == 'file' and f['path'].lower().endswith('.fbx')]
print('fbx files', len(fbx), flush=True)
res = []
for f in fbx:
    name = f['path']; slug = re.sub(r'[^a-z0-9]+', '_', name[:-4].lower()).strip('_')[:28]; t0 = time.time()
    try:
        p = '/tmp/c.fbx'
        with requests.get('https://huggingface.co/datasets/GbotHQ/mixamo-characters/resolve/main/' + requests.utils.quote(name), stream=True, timeout=120) as r:
            r.raise_for_status()
            with open(p, 'wb') as o:
                for ch in r.iter_content(1 << 20): o.write(ch)
        js, out = export(p, 'mx_' + slug, (), atlas=1024)
        open(f'{OUT}/char_mx_{slug}.js', 'w').write(js)
        res.append(dict(name=name, slug=slug, size=f.get('size'), kb=len(js) // 1024, verts=out['mesh']['n'], ok=1))
        print('ok', name, len(js) // 1024, 'KB', round(time.time() - t0), 's', flush=True)
    except Exception as e:
        res.append(dict(name=name, slug=slug, ok=0, err=str(e)[:200])); print('ERR', name, e, flush=True)
    json.dump(res, open(f'{OUT}/list.json', 'w'), indent=1)
