"""NED grids from the fetch job -> DEM_<SUF>/WIDE_<SUF> constants. Run inside golf/auto/<key>/: python3 ../consts.py key SUF runDir"""
import json,math,sys
key,SUF,R=sys.argv[1],sys.argv[2],sys.argv[3]
lat0,lon0=json.load(open(f'{key}_course.json'))['origin']
K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
n=json.load(open(f'{R}/ned_{key}.json'));w=json.load(open(f'{R}/nedwide_{key}.json'))
def fix(z):
    good=[v for v in z if v is not None];m=sorted(good)[len(good)//2]
    return [round((v if v is not None else m)*10)-2600 for v in z]
dem=dict(x0=round((n['lonW']-lon0)*K,3),y0=round(-(n['latN']-lat0)*L,3),dx=round(n['st']*K,4),dy=round(n['st']*L,4),nc=n['NC'],nr=n['NR'],v=fix(n['z']))
N=w['N'];wide=dict(x0=round((w['lonW']-lon0)*K,3),y0=round(-(w['latN']-lat0)*L,3),dx=round((w['lonE']-w['lonW'])/(N-1)*K,4),dy=round((w['latN']-w['latS'])/(N-1)*L,4),nc=N,nr=N,v=fix(w['z']))
js=lambda d:'{'+','.join(f'{k}:{json.dumps(v,separators=(",",":"))}' for k,v in d.items())+'}'
open(f'{key}_consts.js','w').write(f'const DEM_{SUF}={js(dem)};\nconst WIDE_{SUF}={js(wide)};\n')
print(key,'dem',dem['nc'],'x',dem['nr'],'range m',(min(dem['v'])+2600)/10,(max(dem['v'])+2600)/10)
