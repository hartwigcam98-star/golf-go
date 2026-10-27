"""Wire a re-green fetch run into lidar2 for one course: python3 rg_setup.py key runDir"""
import json,math,shutil,os,sys
G='/home/claude/golf/';key,R=sys.argv[1],sys.argv[2].rstrip('/')+'/'
def jl(p,d):return json.load(open(p)) if os.path.exists(p) else d
os.makedirs(G+f'auto/{key}',exist_ok=True);shutil.copy(f'/home/claude/rg/{key}_course.json',G+f'auto/{key}/{key}_course.json')
C=json.load(open(G+f'auto/{key}/{key}_course.json'));lat0,lon0=C['origin']
K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
xf=jl(G+'naip/xf.json',{});xf[key]=[[K,0.0],[0.0,-L],[-lon0*K,lat0*L]];json.dump(xf,open(G+'naip/xf.json','w'))
for f in (f'dem_{key}.npz',f'pts_{key}.npz'):shutil.copy(R+f,G+'lidar2/data/'+f)
S=json.load(open(R+'summary.json'))['courses'][key]
sm=jl(G+'lidar2/data/summary.json',{'dem':{}});sm['dem'][key]=S['dem'];json.dump(sm,open(G+'lidar2/data/summary.json','w'))
cfg=jl(G+'lidar2/cfg.json',{});cfg[key]=dict(epsg=S['dem']['epsg'],greens=[g['bbox']+[g['cand']] for g in S.get('greens',[])]);json.dump(cfg,open(G+'lidar2/cfg.json','w'))
gg=jl(G+'lidar/game_greens.json',{});gg[key]=dict(greens=C['polys']['green'],pins=[h['pin'] for h in C['holes']]);json.dump(gg,open(G+'lidar/game_greens.json','w'))
pts={g:max((v.get('gdens') or 0) for v in d.values()) for g,d in S.get('points',{}).items()}
print(key,'greens',len(S.get('greens',[])),'pts dens min/med',min(pts.values()) if pts else None,sorted(pts.values())[len(pts)//2] if pts else None)
