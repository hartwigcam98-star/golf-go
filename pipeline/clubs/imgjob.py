"""Clubhouse reference photos: for each site, crawl the course website (home + one level of likely pages) and Wikimedia Commons,
keep the photos that look like buildings/clubhouses, and write one labelled contact sheet per site (out/clubimg/<key>.jpg) plus the sources.
Input: club_sites.json {key: {"name":..., "town":..., "urls":[...], "q": "commons search", "must": regex the result title/page must match,
"qs": [extra search queries], "nodefault": 1 to skip the site crawl and default query, "kind": "club" (clubhouse photos first) | "course" (water, bridges, holes first)}}"""
import json, os, re, io, time, subprocess, concurrent.futures as cf
subprocess.run('pip install -q pillow requests beautifulsoup4', shell=True)
import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw
from urllib.parse import urljoin, urlparse
OUT = 'out/courseimg'; os.makedirs(OUT, exist_ok=True)
SITES = json.load(open('club_sites.json'))
S = requests.Session(); S.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
GOOD = re.compile(r'club ?house|lodge|exterior|building|patio|veranda|porch|pub|grill|aerial|facility|facilities|venue|wedding|event|dining|restaurant|pro.?shop|entrance|about|gallery|photo|front', re.I)
BAD = re.compile(r'logo|icon|sprite|favicon|badge|avatar|map|flag|svg|banner-ad|payment|social|facebook|instagram|twitter|youtube|tripadvisor|award|sponsor|placeholder|blank|pixel', re.I)
LINK = re.compile(r'club ?house|lodge|about|gallery|photo|facilit|event|wedding|dining|restaurant|grill|pub|amenit|tour|venue|banquet', re.I)
def get(u, t=20):
    try:
        r = S.get(u, timeout=t)
        if r.status_code == 200: return r
    except Exception: pass
    return None
def imgs_of(url):
    r = get(url)
    if not r or 'html' not in r.headers.get('content-type', ''): return [], []
    soup = BeautifulSoup(r.text, 'html.parser'); out = []
    for m in soup.find_all('meta'):
        if m.get('property') in ('og:image', 'twitter:image') or m.get('name') in ('og:image', 'twitter:image'):
            if m.get('content'): out.append((urljoin(url, m['content']), 'og ' + (soup.title.string if soup.title and soup.title.string else '')))
    for im in soup.find_all(['img', 'source']):
        for a in ('src', 'data-src', 'data-lazy-src', 'srcset', 'data-srcset'):
            v = im.get(a)
            if not v: continue
            if 'srcset' in a: v = sorted([p.strip().split(' ') for p in v.split(',') if p.strip()], key=lambda p: -int(re.sub(r'\D', '', p[1]) or 0) if len(p) > 1 else 0)[0][0]
            out.append((urljoin(url, v), (im.get('alt') or '') + ' ' + (im.get('title') or '')))
            break
    for el in soup.find_all(style=re.compile(r'url\(')):
        for v in re.findall(r'url\([\'"]?([^\'")]+)', el['style']): out.append((urljoin(url, v), el.get('class') and ' '.join(el['class']) or ''))
    links = []
    host = urlparse(url).netloc.replace('www.', '')
    for a in soup.find_all('a', href=True):
        h = urljoin(url, a['href']); txt = (a.get_text() or '') + ' ' + h
        if urlparse(h).netloc.replace('www.', '') == host and LINK.search(txt) and not h.lower().endswith(('.pdf', '.jpg', '.png')): links.append(h.split('#')[0])
    return out, list(dict.fromkeys(links))[:10]
def commons(q, n=12):
    r = get('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=%d&gsrsearch=%s&prop=imageinfo&iiprop=url&iiurlwidth=640' % (n, requests.utils.quote(q)))
    if not r: return []
    try: pages = r.json().get('query', {}).get('pages', {})
    except Exception: return []
    return [(p['imageinfo'][0].get('thumburl') or p['imageinfo'][0]['url'], 'commons ' + p['title']) for p in pages.values() if p.get('imageinfo')]
def ddg(q, n=14):
    """image results from DuckDuckGo (token from the search page, then the i.js endpoint)"""
    try:
        r = S.get('https://duckduckgo.com/', params={'q': q, 'iax': 'images', 'ia': 'images'}, timeout=20)
        m = re.search(r'vqd=["\']?([\d-]+)', r.text)
        if not m: return []
        r = S.get('https://duckduckgo.com/i.js', params={'l': 'us-en', 'o': 'json', 'q': q, 'vqd': m.group(1), 'f': ',,,', 'p': '1'}, headers={'Referer': 'https://duckduckgo.com/'}, timeout=20)
        return [(x['image'], 'ddg ' + x.get('title', '')[:80]) for x in r.json().get('results', [])[:n]]
    except Exception as e:
        print('ddg', q, e); return []
