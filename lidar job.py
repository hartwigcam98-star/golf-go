# Golf Go tree lidar job: canopy height and a vertical profile of the vegetation over a course's tree area.
# Runs on GitHub Actions (fetch.yml on the tree-lidar branch). Results go to the "tree-lidar-data" branch only.
# Per course, on a UTM grid:
#   chm  (1 m cells): highest return minus ground, decimetres (uint16; 0 = bare / no returns)
#   gnd  (1 m cells): mean ground (class 2) height, metres (float32, NaN where none)
#   prof (2 m cells): count of returns in 1-m height-above-ground bins 0..31 (uint8 per bin, 31 = 31 m and up)
import json, math, os, time, traceback
import numpy as np
from concurrent.futures import ProcessPoolExecutor, as_completed
from pyproj import Transformer
JOB = {"troy": {"res": "WI_StWide_4_StCroix_2021", "epsg": 26915, "bbox": [-92.7502, 44.8862, -92.7277, 44.9117]}}
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
SUM = {'started': time.strftime('%Y-%m-%d %H:%M:%S'), 'courses': {}, 'errors': []}
def save(): json.dump(SUM, open(f'{OUT}/summary.json', 'w'), indent=1)
def log(*a): print(time.strftime('%H:%M:%S'), *a, flush=True)
def err(where, e):
    SUM['errors'].append(f'{where}: {e}'); log('FAIL', where, e); traceback.print_exc(); save()
EPT = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/%s/ept.json'
NB = 32; TS = 250.0; BUF = 15.0

def tile(res, epsg, ux0, uy0):
    """one TS x TS m UTM tile (+BUF for the ground search); returns points of the core with height above ground"""
    import pdal
    tf = Transformer.from_crs(epsg, 3857, always_xy=True)
    xs, ys = tf.transform([ux0 - BUF, ux0 + TS + BUF, ux0 - BUF, ux0 + TS + BUF], [uy0 - BUF, uy0 - BUF, uy0 + TS + BUF, uy0 + TS + BUF])
    spec = [{'type': 'readers.ept', 'filename': EPT % res, 'bounds': f'([{min(xs):.2f},{max(xs):.2f}],[{min(ys):.2f},{max(ys):.2f}])', 'threads': 4},
            {'type': 'filters.range', 'limits': 'Classification![7:7],Classification![18:18]'},
            {'type': 'filters.reprojection', 'in_srs': 'EPSG:3857', 'out_srs': f'EPSG:{epsg}'},
            {'type': 'filters.hag_nn', 'count': 4}]
    p = pdal.Pipeline(json.dumps(spec)); p.execute(); a = p.arrays[0] if p.arrays else None
    if a is None or len(a) == 0: return ux0, uy0, None
    X = np.asarray(a['X']); Y = np.asarray(a['Y'])
    m = (X >= ux0) & (X < ux0 + TS) & (Y >= uy0) & (Y < uy0 + TS)
    return ux0, uy0, dict(x=X[m], y=Y[m], z=np.asarray(a['Z'])[m].astype(np.float32), hag=np.asarray(a['HeightAboveGround'])[m].astype(np.float32),
                          g=(np.asarray(a['Classification'])[m] == 2))

def main():
    for key, J in JOB.items():
        SUM['courses'][key] = {'res': J['res']}; save()
        tf = Transformer.from_crs(4326, J['epsg'], always_xy=True)
        b = J['bbox']; xs, ys = tf.transform([b[0], b[2], b[0], b[2]], [b[1], b[1], b[3], b[3]])
        gx0, gy0 = math.floor(min(xs)), math.floor(min(ys)); gx1, gy1 = math.ceil(max(xs)), math.ceil(max(ys))
        gx1 = gx0 + int(math.ceil((gx1 - gx0) / TS) * TS); gy1 = gy0 + int(math.ceil((gy1 - gy0) / TS) * TS)
        w, h = gx1 - gx0, gy1 - gy0; w2, h2 = w // 2, h // 2
        chm = np.zeros((h, w), np.float32); gs = np.zeros((h, w), np.float32); gn = np.zeros((h, w), np.uint16)
        prof = np.zeros((h2, w2, NB), np.uint16)
        jobs = [(gx0 + i * TS, gy0 + j * TS) for j in range(int(h / TS)) for i in range(int(w / TS))]
        SUM['courses'][key]['tiles'] = len(jobs); SUM['courses'][key]['grid'] = [w, h, gx0, gy1]; save()
        npts = 0
        with ProcessPoolExecutor(4) as ex:
            fs = [ex.submit(tile, J['res'], J['epsg'], ux, uy) for ux, uy in jobs]
            for f in as_completed(fs):
                try: ux, uy, d = f.result()
                except Exception as e: err(f'tile {key}', e); continue
                if d is None: log(key, 'no points'); continue
                ix = np.floor(d['x'] - gx0).astype(np.int64); iy = np.floor(gy1 - d['y']).astype(np.int64)
                k = (ix >= 0) & (iy >= 0) & (ix < w) & (iy < h); ix, iy = ix[k], iy[k]
                hg = np.clip(d['hag'][k], 0, 80); z = d['z'][k]; g = d['g'][k]
                np.maximum.at(chm, (iy, ix), hg)
                np.add.at(gs, (iy[g], ix[g]), z[g]); np.add.at(gn, (iy[g], ix[g]), 1)
                hb = np.clip(np.floor(hg), 0, NB - 1).astype(np.int64)
                np.add.at(prof, (np.minimum(iy // 2, h2 - 1), np.minimum(ix // 2, w2 - 1), hb), 1)
                npts += len(hg); log(key, int(ux), int(uy), len(hg), 'pts', npts)
        gnd = np.where(gn > 0, gs / np.maximum(gn, 1), np.nan).astype(np.float32)
        np.savez_compressed(f'{OUT}/trees_{key}.npz', chm=np.round(chm * 10).astype(np.uint16), gnd=gnd,
                            prof=np.minimum(prof, 255).astype(np.uint8), x0=gx0, y1=gy1, epsg=J['epsg'])
        # control points for the local UTM math check
        lo = np.linspace(b[0], b[2], 5); la = np.linspace(b[1], b[3], 5); LO, LA = np.meshgrid(lo, la); cx, cy = tf.transform(LO.ravel(), LA.ravel())
        SUM['courses'][key]['ctrl'] = [[float(a_), float(b_), float(c_), float(d_)] for a_, b_, c_, d_ in zip(LO.ravel(), LA.ravel(), cx, cy)]
        SUM['courses'][key]['points'] = npts; save(); log(key, 'saved', w, h)
    SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save()

if __name__ == '__main__':
    main()
