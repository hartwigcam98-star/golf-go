"""canopy crossings (lidar trees > 3 m) along each hole line in trace.json (NAIP px); usage: python3 cross.py [hole ...]"""
import sys,json,math,numpy as np,cv2
F=2;Y0=480;g=np.load('g2.npy');s=np.load('s2.npy');h=np.where(np.isfinite(s-g),s-g,0).astype(np.float32)
h=cv2.morphologyEx(h,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
S=json.load(open('scale.json'));YX,YY=S['YX'],S['YY']
def cross(line,skip_end=0):
    out=[];tot=0;pos=0;run=None
    for a,b in zip(line,line[1:]):
        L=math.hypot((b[0]-a[0])*YX,(b[1]-a[1])*YY);n=max(2,int(L))
        for t in np.linspace(0,1,n,endpoint=False):
            x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t;r=int((y-Y0)*F);c=int(x*F)
            tall=h[max(r-1,0):r+2,max(c-1,0):c+2].max()>3.0
            if tall:
                tot+=L/n
                if run is None:run=[round(pos)]
            elif run is not None:run.append(round(pos));out.append(run);run=None
            pos+=L/n
    if run is not None:run.append(round(pos));out.append(run)
    return round(tot),out,round(pos)
if __name__=='__main__':
    T=json.load(open('trace.json'))
    ks=sys.argv[1:] or list(T['holes'])
    for k in ks:
        tot,runs,L=cross(T['holes'][k]['line']);print(f'{k:>2} len {L}: canopy {tot} yd',runs if tot else '')
