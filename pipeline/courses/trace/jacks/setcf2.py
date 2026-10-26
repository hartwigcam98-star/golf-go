"""Replace one course's CFEEL2 entry in a page: python3 setcf2.py page.html key extras.json"""
import sys,json
f,k,ex=sys.argv[1:4];s=open(f).read();E=json.load(open(ex))['cfeel2']
a='const CFEEL2={';i=s.index(a);seg_end=s.index('\n',i)
p=s.find(k+':{',i)
assert i<p<seg_end,(i,p,seg_end)
d=0;q=p+len(k)+1
while True:
    ch=s[q]
    if ch=='{':d+=1
    elif ch=='}':
        d-=1
        if d==0:break
    q+=1
s=s[:p]+k+':'+json.dumps(E,separators=(',',':'))+s[q+1:];open(f,'w').write(s);print('replaced',k)
