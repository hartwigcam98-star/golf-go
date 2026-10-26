"""Transplant one course's rebuilt data from work/ into the live golf-go files: python3 swap.py key SUF name"""
import sys,json,re
k,S,name=sys.argv[1:4];W='/home/claude/golf/work/';L='/home/claude/golf-go/'
def block(s):
    i=s.index('\n// ',s.index('let SURR_'+S)-3000000 if False else 0)
    a=s.index(f'{name} (player request)');a=s.rfind('\n',0,a)+1;b=s.index(f'// end {name}',a);b=s.index('\n',b)+1;return a,b
w=open(W+'index.html').read();l=open(L+'index.html').read()
wa,wb=block(w);la,lb=block(l);l=l[:la]+w[wa:wb]+l[lb:];open(L+'index.html','w').write(l);print('page block',lb-la,'->',wb-wa)
for f,var in (('greens.js','LIDG'),('ground.js','LIDW'),('trees.js','R3NAIP')):
    def get(t):i=t.index('const '+var+'=');j=t.find('\n',i);j=len(t) if j<0 else j;return i,j,json.loads(t[i+len('const '+var+'='):j].rstrip(';'))
    wt=open(W+f).read();lt=open(L+f).read();_,_,WD=get(wt);i,j,LD=get(lt);LD[k]=WD[k]
    open(L+f,'w').write(lt[:i]+'const '+var+'='+json.dumps(LD,separators=(',',':'))+';'+lt[j:]);print(f,var,'swapped',k)
