import json,sys
# tidy fit.json -> final.json: set ridge to the height the roof really reaches (no shape change)
A='/home/claude/golf/clubs/work/'
cid=sys.argv[1];src=sys.argv[2] if len(sys.argv)>2 else 'fit.json'
d=json.load(open(A+cid+'/'+src))
def cap(b):
    t,u0,u1,v0,v1,e,p,r=b[:8]
    if t in('GU','GV','H'):
        m=e+p*((v1-v0)/2 if t=='GU' else (u1-u0)/2 if t=='GV' else min(u1-u0,v1-v0)/2)
        b[7]=round(min(r,m),2)
    elif t in('SU','SV'):
        end=e+p*((u1-u0) if t=='SU' else (v1-v0))
        lo,hi=min(e,end),max(e,end)
        b[7]=round(r if lo<=r<=hi else end,2)
for b in d['blocks']: cap(b)
for p in d.get('parts',[]):
    for b in p['blocks']: cap(b)
json.dump(d,open(A+cid+'/final.json','w'),indent=0)
