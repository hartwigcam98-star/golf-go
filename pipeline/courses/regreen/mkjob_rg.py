import json,math,sys,numpy as np,cv2
keys=sys.argv[1].split(',');J=dict(name='Regreen '+' '.join(keys),search=[],want={},holes={},steps={},boxes={},greens={})
def inp(P,x,y):return cv2.pointPolygonTest(np.array(P,np.float32),(float(x),float(y)),False)>=0
for k in keys:
    C=json.load(open(f'/home/claude/rg/{k}_course.json'));lat0,lon0=C['origin']
    K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
    G=C['polys']['green'];seen=[];
    for h in C['holes']:
        p=h['pin'];gi=next((i for i,P in enumerate(G) if inp(P,*p)),None)
        if gi is None:gi=min(range(len(G)),key=lambda i:np.hypot(*(np.mean(G[i],0)-p)))
        if gi not in seen:seen.append(gi)
    bx=[]
    for gi in seen:
        g=np.array(G[gi]);lon=g[:,0]/K+lon0;lat=lat0-g[:,1]/L;bx.append([float(lon.min()),float(lat.min()),float(lon.max()),float(lat.max())])
    a=np.array(bx);B=[a[:,0].min()-.002,a[:,1].min()-.0015,a[:,2].max()+.002,a[:,3].max()+.0015]
    J['boxes'][k]=[round(v,6) for v in B];J['greens'][k]=bx;J['want'][k]='^zzz$';J['holes'][k]='^zzz$';J['steps'][k]='pd'
    J['search'].append([B[1],B[0],B[3],B[2]])
    print(k,len(bx),'greens; box',[round(v,4) for v in B])
json.dump(J,open('/home/claude/rg/job.json','w'))
t=open('/home/claude/rg/tmpl_pd.py').read();open(sys.argv[2],'w').write(t.replace('@@JOB@@',json.dumps(J)))
import ast;ast.parse(open(sys.argv[2]).read());print('ok')
