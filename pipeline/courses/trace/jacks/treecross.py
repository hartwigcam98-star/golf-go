"""for each hole line (course yards from jacks_course.json), list stretches that pass under tree crowns"""
import json,base64,numpy as np
G='/home/claude/golf/';C=json.load(open(G+'auto/jacks/jacks_course.json'));D=json.load(open(G+'auto/jacks/naip_jacks.json'))
xy=np.frombuffer(base64.b64decode(D['xy']),np.int16).reshape(-1,2)/2.0;r=(np.frombuffer(base64.b64decode(D['r']),np.uint8)&127)/10.0
for i,h in enumerate(C['holes']):
    L=np.array(h['line'],float);pts=[];
    for a,b in zip(L,L[1:]):
        n=max(2,int(np.hypot(*(b-a))/2));
        for t in np.linspace(0,1,n,endpoint=False):pts.append(a+(b-a)*t)
    pts.append(L[-1]);P=np.array(pts);s=np.concatenate([[0],np.cumsum(np.hypot(*np.diff(P,axis=0).T))])
    d=np.hypot(P[:,None,0]-xy[None,:,0],P[:,None,1]-xy[None,:,1])-r[None,:]
    under=(d<0).any(1)
    runs=[];st=None
    for k,u in enumerate(under):
        if u and st is None:st=k
        if (not u or k==len(under)-1) and st is not None:runs.append((round(s[st]),round(s[k])));st=None
    tot=sum(b-a for a,b in runs)
    print(f"{i+1:2d} par {h['par']} len {round(s[-1])}: under trees {tot} yd",runs if tot else '')
