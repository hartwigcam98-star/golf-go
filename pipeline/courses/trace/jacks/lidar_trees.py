"""Drop photo-detected trees where the 2022 lidar shows no tall vegetation (canopy < 2 m over the crown's inner half). Run after auto/trees.py."""
import json,math,base64,numpy as np,cv2
G='/home/claude/golf/';F=2;Y0=480
g=np.load(G+'trace/g2.npy');s=np.load(G+'trace/s2.npy');h=np.where(np.isfinite(s-g),s-g,0).astype(np.float32)
C=json.load(open(G+'auto/jacks/jacks_course.json'));N=json.load(open(G+'run_jacks/naip_jacks.json'));W,H=N['size'];e=N['ext']
lat0,lon0=C['origin'];K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
f=G+'auto/jacks/naip_jacks.json';D=json.load(open(f))
xy=np.frombuffer(base64.b64decode(D['xy']),np.int16).reshape(-1,2)/2.0;rb=np.frombuffer(base64.b64decode(D['r']),np.uint8);r=(rb&127)/10.0
keep=np.ones(len(xy),bool);outside=0
for i,((x,y),rr) in enumerate(zip(xy,r)):
    lon=x/K+lon0;lat=lat0-y/L;px=((lon-e[0])/(e[2]-e[0])*W-.5)*F;py=((e[3]-lat)/(e[3]-e[1])*H-.5-Y0)*F
    if not (0<=px<h.shape[1] and 0<=py<h.shape[0]):outside+=1;continue
    rx=max(1,int(rr*0.5/0.657*F));ry=max(1,int(rr*0.5/0.951*F))
    win=h[max(0,int(py)-ry):int(py)+ry+1,max(0,int(px)-rx):int(px)+rx+1]
    if win.size and np.percentile(win,90)<2.0:keep[i]=False
print('trees',len(xy),'no lidar canopy -> dropped',int((~keep).sum()),'outside lidar grid',outside)
D['n']=int(keep.sum());D['xy']=base64.b64encode(np.round(xy[keep]*2).astype(np.int16).tobytes()).decode();D['r']=base64.b64encode(rb[keep].tobytes()).decode()
json.dump(D,open(f,'w'))
