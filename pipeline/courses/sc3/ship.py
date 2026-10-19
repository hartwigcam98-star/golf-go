import hashlib,re,sys,json,time
W='/home/claude/golf/work/';R='/home/claude/golf-go/'
s=open(W+'index.html').read();data=[]
for f in ('greens.js','ground.js','trees.js'):
    b=open(W+f,'rb').read();v=hashlib.sha1(b).hexdigest()[:10];open(R+f,'wb').write(b)
    s,n=re.subn(r'<script src="'+re.escape(f)+r'\?v=[0-9a-f]+"></script>',f'<script src="{f}?v={v}"></script>',s);assert n==1,f
    data.append(f'{f}?v={v}')
title,items=sys.argv[1],sys.argv[2:]
if title:
    uid=time.strftime('%Y-%m-%d')+'-'+hashlib.sha1(title.encode()).hexdigest()[:4]
    ent="  {id:%s,date:%s,title:%s,items:[\n%s]},\n"%(json.dumps(uid),json.dumps(time.strftime('%b %-d, %Y')),json.dumps(title),',\n'.join('    '+json.dumps(i,ensure_ascii=False) for i in items))
    a='const UPDATES=[\n';assert s.count(a)==1;s=s.replace(a,a+ent)
open(R+'index.html','w').write(s)
sw=open(R+'sw.js').read();v=hashlib.sha1(s.encode()).hexdigest()[:10]
sw=re.sub(r"const V='[0-9a-f]+'",f"const V='{v}'",sw)
for d in data:
    nm=d.split('?')[0];sw,n=re.subn(re.escape(nm)+r'\?v=[0-9a-f]+',d,sw);assert n==1,nm
open(R+'sw.js','w').write(sw);print('shipped',data,'sw',v)
