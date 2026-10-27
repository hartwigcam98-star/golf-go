#!/usr/bin/env python3
"""Stamp a build before pushing (run after every change to index.html or the data files):
  python3 tools/stamp.py [repo]
- greens.js / ground.js / trees.js ?v= = sha1 of the file, in index.html and sw.js DATA
- <meta name="gg-build"> in index.html and B in sw.js = sha1 of index.html with the stamp blanked (the game's update check
  compares the two: a phone on an older copy downloads the new one and offers a restart)
- sw.js V = sha1 of the final index.html (a new offline cache)"""
import hashlib,re,sys,os
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h=lambda b:hashlib.sha1(b).hexdigest()[:10]
s=open(R+'/index.html',encoding='utf-8').read();sw=open(R+'/sw.js',encoding='utf-8').read()
for f in ('greens.js','ground.js','trees.js'):
    v=h(open(R+'/'+f,'rb').read())
    s,n=re.subn(r'<script src="'+re.escape(f)+r'\?v=[0-9a-f]+"></script>',f'<script src="{f}?v={v}"></script>',s);assert n==1,(f,n)
    sw,n=re.subn(r'"'+re.escape(f)+r'\?v=[0-9a-f]+"',f'"{f}?v={v}"',sw);assert n==1,(f,n)
M=r'<meta name="gg-build" content="[0-9a-f]+">'
assert len(re.findall(M,s))==1,'gg-build meta'
b=h(re.sub(M,'<meta name="gg-build" content="0000000000">',s).encode())
s=re.sub(M,f'<meta name="gg-build" content="{b}">',s)
open(R+'/index.html','w',encoding='utf-8').write(s)
V=h(s.encode())
sw,n=re.subn(r"const V='[0-9a-f]+',B='[0-9a-f]+'",f"const V='{V}',B='{b}'",sw);assert n==1,'sw V/B'
open(R+'/sw.js','w',encoding='utf-8').write(sw)
print('stamped build',b,'sw',V)
