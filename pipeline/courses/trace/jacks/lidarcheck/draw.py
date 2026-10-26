"""slope tiles: colour = slope (green 0% .. red 5%+), white contour lines every 5 cm; outside the green dimmed"""
import json,glob,numpy as np,cv2,sys
def tile(Z,M,st,size=220):
    gy,gx=np.gradient(Z,st);S=np.hypot(gx,gy)*100;t=np.clip(S/5,0,1)
    col=np.zeros(Z.shape+(3,),np.uint8);col[...,1]=(200*(1-np.clip((t-.5)*2,0,1))).astype(np.uint8);col[...,2]=(255*np.clip(t*2,0,1)).astype(np.uint8);col[...,0]=40
    col[~M]=(col[~M]*.3).astype(np.uint8)
    lv=np.floor(Z*0.9144*20);e=(np.abs(np.diff(lv,axis=0,prepend=lv[:1]))+np.abs(np.diff(lv,axis=1,prepend=lv[:,:1])))>0
    col[e&M]=(255,255,255)
    k=size/max(Z.shape);return cv2.resize(col,(int(Z.shape[1]*k),int(Z.shape[0]*k)),interpolation=cv2.INTER_NEAREST)
if __name__=='__main__':
    tiles=[]
    for f in sorted(glob.glob('g[0-9][0-9].json')):
        g=json.load(open(f));Z=np.array(g['Z']).reshape(g['ny'],g['nx']);M=np.array(g['M']).reshape(g['ny'],g['nx'])>0
        t=tile(Z,M,g['st']);c=np.zeros((230,230,3),np.uint8);c[:t.shape[0],:t.shape[1]]=t;cv2.putText(c,str(g['hole']),(4,18),0,.6,(255,255,255),2);tiles.append(c)
    rows=[np.hstack(tiles[i:i+6]) for i in range(0,18,6)];cv2.imwrite('game_greens.jpg',np.vstack(rows))
