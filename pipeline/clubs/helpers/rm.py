# residual char map: data - model ; '.' |r|<0.5, lowercase a..: model too low by 1,2.. ; uppercase: model too high
import sys,json,numpy as np
sys.path.insert(0,'/home/claude/golf/clubs')
import bk
A='/home/claude/golf/clubs/work/'
cid=sys.argv[1];f=sys.argv[2];u0,u1,v0,v1,st=map(float,sys.argv[3:8])
z=np.load(A+cid+'/frame.npz');U,V,H,G=z['U'],z['V'],z['H'],z['G']
B=json.load(open(f))['blocks'];M=np.maximum(bk.env(B,U,V),G)
R=H-M;uu=U[0];vv=V[:,0];us=np.arange(u0,u1+.01,st)
print('     '+''.join(('|' if abs(u%10)<st/2 or abs(u%10-10)<st/2 else ' ') for u in us))
for v in np.arange(v0,v1+.01,st):
    j=np.argmin(abs(vv-v));row=''
    for u in us:
        i=np.argmin(abs(uu-u));r=np.nanmedian(R[max(0,j-1):j+2,max(0,i-1):i+2])
        if abs(r)<0.5: row+='.'
        elif r>0: row+= 'abcdefghij'[min(9,int(r))] 
        else: row+='ABCDEFGHIJ'[min(9,int(-r))]
    print('%4.0f '%v+row)
