import sys,numpy as np
A='/home/claude/golf/clubs/work/'
cid=sys.argv[1];u0,u1,v0,v1,st=map(float,sys.argv[2:7])
z=np.load(A+cid+'/frame.npz');U,V,H=z['U'],z['V'],z['H']
uu=U[0];vv=V[:,0]
print('v\\u '+' '.join('%5.0f'%u for u in np.arange(u0,u1+.01,st)))
for v in np.arange(v0,v1+.01,st):
    j=np.argmin(abs(vv-v));row=[]
    for u in np.arange(u0,u1+.01,st):
        i=np.argmin(abs(uu-u));row.append('%5.1f'%np.nanmedian(H[max(0,j-1):j+2,max(0,i-1):i+2]))
    print('%4.0f '%v+' '.join(row))
