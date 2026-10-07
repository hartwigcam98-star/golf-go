# Pulls Golf Go feedback (Supabase table "feedback") into the "feedback" branch: one folder per note with
# note.json and shot.jpg, plus FEEDBACK.md listing every note newest first. Runs on GitHub Actions (feedback.yml).
import base64, json, os, re, subprocess, time, urllib.request
page = open('index.html', encoding='utf-8').read()
m = re.search(r"DAILY=\{url:'([^']+)',key:'([^']+)'", page); URL, KEY = m.group(1), m.group(2)
hdr = {'apikey': KEY}
if not KEY.startswith('sb_'): hdr['Authorization'] = 'Bearer ' + KEY
out = 'fb'; os.makedirs(out, exist_ok=True)
subprocess.run(['git', 'clone', '-q', '--depth', '1', '-b', 'feedback', f"https://github.com/{os.environ.get('GITHUB_REPOSITORY')}", 'prev'], check=False)
if os.path.isdir('prev'): subprocess.run('cp -rn prev/. fb/; rm -rf fb/.git', shell=True)
rows, off, status = [], 0, 'ok'
while True:
    req = urllib.request.Request(f'{URL}/rest/v1/feedback?select=*&order=id.desc&limit=200&offset={off}', headers=hdr)
    try: batch = json.load(urllib.request.urlopen(req, timeout=60))
    except Exception as e: print('fetch failed', e); status = f'fetch failed: {e}'; batch = None
    if not batch: break
    rows += batch; off += len(batch)
    if len(batch) < 200: break
print(len(rows), 'notes')
lines = ['# Golf Go feedback', '', f'Pulled {time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime())}: {len(rows)} notes, newest first. Database: {status}.', '']
for r in rows:
    d = f"{out}/{r['id']:05d}"; os.makedirs(d, exist_ok=True)
    shot = r.pop('shot', None)
    if shot and shot.startswith('data:image'):
        open(f'{d}/shot.jpg', 'wb').write(base64.b64decode(shot.split(',', 1)[1])); r['shot'] = 'shot.jpg'
    json.dump(r, open(f'{d}/note.json', 'w'), indent=1)
    c = r.get('ctx') or {}
    where = ' · '.join(str(x) for x in [c.get('course'), c.get('hole') and f"hole {c.get('hole')}", c.get('mode'), c.get('ver')] if x)
    lines += [f"## #{r['id']} · {r.get('kind')} · {r.get('name') or 'anon'} · {r['created_at'][:16].replace('T',' ')}", '', r['message'], '', f'_{where}_' + (f" · [screenshot]({r['id']:05d}/shot.jpg)" if r.get('shot') else ''), '']
open(f'{out}/FEEDBACK.md', 'w').write('\n'.join(lines))
