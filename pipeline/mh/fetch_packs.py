"""Download the MakeHuman asset packs (CC0 only) listed on the community site, into packs/. Writes packs/packs.json."""
import re, os, json, requests, urllib.parse
B = 'https://static.makehumancommunity.org/assets/assetpacks.html'
os.makedirs('packs', exist_ok=True)
idx = requests.get(B, timeout=60).text
pages = sorted(set(urllib.parse.urljoin(B, h) for h in re.findall(r'href="([^"]*assetpacks/[^"]+\.html)"', idx)))
print('pack pages', len(pages), flush=True)
out, total = [], 0
for pg in pages:
    try:
        t = requests.get(pg, timeout=60).text
    except Exception as e:
        print('ERR page', pg, e); continue
    zips = sorted(set(urllib.parse.urljoin(pg, z) for z in re.findall(r'href="([^"]+\.zip)"', t)))
    lic = 'CC0' if re.search(r'CC0|cc0|public domain', t) else ('CC-BY' if re.search(r'CC-?BY', t) else '?')
    title = re.sub(r'<[^>]+>', '', (re.search(r'<h1[^>]*>(.*?)</h1>', t, re.S) or re.search(r'<title>(.*?)</title>', t, re.S)).group(1)).strip() if re.search(r'<h1|<title', t) else pg
    desc = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t))[:600]
    rec = dict(page=pg, title=title, lic=lic, zips=zips, desc=desc, got=[])
    for z in zips:
        fn = 'packs/' + os.path.basename(urllib.parse.urlparse(z).path)
        if lic != 'CC0' and 'system' not in z: continue
        try:
            with requests.get(z, stream=True, timeout=300) as r:
                r.raise_for_status()
                with open(fn, 'wb') as o:
                    for ch in r.iter_content(1 << 20): o.write(ch)
            sz = os.path.getsize(fn); total += sz; rec['got'].append([fn, sz]); print('got', fn, sz >> 20, 'MB', flush=True)
        except Exception as e:
            print('ERR zip', z, e, flush=True)
        if total > 3 << 30: break
    out.append(rec)
    if total > 3 << 30: print('size cap reached'); break
json.dump(out, open('packs/packs.json', 'w'), indent=1)
print('total MB', total >> 20)
