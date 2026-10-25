"""mkgal.py <golf-go dir> <shots dir> [key ...] : add/refresh courses on the Blender before/after page (blender/index.html).
<shots dir> holds <key>_before.png and <key>_after.png (gal.js) and cams.json (the camera used: hi, name, town).
blender/gallery.json keeps every course on the page; index.html is rebuilt from it each time (course order = the game's)."""
import json, os, re, sys, time
from PIL import Image
G, S, keys = sys.argv[1], sys.argv[2], sys.argv[3:]
OUT = G + '/blender'; os.makedirs(OUT + '/img', exist_ok=True)
GJ = OUT + '/gallery.json'; gal = json.load(open(GJ)) if os.path.exists(GJ) else {}
cams = json.load(open(S + '/cams.json'))
ver = time.strftime('%y%m%d%H%M')
for cid in keys:
    b, a = '%s/%s_before.png' % (S, cid), '%s/%s_after.png' % (S, cid)
    if not (os.path.exists(b) and os.path.exists(a)): print(cid, 'missing shots'); continue
    for src, tag in ((b, 'before'), (a, 'after')):
        im = Image.open(src).convert('RGB'); W, H = im.size
        y0 = int(H * .12); im = im.crop((0, y0, W, y0 + int(W * 440 / 640))).resize((640, 440), Image.LANCZOS)
        im.save('%s/img/%s_%s.jpg' % (OUT, cid, tag), quality=82, optimize=True)
    c = cams.get(cid, {}); old = gal.get(cid, {})
    gal[cid] = {'name': c.get('name') or old.get('name') or cid, 'town': c.get('town') or old.get('town') or '', 'hole': c.get('hi', 0) + 1, 'ord': c.get('ord', old.get('ord', 999)), 'v': ver}
json.dump(gal, open(GJ, 'w'), indent=0)
# light status from the game
bake = open(G + '/b10/bake.js').read(); lit = set(re.findall(r"(\w+):\{holes:", bake))
ids = sorted(gal, key=lambda k: (gal[k].get('ord', 999), k))   # the game's course order
def esc(t): return t.replace('&', '&amp;').replace('<', '&lt;')
arts = []
for cid in ids:
    e = gal[cid]; nm = esc(e['name'])
    tags = ['Blender trees and leaves', 'Blender clubhouse', 'Baked light' if cid in lit else 'Baked light coming']
    tg = ''.join('<span class="tag%s">%s</span>' % (' soon' if 'coming' in t else '', t) for t in tags)
    arts.append('''<article class="course" id="%s">
  <div class="top"><h2>%s</h2><span class="town">%s · hole %d</span></div>
  <div class="tags">%s</div>
  <div class="shots">
    <figure><img src="img/%s_before.jpg?v=%s" alt="%s before" loading="lazy" width="640" height="440"><figcaption>Before</figcaption></figure>
    <figure class="now"><img src="img/%s_after.jpg?v=%s" alt="%s with Blender" loading="lazy" width="640" height="440"><figcaption>Now</figcaption></figure>
  </div>
</article>''' % (cid, nm, esc(e['town']), e['hole'], tg, cid, e['v'], nm, cid, e['v'], nm))
nl = len(lit)   # courses with baked light, out of every course with a Blender clubhouse (all of them)
import glob
ntot = max(len(ids), len(glob.glob(G + '/b10/club/*.js')))
html = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gallery_tpl.html')).read()
html = html.replace('{{N_LIT}}', str(nl)).replace('{{N}}', str(ntot)).replace('{{ARTICLES}}', '\n'.join(arts))
open(OUT + '/index.html', 'w').write(html)
print(len(ids), 'courses on the page;', nl, 'of', ntot, 'with baked light')
