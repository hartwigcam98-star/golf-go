# crop.py img out u0 u1 v0 v1 [panels]  : crop the three panels of a fit/show image to a u/v window using frame.npz extents
import sys,cv2,numpy as np,json
img,out,cid=sys.argv[1],sys.argv[2],sys.argv[3];u0,u1,v0,v1=map(float,sys.argv[4:8])
z=np.load(f'/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub/work/{cid}/frame.npz');U=z['U'];a=U[0,0];b=U[0,-1]
im=cv2.imread(img);W=im.shape[1]//3;sc=W/(b-a)
ps=[]
for k in range(3):
    x0=int(k*W+(u0-a)*sc);x1=int(k*W+(u1-a)*sc);y0=int((v0-a)*sc);y1=int((v1-a)*sc)
    ps.append(im[max(0,y0):y1,max(0,x0):x1])
sel=[int(c) for c in (sys.argv[8] if len(sys.argv)>8 else '012')]
cv2.imwrite(out,np.hstack([ps[i] for i in sel]))
