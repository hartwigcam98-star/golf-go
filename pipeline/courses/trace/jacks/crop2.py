import cv2,sys,numpy as np
im=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg')
Z=np.load('/home/claude/golf/trace/zn.npy')
x0,y0,x1,y1=map(int,sys.argv[1:5]);out=sys.argv[5];step=int(sys.argv[6]);sc=float(sys.argv[7]);mode=sys.argv[8] if len(sys.argv)>8 else 'n'
def grid(c):
    for x in range((x0//step+1)*step,x1,step):
        X=int((x-x0)*sc);cv2.line(c,(X,0),(X,c.shape[0]),(0,255,255) if x%(step*2)==0 else (0,140,140),1)
        if x%(step*2)==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//step+1)*step,y1,step):
        Y=int((y-y0)*sc);cv2.line(c,(0,Y),(c.shape[1],Y),(0,255,255) if y%(step*2)==0 else (0,140,140),1)
        if y%(step*2)==0: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
    return c
c=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
outs=[grid(c)]
if 'h' in mode.lower():
    z=Z[y0:y1,x0:x1].astype(np.float64)*3
    gy,gx=np.gradient(z,0.87,0.60);az=np.radians(315);alt=np.radians(45)
    sl=np.arctan(np.hypot(gx,gy));asp=np.arctan2(-gx,gy)
    h=np.clip((np.sin(alt)*np.cos(sl)+np.cos(alt)*np.sin(sl)*np.cos(az-asp))*255,0,255).astype(np.uint8)
    h=cv2.cvtColor(cv2.resize(h,None,fx=sc,fy=sc),cv2.COLOR_GRAY2BGR);outs.append(grid(h))
if "H" in mode: outs=outs[1:]
cv2.imwrite(out,np.hstack(outs) if len(outs)>1 else outs[0],[cv2.IMWRITE_JPEG_QUALITY,85])
