#!/usr/bin/env python3
"""Stamp a build before pushing (run after every change to index.html or the data files):
  python3 tools/stamp.py [repo]
- greens.js / ground.js / trees.js ?v= = sha1 of the file, in index.html and sw.js DATA
- <meta name="gg-build"> in index.html and B in sw.js = sha1 of index.html with the stamp blanked (the game's update check
  compares the two: a phone on an older copy downloads the new one and offers a restart)
- sw.js V = sha1 of the final index.html (a new offline cache)
The page's big data lines live in data/ (tools/datafiles.py): the stamp first runs its unpack (moves any data line a tool
wrote back into the page, refreshes the data/ ?v= tags, drops data files whose line is gone), and the hashes above are of the
all-in-one page those pack into, so they are the same as when everything was in index.html."""
import hashlib,re,sys,os
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h=lambda b:hashlib.sha1(b).hexdigest()[:10]
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import datafiles
datafiles.unpack(R,quiet=True)
s=open(R+'/index.html',encoding='utf-8',newline='').read();sw=open(R+'/sw.js',encoding='utf-8').read()
for f in ('greens.js','ground.js','trees.js'):
    v=h(open(R+'/'+f,'rb').read())
    s,n=re.subn(r'<script src="'+re.escape(f)+r'\?v=[0-9a-f]+"></script>',f'<script src="{f}?v={v}"></script>',s);assert n==1,(f,n)
    sw,n=re.subn(r'"'+re.escape(f)+r'\?v=[0-9a-f]+"',f'"{f}?v={v}"',sw);assert n==1,(f,n)
# every inline script must parse (a stray // comment once swallowed the code after it on its line): node --check each one
import subprocess,tempfile
for k,m in enumerate(re.finditer(r'<script>(.*?)</script>',s,re.S)):
    with tempfile.NamedTemporaryFile('w',suffix='.js',delete=False) as tf: tf.write(m.group(1))
    r=subprocess.run(['node','--check',tf.name],capture_output=True,text=True);os.unlink(tf.name)
    if r.returncode: sys.exit('STAMP REFUSED: inline script %d does not parse:\n%s'%(k,r.stderr[:600]))
M=r'<meta name="gg-build" content="[0-9a-f]+">'
assert len(re.findall(M,s))==1,'gg-build meta'
b=h(datafiles.pack_text(R,re.sub(M,'<meta name="gg-build" content="0000000000">',s)).encode())
s=re.sub(M,f'<meta name="gg-build" content="{b}">',s)
open(R+'/index.html','w',encoding='utf-8',newline='').write(s)
V=h(datafiles.pack_text(R).encode())
sw,n=re.subn(r"const V='[0-9a-f]+',B='[0-9a-f]+'",f"const V='{V}',B='{b}'",sw);assert n==1,'sw V/B'
open(R+'/sw.js','w',encoding='utf-8').write(sw)
print('stamped build',b,'sw',V)