def bing(q, must, n=16):
    """Bing image results (async endpoint: one m="{json}" attribute per result), kept only when the title or page names the course"""
    import html as H
    out = []
    for first in (0, 35):
        try:
            r = S.get('https://www.bing.com/images/async', params={'q': q, 'first': first, 'count': 35, 'mmasync': 1, 'setlang': 'en-us', 'cc': 'US'}, timeout=20)
            print('bing http', r.status_code, len(r.text), flush=True)
            if not os.path.exists('out/bing_raw.html'): open('out/bing_raw.html', 'w').write(r.text)
            if 'm="{' not in r.text:
                r2 = S.get('https://www.bing.com/images/search', params={'q': q, 'form': 'HDRSC2', 'first': first + 1}, timeout=20)
                print('bing search http', r2.status_code, len(r2.text), flush=True)
                if not os.path.exists('out/bing_raw2.html'): open('out/bing_raw2.html', 'w').write(r2.text)
                r = r2
        except Exception as e:
            print('bing', q, e); continue
        for m in re.finditer(r'\bm="(\{.*?\})"', r.text):
            try: d = json.loads(H.unescape(m.group(1)))
            except Exception: continue
            t = (d.get('t') or '') + ' ' + (d.get('purl') or '') + ' ' + (d.get('desc') or '')
            if not re.search(must, t, re.I): continue
            out.append((d.get('murl'), 'bing ' + (d.get('t') or '')[:80]))
            if len(out) >= n: return out
    print('bing', q, 'kept', len(out), flush=True)
    return out
def fetch_img(u):
    r = get(u, 25)
    if not r: return None
    try:
        im = Image.open(io.BytesIO(r.content)); im.load(); im = im.convert('RGB')
    except Exception: return None
    w, h = im.size
    if w < 300 or h < 180 or w / h > 4 or h / w > 2: return None
    im.thumbnail((900, 900)); return im
def site(key, cfg):
    cand = []
    for u in ([] if cfg.get('nodefault') else cfg.get('urls', [])):
        c, links = imgs_of(u); cand += c
        for l in links[:8]:
            c2, _ = imgs_of(l); cand += [(x, t + ' @' + urlparse(l).path) for x, t in c2]
    must = cfg.get('must', re.escape(cfg['name'].split()[0]))
    web = []
    for qq in ([] if cfg.get('nodefault') else [cfg['name'] + ' ' + cfg.get('town', '') + ' golf clubhouse']) + cfg.get('qs', []):
        got1 = bing(qq, must, 14)
        dd = [c for c in ddg(qq, 30) if re.search(must, c[1], re.I)]
        print(key, qq, 'bing', len(got1), 'ddg', len(dd), flush=True)
        web += got1 + dd[:10]
        time.sleep(2)
    print(key, 'search', len(web), flush=True)
    cand = web + [c for c in cand if re.search(r'club ?house|lodge|exterior|building|patio', c[0] + c[1], re.I)] + cand
    if cfg.get('q'): cand += [c for c in commons(cfg['q'] + ' golf') if re.search(r'\.(jpe?g|png)$', c[1], re.I)]
    seen = set(); scored = []
    for u, t in cand:
        if u in seen or not u.startswith('http') or BAD.search(u + ' ' + t) or re.search(r'\.(svg|gif)(\?|$)', u, re.I): continue
        if cfg.get('kind') == 'club': s = (3 if re.search(r'club ?house|lodge|exterior', u + t, re.I) else 0) + (2 if re.search(r'club ?house', t, re.I) and t.startswith(('ddg', 'bing')) else 0)
        else: s = (3 if re.search(r'pond|lake|water|fountain|bridge|hole', u + t, re.I) else 0) + (2 if re.search(r'fountain|bridge', t, re.I) and t.startswith(('ddg', 'bing')) else 0)
        seen.add(u); s += 0 + (1 if GOOD.search(u + ' ' + t) else 0) + (1 if t.startswith('og') else 0) + (6 if t.startswith(('ddg', 'bing')) else 0)
        scored.append((s, u, t))
    scored.sort(key=lambda x: -x[0]); got = []   # stable: search results keep their rank
    with cf.ThreadPoolExecutor(6) as ex:
        res = list(ex.map(lambda x: (x, fetch_img(x[1])), scored[:70]))
    for (s, u, t), im in res:
        if im is not None: got.append((s, u, t, im))
        if len(got) >= 28: break
    if not got: return key, 0, []
    cw, ch = 480, 320; sheet = Image.new('RGB', (cw * 4, ch * ((len(got) + 3) // 4)), (30, 30, 30)); d = ImageDraw.Draw(sheet)
    for i, (s, u, t, im) in enumerate(got):
        x, y = (i % 4) * cw, (i // 4) * ch; im2 = im.copy(); im2.thumbnail((cw - 4, ch - 22)); sheet.paste(im2, (x + 2, y + 20))
        d.rectangle([x, y, x + cw, y + 18], fill=(0, 0, 0)); d.text((x + 4, y + 3), f'{i} ' + (t.strip() or urlparse(u).path)[-70:], fill=(255, 255, 0))
    sheet.save(f'{OUT}/{key}.jpg', quality=80)
    os.makedirs(f'{OUT}/{key}', exist_ok=True)
    for i, (s, u, t, im) in enumerate(got): im.save(f'{OUT}/{key}/{i:02d}.jpg', quality=85)
    return key, len(got), [dict(i=i, url=u, txt=t.strip()[:120]) for i, (s, u, t, im) in enumerate(got)]
SUM = {}
with cf.ThreadPoolExecutor(2) as ex:
    for key, n, src in ex.map(lambda kv: site(*kv), SITES.items()):
        SUM[key] = src; print(key, n, flush=True)
json.dump(SUM, open(f'{OUT}/sources.json', 'w'), indent=1)
