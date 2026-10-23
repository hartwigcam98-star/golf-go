import sys,numpy as np
A='/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub/work/'
cid=sys.argv[1];u0,u1,v0,v1,st=map(float,sys.argv[2:7]);lev=float(sys.argv[7]) if len(sys.argv)>7 else 1
z=np.load(A+cid+'/frame.npz');U,V,H=z['U'],z['V'],z['H'];uu=U[0];vv=V[:,0]
ch='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
us=np.arange(u0,u1+.01,st)
print('     '+''.join(('|' if abs(u%10)<st/2 or abs(u%10-10)<st/2 else ' ') for u in us))
for v in np.arange(v0,v1+.01,st):
    j=np.argmin(abs(vv-v));row=''
    for u in us:
        i=np.argmin(abs(uu-u));h=np.nanmedian(H[max(0,j-1):j+2,max(0,i-1):i+2])
        k=int(np.floor(h/lev));row+='.' if k<1 else (ch[k] if k<len(ch) else '#')
    print('%4.0f '%v+row)
