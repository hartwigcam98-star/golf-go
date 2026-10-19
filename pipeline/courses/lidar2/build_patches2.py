"""Green-surround patches from the raw lidar ground points (local quadratic fits), registered to the course map."""
import sys,base64;sys.path.insert(0,'/home/claude/golf/lidar2');sys.path.insert(0,'/home/claude/golf/lidar')
from common import *
from grid import fit
from build_patches import enc
SIG=json.load(open('/home/claude/golf/lidar2/sigma.json'));PSH=json.load(open('/home/claude/golf/lidar2/ptshift.json'));RSH=json.load(open('/home/claude/golf/lidar2/regshift.json'))
STEP={'stoneridge':.5,'rossbridge':.5,'troy':.5,'sandvalley':.5,'mammoth':.5,'quarry':.5,'legend':.5,'wilderness':1.0,'jewel':.5,'ridges':.5,'edinburgh':.5,'willingers':.5,'northfork':.5}
M=14
def build(name,keep=False):
    P=load_pts(name);gl=green_list(name);sig=SIG[name];st=STEP.get(name,.5);p=np.array(PSH[name]);r=np.array(RSH[name])
    dem=dem_sampler(name,sig=sig/YD*.8);pats=[];dbg=[]
    for gi,g in enumerate(gl):
        x0,y0=np.floor(g.min(0)-M);x1,y1=np.ceil(g.max(0)+M);nx=int(round((x1-x0)/st))+1;ny=int(round((y1-y0)/st))+1
        GX,GY=np.meshgrid(x0+np.arange(nx)*st,y0+np.arange(ny)*st)
        Zd=S1(dem,GX+r[0],GY+r[1]).reshape(GX.shape)
        if gi not in P:
            print('  green',gi,'no point cloud: 1 m model only');Z=Zd;zmin=float(Z.min());q=np.round((Z-zmin)*1000).astype(np.int64)
            pats.append([float(x0),float(y0),nx,ny,round(zmin,3),base64.b64encode(enc(q)).decode(),st]);continue
        d=max(P[gi].values(),key=lambda d:len(d['x']));px=d['x']+p[0]-r[0];py=d['y']+p[1]-r[1]
        Zf,sx,sy,ws=fit(px,py,d['z'],GX,GY,sig,2)
        Zd=S1(dem,GX+r[0],GY+r[1]).reshape(GX.shape)
        ok=np.isfinite(Zf)&(ws>16)
        if ok.sum()>50:
            off=float(np.median((Zf-Zd)[ok]))
            if abs(off)>.15:Zd=Zd+off;print('  green',gi,'DEM offset %.2f yd'%off)
        a=np.clip((ws-6)/10,0,1);a=np.where(np.isfinite(Zf),a,0);Zf=np.where(np.isfinite(Zf),Zf,Zd)
        dis=float(np.percentile(np.abs(Zf-Zd)[ok],75)) if ok.sum()>50 else 0
        if dis<.2:a*=np.clip(1-(np.abs(Zf-Zd)-.25)/.25,0,1)
        else:print('  green',gi,'DEM disagrees (p75 %.2f yd): points only where dense'%dis)
        Z=Zf*a+Zd*(1-a)
        zmin=float(Z.min());q=np.round((Z-zmin)*1000).astype(np.int64);b=enc(q)
        pats.append([float(x0),float(y0),nx,ny,round(zmin,3),base64.b64encode(b).decode(),st])
        if keep:dbg.append(dict(Z=Z,a=a,GX=GX,GY=GY,g=g))
    return pats,dbg
if __name__=='__main__':
    res={}
    for name in (sys.argv[1:] or CFG):
        pats,_=build(name);res[name]=pats;print(name,len(pats),sum(len(q[5]) for q in pats)//1024,'KB',flush=True)
    json.dump(res,open(f'/home/claude/golf/lidar2/patches_{"_".join(sys.argv[1:]) or "all"}.json','w'),separators=(',',':'))

