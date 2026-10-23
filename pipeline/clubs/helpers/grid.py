import sys,numpy as np
# grid.py cid u0 u1 v0 v1 step -> table of median heights (x10, as ints) ; '.' = ground (<0.8)
A='/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub/work/'
cid=sys.argv[1];u0,u1,v0,v1,st=map(float,sys.argv[2:7])
z=np.load(A+cid+'/frame.npz');U,V,H=z['U'],z['V'],z['H'];u=U[0];v=V[:,0]
us=np.arange(u0,u1+1e-6,st);print('v\\u '+''.join('%4d'%x for x in us))
for y in np.arange(v0,v1+1e-6,st):
    r=np.abs(v-y)<=st/2;row=[]
    for x in us:
        c=np.abs(u-x)<=st/2;h=np.median(H[np.ix_(r,c)]);row.append('   .' if h<0.8 else '%4d'%round(h*10))
    print('%4d'%y+''.join(row))
