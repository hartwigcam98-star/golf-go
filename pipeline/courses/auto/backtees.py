"""Suggest back tees: for holes shorter than the card, the tee polygon (within 90 yd of the current tee, behind it) whose
distance to the first bend/pin best matches the card. usage (from golf/): python3 auto/backtees.py key [write]"""
import json,math,sys
k=sys.argv[1];C=json.load(open(f'auto/{k}/{k}_course.json'));card=json.load(open(f'auto/{k}/scorecard.json'))['card']
L=lambda P:sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(P,P[1:]))
cen=[(sum(p[0] for p in P)/len(P),sum(p[1] for p in P)/len(P)) for P in C['polys']['tee']]
out={}
for i,h in enumerate(C['holes']):
    ln=L(h['line']);c=card[i][2]
    if ln>=c*0.97:continue
    t0=h['line'][0];nxt=h['line'][1];rest=ln-math.hypot(nxt[0]-t0[0],nxt[1]-t0[1])
    best=None
    for x,y in cen:
        if math.hypot(x-t0[0],y-t0[1])>90:continue
        l2=math.hypot(nxt[0]-x,nxt[1]-y)+rest
        if l2<=ln+2:continue
        sc=abs(l2-c)
        if best is None or sc<best[0]:best=(sc,round(x,1),round(y,1),round(l2))
    print(i+1,'built',round(ln),'card',c,'->',best and best[1:])
    if best and best[3]<=c*1.05:out[str(i+1)]=[best[1],best[2]]
if len(sys.argv)>2:
    f=f'auto/{k}/{k}_edits.json';import os;E=json.load(open(f)) if os.path.exists(f) else {};E.setdefault('tees',{}).update(out);json.dump(E,open(f,'w'));print('wrote',out)
