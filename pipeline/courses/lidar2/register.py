import sys;sys.path.insert(0,'/home/claude/golf/lidar2');sys.path.insert(0,'/home/claude/golf/lidar')
from common import *
cj={'cambrian':'cambrian/cr_all_course.json','troy':'course.json','stoneridge':'stoneridge/course.json','caledonia':'pawleys/cal_course.json','trueblue':'pawleys/tb_course.json','rossbridge':'alabama/rb_course.json','senator':'alabama/ch/sen_course.json','judge':'alabama/ch/jud_course.json','legislator':'alabama/ch/leg_course.json','sandvalley':'sandvalley/sandvalley_course.json','mammoth':'sandvalley/mammoth_course.json','lido':'sandvalley/lido_course.json','sedge':'sandvalley/sedge_course.json','wilderness':'iron/wilderness_course.json','quarry':'iron/quarry_course.json','legend':'iron/legend_course.json'}
for _k in ('jewel','ridges','edinburgh','willingers','northfork'):cj[_k]='mn5/'+_k+'_course.json'
class _CJ(dict):
    def __missing__(self,k):return f'auto/{k}/{k}_course.json'
cj=_CJ(cj)
def bunker_sets(name):
    C=json.load(open('/home/claude/golf/'+cj[name]));B=[np.array(b) for b in C['polys'].get('bunker',[]) if len(b)>3];ins=[];outs=[]
    for b in B:
        x0,y0=b.min(0)-4;x1,y1=b.max(0)+4
        gx,gy=np.meshgrid(np.arange(x0,x1,.5),np.arange(y0,y1,.5))
        m=np.zeros(gx.shape,np.uint8);cv2.fillPoly(m,[((b-[x0,y0])/.5).astype(np.int32)],1);dil=cv2.dilate(m,np.ones((13,13),np.uint8))
        if m.sum()<4:continue
        ins.append((gx[m>0],gy[m>0]));outs.append((gx[(dil>0)&(m==0)],gy[(dil>0)&(m==0)]))
    return ins,outs
def depth(s,ins,outs,ox,oy):
    X=np.concatenate([i[0] for i in ins]);Y=np.concatenate([i[1] for i in ins]);Xo=np.concatenate([o[0] for o in outs]);Yo=np.concatenate([o[1] for o in outs])
    zi=np.split(S1(s,X+ox,Y+oy),np.cumsum([len(i[0]) for i in ins])[:-1]);zo=np.split(S1(s,Xo+ox,Yo+oy),np.cumsum([len(o[0]) for o in outs])[:-1])
    return np.mean([a.mean()-b.mean() for a,b in zip(zi,zo)])
if __name__=='__main__':
    import os
    out=json.load(open('/home/claude/golf/lidar2/regshift.json')) if os.path.exists('/home/claude/golf/lidar2/regshift.json') else {}
    for name in (sys.argv[1:] or CFG):
        ins,outs=bunker_sets(name);s=dem_sampler(name);best=(0,0);step=.5
        for it in range(3):
            cand=[(best[0]+i*step,best[1]+j*step) for i in range(-3,4) for j in range(-3,4)]
            r={c:depth(s,ins,outs,*c) for c in cand};best=min(r,key=r.get);step/=2.5
        out[name]=[round(best[0],2),round(best[1],2)];print(name,out[name],round(r[best]*100,1))
    json.dump(out,open('/home/claude/golf/lidar2/regshift.json','w'))
