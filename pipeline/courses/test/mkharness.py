import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
i=s.index("<script>/* What's New");j=s.rfind('})();',0,i)
s=s[:j]+'window.__ev=s=>eval(s);\n'+s[j:]
a='function camTarget(){\n'
assert s.count(a)==1
s=s.replace(a,a+'  if(window.__camOv)return{E:window.__camOv.E.slice(),L:window.__camOv.L.slice(),cut:true};\n')
open(dst,'w').write(s)
