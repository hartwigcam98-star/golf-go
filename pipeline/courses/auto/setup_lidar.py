"""Wire a fetch-job download into the lidar pipeline for one course: python3 setup_lidar.py key runDir"""
import json,math,shutil,os,numpy as np,sys
G='/home/claude/golf/';key,R=sys.argv[1],sys.argv[2].rstrip('/')+'/'
def jl(p,d):return json.load(open(p)) if os.path.exists(p) else d
C=json.load(open(G+f'auto/{key}/{key}_course.json'));lat0,lon0=C['origin']
K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
xf=jl(G+'naip/xf.json',{});xf[key]=[[K,0.0],[0.0,-L],[-lon0*K,lat0*L]];json.dump(xf,open(G+'naip/xf.json','w'))
shutil.copy(R+f'lidar_{key}.json',G+f'lidar_{key}.json')
np.save(G+f'lidar/{key}.npy',np.load(R+f'demll_{key}.npz')['z'].astype(np.float32))
for f in (f'dem_{key}.npz',f'pts_{key}.npz'):shutil.copy(R+f,G+'lidar2/data/'+f)
S=json.load(open(R+'summary.json'))['courses'][key]
sm=jl(G+'lidar2/data/summary.json',{'dem':{}});sm['dem'][key]=S['dem'];json.dump(sm,open(G+'lidar2/data/summary.json','w'))
cfg=jl(G+'lidar2/cfg.json',{});lm=json.load(open(R+f'lidar_{key}.json'))
cfg[key]=dict(epsg=S['dem']['epsg'],ext=lm['ext'],greens=[g['bbox']+[g['cand']] for g in S.get('greens',[])]);json.dump(cfg,open(G+'lidar2/cfg.json','w'))
gg=jl(G+'lidar/game_greens.json',{});gg[key]=dict(greens=C['polys']['green'],pins=[h['pin'] for h in C['holes']]);json.dump(gg,open(G+'lidar/game_greens.json','w'))
print(key,'greens',len(C['polys']['green']),'osm green boxes',len(cfg[key]['greens']),'dem',S['dem'].get('src') or list(S['dem'].keys())[:6])
