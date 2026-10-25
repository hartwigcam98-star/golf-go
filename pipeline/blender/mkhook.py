"""mkhook.py <golf-go dir> <serve dir> : a local copy of the game for the Blender tools.
Every file is a symlink to the repo except index.html, which gets two test hooks:
  window.__ev(code)  evaluates code inside the game's main closure (the first '(()=>{' right after a bare <script>)
  window.__CT        when set to [], each clubhouse drawn is also recorded at full detail (grab.js reads it)"""
import os, sys
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for n in os.listdir(src):
    if n in ('index.html', '.git'): continue
    p = os.path.join(dst, n)
    if not os.path.lexists(p): os.symlink(os.path.join(src, n), p)
L = open(os.path.join(src, 'index.html')).read().split('\n')
k = next(i for i in range(1, len(L)) if L[i] == '(()=>{' and L[i - 1] == '<script>')
L[k] = '(()=>{window.__ev=s=>eval(s);'
s = '\n'.join(L)
a = "else bldDraw(h,q,out,ST,dLine(q)>lodD);}"
assert s.count(a) == 1, 'building loop changed: update mkhook.py'
s = s.replace(a, "else bldDraw(h,q,out,ST,dLine(q)>lodD);if(q.club&&window.__CT){const tmp=[];bldDraw(h,q,tmp,ST,false);"
              "window.__CT.push({T0:h.T0.slice(),q:{x:q.x,y:q.y,bb:q.bb,area:q.area},tris:Array.from(tmp,v=>Math.round(v*1000)/1000)});}}")
open(os.path.join(dst, 'index.html'), 'w').write(s)
print('hooked copy in', dst)
