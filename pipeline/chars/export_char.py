"""Mixamo-rigged character FBX -> compact runtime data for the golfer (mesh, skin, bind pose, one diffuse atlas).
The golf clips are retargeted onto it at runtime from the Boss clips, so only the body is stored here."""
import sys, os, re, io, json, base64, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from conv import Scene

b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
clean = lambda s: re.sub(r'^mixamorig\d*:', '', s.split('\x00')[0])


def export(path, cid, skip=(), atlas=2048, keep_alpha=(), alpha_from=None):
    S = Scene(path)
    N = {i: clean(o.props[1]) for i, o in S.models.items()}
    bones = [i for i in S.models if S.models[i].props[2] == 'LimbNode']
    order, seen = [], set()

    def visit(i):
        if i in seen: return
        p = S.mparent(i)
        if p in bones: visit(p)
        seen.add(i); order.append(i)
    for i in bones: visit(i)
    bidx = {b: k for k, b in enumerate(order)}
    par = [bidx.get(S.mparent(b), -1) for b in order]
    geo = {i: o for i, o in S.obj.items() if o.name == 'Geometry'}
    geoModel = {}
    for ch, ps in S.parent.items():
        if ch in geo:
            for p in ps:
                if p in S.models: geoModel[ch] = p
    # skin clusters
    skinOf, clusters = {}, {}
    for ch, ps in S.parent.items():
        o = S.obj.get(ch)
        if o is None: continue
        for p in ps:
            if o.name == 'Deformer' and o.props[2] == 'Skin' and p in geo: skinOf[ch] = p
    for ch, ps in S.parent.items():
        o = S.obj.get(ch)
        if o is None or o.name != 'Deformer' or o.props[2] != 'Cluster': continue
        sk = [p for p in ps if p in skinOf]
        bone = [b for b, pp in S.parent.items() if ch in pp and b in bidx]
        if not sk or not bone: continue
        g = skinOf[sk[0]]; ix = o.find('Indexes'); wt = o.find('Weights')
        TL = np.array(o.find('TransformLink').props[0]).reshape(4, 4).T
        TR = np.array(o.find('Transform').props[0]).reshape(4, 4).T
        clusters.setdefault(g, []).append((bidx[bone[0]], ix.props[0] if ix else [], wt.props[0] if wt else [], TL, TR))
    bindW = {}
    meshXf = {}
    for g, cs in clusters.items():
        for b, ix, wt, TL, TR in cs:
            bindW.setdefault(b, TL)
            meshXf[g] = np.linalg.inv(TR @ np.linalg.inv(TL)) if False else (TL @ TR)   # mesh-to-world at bind
    from conv import sample
    W0 = sample(S, {}, 0)
    restW = [bindW.get(k, None) for k in range(len(order))]
    # bones without clusters: from their parent's bind and the local rest offset
    for k, b in enumerate(order):
        if restW[k] is None:
            p = par[k]
            L = np.linalg.inv(W0[order[p]]) @ W0[b] if p >= 0 else W0[b]
            restW[k] = (restW[p] @ L) if p >= 0 else W0[b]
    inv = np.array([np.linalg.inv(restW[k]) for k in range(len(order))], np.float32)
    Lt = []
    for k, b in enumerate(order):
        p = par[k]; Lm = (np.linalg.inv(restW[p]) if p >= 0 else np.eye(4)) @ restW[k]; Lt.append(Lm[:3, 3])
    Lt = np.array(Lt, np.float32)
    # ---- materials and their diffuse images (shared videos are looked up by file name)
    mats = {i: o for i, o in S.obj.items() if o.name == 'Material'}
    texs = {i: o for i, o in S.obj.items() if o.name == 'Texture'}
    vids = {i: o for i, o in S.obj.items() if o.name == 'Video'}
    byname = {}
    for v in vids.values():
        c = v.find('Content'); fn = v.find('RelativeFilename') or v.find('FileName')
        if c and c.props and isinstance(c.props[0], bytes) and len(c.props[0]) > 0 and fn:
            byname[os.path.basename(str(fn.props[0]).replace('\\', '/'))] = c.props[0]
    mdiff, malpha = {}, {}
    for ch, parr, pn in S.opc:
        if ch in texs and parr in mats:
            fn = texs[ch].find('RelativeFilename') or texs[ch].find('FileName')
            base = os.path.basename(str(fn.props[0]).replace('\\', '/')) if fn else ''
            if pn == 'DiffuseColor' and base in byname: mdiff[parr] = base
            if pn == 'TransparentColor': malpha[parr] = True
    mcol = {}
    for i, o in mats.items():
        P = {}
        p70 = o.find('Properties70')
        if p70:
            for c in p70.ch: P[c.props[0]] = c.props[4:]
        mcol[i] = P.get('DiffuseColor', P.get('Diffuse', [.6, .6, .6]))[:3]
    # materials per model in connection order
    modelMats = {}
    for ch, ps in S.parent.items():
        if ch in mats:
            for p in ps:
                if p in S.models: modelMats.setdefault(p, []).append(ch)
    # keep model order of material connections as listed in the file
    conn = [c for c in S.root.find('Connections').ch if c.props[0] == 'OO']
    for m in modelMats:
        modelMats[m] = [c.props[1] for c in conn if c.props[2] == m and c.props[1] in mats]
    used = []
    for g in geo:
        nm = N.get(geoModel.get(g), '')
        if any(s.lower() in nm.lower() for s in skip): continue
        for m in modelMats.get(geoModel.get(g), []):
            if m not in used: used.append(m)
    # atlas cells: one per distinct diffuse image (materials without an image get a flat colour cell)
    keys = []
    for m in used:
        k = mdiff.get(m) or ('col', tuple(round(float(x), 3) for x in mcol[m]))
        if k not in keys: keys.append(k)
    G = max(1, math.ceil(math.sqrt(len(keys)))); cell = atlas // G
    A = Image.new('RGBA', (atlas, atlas), (128, 128, 128, 255))
    cellOf = {}
    for n, k in enumerate(keys):
        cx, cy = n % G, n // G
        if isinstance(k, tuple):
            im = Image.new('RGBA', (cell, cell), tuple(int(255 * min(1, x ** (1 / 2.2))) for x in k[1]) + (255,))
        else:
            im = Image.open(io.BytesIO(byname[k])).convert('RGBA').resize((cell, cell), Image.LANCZOS)
        A.paste(im, (cx * cell, cy * cell)); cellOf[k] = (cx, cy)
    # ---- mesh
    P = []; Nn = []; UV = []; SI = []; SW = []; IDX = []; AL = []
    for g, o in geo.items():
        nm = N.get(geoModel.get(g), '')
        if any(s.lower() in nm.lower() for s in skip): continue
        vtx = o.find('Vertices')
        if vtx is None: continue
        V = np.array(vtx.props[0]).reshape(-1, 3)
        # geometry to bind-world (Mixamo meshes sit at the origin; apply the model's own transform if any)
        cs = clusters.get(g, [])
        if cs:
            b0, _, _, TL, TR = cs[0]; d = np.abs(TR @ TL - np.eye(4)).max()
            if d > 1e-3: print('  note: mesh', nm, 'bind transform differs from identity by', round(float(d), 4))
        pvi = o.find('PolygonVertexIndex').props[0]
        ln = o.find('LayerElementNormal'); nor = np.array(ln.find('Normals').props[0]).reshape(-1, 3)
        nmap = ln.find('MappingInformationType').props[0]; nref = ln.find('ReferenceInformationType').props[0]
        nidx = ln.find('NormalsIndex').props[0] if ln.find('NormalsIndex') else None
        lu = o.find('LayerElementUV'); uvs = np.array(lu.find('UV').props[0]).reshape(-1, 2); uvi = lu.find('UVIndex').props[0]
        lm = o.find('LayerElementMaterial'); mlist = lm.find('Materials').props[0] if lm else [0]
        mm = lm.find('MappingInformationType').props[0] if lm else 'AllSame'
        gm = modelMats.get(geoModel.get(g), [])
        inf = [[] for _ in range(len(V))]
        for b, ix, wt, TL, TR in clusters.get(g, []):
            for a, w in zip(ix, wt): inf[a].append((w, b))
        key = {}; poly = []; pk = []; pi = 0
        for k, vi in enumerate(pvi):
            a = vi if vi >= 0 else ~vi
            mi = mlist[0] if mm == 'AllSame' else mlist[pi]
            mat = gm[mi] if mi < len(gm) else gm[0]
            ck = mdiff.get(mat) or ('col', tuple(round(float(x), 3) for x in mcol[mat]))
            cx, cy = cellOf[ck]
            if nmap == 'ByPolygonVertex': nv = nor[nidx[k] if nref == 'IndexToDirect' else k]
            else: nv = nor[a]
            u = uvs[uvi[k]]
            uu = ((u[0] % 1.0) + cx) / G; vv = 1 - ((1 - (u[1] % 1.0)) + cy) / G   # FBX v is up; atlas row cy counts down
            kk = (a, round(uu, 5), round(vv, 5), tuple(np.round(nv, 3)))
            if kk not in key:
                key[kk] = len(P); P.append(V[a]); Nn.append(nv); UV.append([uu, vv])
                iw = sorted(inf[a], reverse=True)[:4]; tot = sum(w for w, _ in iw) or 1
                iw = iw + [(0, 0)] * (4 - len(iw)); SI.append([b for _, b in iw]); SW.append([w / tot for w, _ in iw])
                AL.append(1 if malpha.get(mat) else 0)
            poly.append(key[kk])
            if vi < 0:
                for j in range(1, len(poly) - 1): IDX += [poly[0], poly[j], poly[j + 1]]
                poly = []; pi += 1
    P = np.array(P, np.float32); Nn = np.array(Nn, np.float32); UV = np.array(UV, np.float32)
    SI = np.array(SI, np.uint8); SW = np.array(SW, np.float32)
    IDX = np.array(IDX, np.uint16 if len(P) < 65536 else np.uint32)
    lo, hi = P.min(0), P.max(0)
    print(cid, 'bones', len(order), 'verts', len(P), 'tris', len(IDX) // 3, 'height', round(float(hi[1] - lo[1]), 1), 'atlas', G, 'x', G, 'cells', keys)
    Pq = np.round((P - lo) / (hi - lo) * 65535).astype(np.uint16)
    Nq = np.round(Nn / np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-6) * 127).astype(np.int8)
    UVq = np.round(np.clip(UV, 0, 1) * 65535).astype(np.uint16)
    SWq = np.round(SW * 255).astype(np.uint8); SWq[:, 0] += (255 - SWq.sum(1)).astype(np.uint8)
    PT = np.zeros(len(P), np.uint8)           # part 0 everywhere: no outfit tinting, torso found by skin weights
    hasAlpha = any(malpha.get(m) for m in used)
    if not hasAlpha:
        A = A.convert('RGB').convert('RGBA')
    buf = io.BytesIO(); A.save(buf, 'WEBP', quality=84, method=6, alpha_quality=85)
    out = dict(id=cid, names=[N[b] for b in order], parent=par, lt=b64(Lt), inv=b64(inv),
               mesh=dict(n=len(P), lo=lo.tolist(), hi=hi.tolist(), p=b64(Pq), nr=b64(Nq), uv=b64(UVq), si=b64(SI), sw=b64(SWq), pt=b64(PT), idx=b64(IDX), i32=bool(IDX.dtype == np.uint32)),
               alpha=hasAlpha, tex=dict(d='data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()))
    js = 'R3CHAR(' + json.dumps(out, separators=(',', ':')) + ');\n'
    return js, out


if __name__ == '__main__':
    f, cid = sys.argv[1], sys.argv[2]
    skip = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] else []
    js, out = export(f, cid, skip)
    open('char_%s.js' % cid, 'w').write(js)
    print('wrote', len(js) // 1024, 'KB')

