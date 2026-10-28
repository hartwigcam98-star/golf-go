"""Reeds data job: lidar canopy (top surface minus ground) round the water, plus the NAIP photo.
usage: python3 mkjob_reeds.py key:EPTresource:epsg[,key:...] out.py"""
import json,math,sys,numpy as np,cv2
T=open('/home/claude/golf/auto/fetch_job_tmpl.py').read()
head=T.split('def osmapi_box')[0]
naipfn='NAIP'+T.split('\nNAIP',1)[1].split('\n# ---------- 5.')[0] if '\nNAIP' in T else None
J={}
for spec in sys.argv[1].split(','):
    k,res,epsg=spec.split(':');W=json.load(open(f'/home/claude/reeds/{k}_w.json'));lat0,lon0=W['origin']
    K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
    polys=[np.array(p) for p in W['water']+W['wetland']+W['swater'] if len(p)>2]
    allp=np.concatenate([p for p in np.array(W['mown'],dtype=object)] if False else [np.array(p) for p in W['mown']])
    x0,y0=allp.min(0)-250;x1,y1=allp.max(0)+250
    st=200*1.0936;tiles=[]
    m=np.zeros((int((y1-y0)/4)+1,int((x1-x0)/4)+1),np.uint8)
    for p in polys:cv2.fillPoly(m,[((p-[x0,y0])/4).round().astype(np.int32)],1)
    m=cv2.dilate(m,np.ones((9,9),np.uint8))   # +16 yd
    for ty in np.arange(y0,y1,st):
        for tx in np.arange(x0,x1,st):
            sub=m[int((ty-y0)/4):int((ty+st-y0)/4)+1,int((tx-x0)/4):int((tx+st-x0)/4)+1]
            if sub.any():tiles.append([tx/K+lon0,lat0-(ty+st)/L,(tx+st)/K+lon0,lat0-ty/L])
    J[k]=dict(res=res,epsg=int(epsg),tiles=[[round(v,7) for v in t] for t in tiles],bbox=[x0/K+lon0,lat0-y1/L,x1/K+lon0,lat0-y0/L])
    print(k,len(tiles),'tiles')
body=r'''
NAIP_URLS = NAIPLIST
def grow(b, m):
    lat = (b[1] + b[3]) / 2; dx = m / (111320 * math.cos(math.radians(lat))); dy = m / 110574
    return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy]
EPT = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/%s/ept.json'
def merc(lon, lat): R = 6378137.0; return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
def tile(key, ti, res, box, epsg):
    import pdal
    W, S_, E, N = box; x0, y0 = merc(W, S_); x1, y1 = merc(E, N)
    spec = [{'type': 'readers.ept', 'filename': EPT % res, 'bounds': f'([{x0:.2f},{x1:.2f}],[{y0:.2f},{y1:.2f}])', 'resolution': 0.5, 'threads': 4}]
    p = pdal.Pipeline(json.dumps(spec)); n = p.execute(); a = p.arrays[0] if p.arrays else None
    if a is None or len(a) == 0: return key, ti, None
    cls = a['Classification'].astype(int); ok = (cls != 7) & (cls != 18)
    tf = Transformer.from_crs(3857, epsg, always_xy=True); X, Y = tf.transform(a['X'][ok], a['Y'][ok]); X = np.asarray(X); Y = np.asarray(Y); Z = np.asarray(a['Z'][ok]); c = cls[ok]
    return key, ti, dict(x=X.astype(np.float64), y=Y.astype(np.float64), z=Z.astype(np.float32), g=(c == 2))
def main():
    for key, J in JOB.items():
        SUM['courses'][key] = {'tiles': len(J['tiles'])}; save()
        try: naip(key, J['bbox'])
        except Exception as e: err(f'naip {key}', e)
        tf = Transformer.from_crs(4326, J['epsg'], always_xy=True)
        b = J['bbox']; xs, ys = tf.transform([b[0], b[2], b[0], b[2]], [b[1], b[1], b[3], b[3]])
        gx0, gy0, gx1, gy1 = math.floor(min(xs)), math.floor(min(ys)), math.ceil(max(xs)), math.ceil(max(ys))
        w, h = gx1 - gx0, gy1 - gy0
        top = np.full((h, w), -1e9, np.float32); gs = np.zeros((h, w), np.float32); gn = np.zeros((h, w), np.uint16); cnt = np.zeros((h, w), np.uint16)
        with ProcessPoolExecutor(4) as ex:
            fs = [ex.submit(tile, key, ti, J['res'], t, J['epsg']) for ti, t in enumerate(J['tiles'])]
            for f in as_completed(fs):
                try: k, ti, d = f.result()
                except Exception as e: err(f'tile {key}', e); continue
                if d is None: log(key, ti, 'no points'); continue
                ix = np.floor(d['x'] - gx0).astype(np.int64); iy = np.floor(gy1 - d['y']).astype(np.int64); m = (ix >= 0) & (iy >= 0) & (ix < w) & (iy < h)
                ix, iy, z, g = ix[m], iy[m], d['z'][m], d['g'][m]
                np.maximum.at(top, (iy, ix), z); np.add.at(cnt, (iy, ix), 1)
                np.add.at(gs, (iy[g], ix[g]), z[g]); np.add.at(gn, (iy[g], ix[g]), 1)
                log(key, ti, len(z), 'pts')
        ground = np.where(gn > 0, gs / np.maximum(gn, 1), np.nan).astype(np.float32); top[top < -1e8] = np.nan
        np.savez_compressed(f'{OUT}/chm_{key}.npz', top=top, ground=ground, cnt=cnt, x0=gx0, y1=gy1, epsg=J['epsg'])
        SUM['courses'][key]['grid'] = [w, h]; save(); log(key, 'saved', w, h)
    SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save()
if __name__ == '__main__':
    main()
'''
src=T.split('# ---------- 5.')[0]   # helpers incl. get/export_json/naip and the NAIP list
src=src.replace('@@JOB@@',json.dumps(J))
out=src+body.replace('NAIP_URLS = NAIPLIST','')
open(sys.argv[2],'w').write(out)
import ast;ast.parse(out);print('ok')
