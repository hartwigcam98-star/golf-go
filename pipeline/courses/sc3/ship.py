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
import subprocess
print(subprocess.run(['python3',R+'tools/stamp.py',R],check=True,capture_output=True,text=True).stdout.strip())   # data ?v=, build stamp, sw.js V/B
print('shipped',data)
