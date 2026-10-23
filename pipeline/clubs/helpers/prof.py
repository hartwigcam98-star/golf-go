import sys,numpy as np
# usage: prof.py cid u|v at lo hi [step]  -> heights along a line (median of +-0.5 yd band)
A='/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub/work/'
cid,ax,at,lo,hi=sys.argv[1],sys.argv[2],float(sys.argv[3]),float(sys.argv[4]),float(sys.argv[5]);st=float(sys.argv[6]) if len(sys.argv)>6 else 1
z=np.load(A+cid+'/frame.npz');U,V,H,G=z['U'],z['V'],z['H'],z['G']
u=U[0];v=V[:,0];out=[]
for x in np.arange(lo,hi+1e-6,st):
    if ax=='u': # line at v=at, varying u
        r=np.abs(v-at)<=0.5;c=np.abs(u-x)<=0.25
    else:
        c=np.abs(u-at)<=0.5;r=np.abs(v-x)<=0.25
    h=H[np.ix_(r,c)];g=G[np.ix_(r,c)]
    out.append('%g:%.1f/%.1f'%(x,np.median(h),np.median(g)))
print(' '.join(out))
