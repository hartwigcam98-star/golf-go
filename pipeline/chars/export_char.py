"""Mixamo-rigged character FBX -> compact runtime data for the golfer (mesh, skin, bind pose, one diffuse atlas).
The golf clips are retargeted onto it at runtime from the Boss clips, so only the body is stored here."""
import sys, os, re, io, json, base64, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from conv import Scene

b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
clean = lambda s: re.sub(r'^mixamorig\d*:', '', s.split('\x00')[0])


def export(path, cid, skip=(), atlas=2048, keep_alpha=(), alpha_from=None, blender=False, tpose=None, body='Human_x', cover_cm=2.5, hair_label=23, dbg=False, height_cm=None, knickers=False, hair_rim=None):
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
    # (Blender exports) bones can carry the armature's x100 unit scale: keep only rotation + position, as Mixamo bones have
    for k in range(len(order)):
        R = restW[k][:3, :3]; sc = np.linalg.norm(R, axis=0)
        if blender and np.abs(sc - 1).max() > 1e-3: restW[k] = restW[k].copy(); restW[k][:3, :3] = R / sc
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
            if blender and pn == 'DiffuseColor' and base in byname:   # (Blender exports) cut-out textures: alpha in the image itself
                try:
                    im0 = Image.open(io.BytesIO(byname[base]))
                    if im0.mode in ('RGBA', 'LA', 'P') and np.asarray(im0.convert('RGBA'))[..., 3].min() < 200: malpha[parr] = True
                except Exception: pass
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
            if blender and not any(malpha.get(m) and mdiff.get(m) == k for m in used): im.putalpha(255)
            if blender and any(w in k.lower() for w in ('polo', 'shirt', 'pants', 'trouser')):   # garments get tinted: keep the fold shading, drop stains and patches baked into the texture
                ar = np.asarray(im).astype(np.float64); rgb = ar[..., :3]; lum = rgb @ [.299, .587, .114]; med = np.median(rgb.reshape(-1, 3), 0); ml = float(med @ [.299, .587, .114]) or 1
                r = np.clip(lum / ml, .82, 1.12)[..., None]; ar[..., :3] = np.clip(med * r, 0, 255); im = Image.fromarray(ar.astype(np.uint8), 'RGBA')   # opaque garments stay opaque under the cut-out test
        A.paste(im, (cx * cell, cy * cell)); cellOf[k] = (cx, cy)
    # ---- mesh
    P = []; Nn = []; UV = []; SI = []; SW = []; IDX = []; AL = []; MID = []
    for g, o in geo.items():
        nm = N.get(geoModel.get(g), '')
        if any(s.lower() in nm.lower() for s in skip): continue
        vtx = o.find('Vertices')
        if vtx is None: continue
        V = np.array(vtx.props[0]).reshape(-1, 3)
        if blender:   # shape keys (MakeHuman's body and face settings) come as blend shapes: apply them at their weights
            for bsd, ps in S.parent.items():
                ob = S.obj.get(bsd)
                if ob is None or ob.name != 'Deformer' or ob.props[2] != 'BlendShape' or g not in ps: continue
                for chn, ps2 in S.parent.items():
                    oc = S.obj.get(chn)
                    if oc is None or oc.name != 'Deformer' or oc.props[2] != 'BlendShapeChannel' or bsd not in ps2: continue
                    pct = (oc.find('DeformPercent').props[0] if oc.find('DeformPercent') else 0) / 100
                    for shp, ps3 in S.parent.items():
                        osh = S.obj.get(shp)
                        if osh is None or osh.name != 'Geometry' or chn not in ps3: continue
                        ix = np.array(osh.find('Indexes').props[0]); dv = np.array(osh.find('Vertices').props[0]).reshape(-1, 3)
                        V[ix] += dv * pct
        # geometry to bind-world (Mixamo meshes sit at the origin; apply the model's own transform if any)
        cs = clusters.get(g, []); Rn = None
        if cs:
            b0, _, _, TL, TR = cs[0]; d = np.abs(TR @ TL - np.eye(4)).max()
            if blender and d > 1e-3:   # (Blender exports) the mesh carries its own transform: put it into bind-world like a Mixamo mesh
                M = TL @ TR; (print('  M', nm, np.round(M[:3, 3], 2), np.round(np.linalg.norm(M[:3, :3], axis=0), 3)) if dbg else None); V = (V @ M[:3, :3].T) + M[:3, 3]; Rn = np.linalg.inv(M[:3, :3]).T   # cluster Transform = inv(bone bind) x mesh
        if o.find('PolygonVertexIndex') is None: continue   # shape-key geometry (Blender exports)
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
            elif a < len(nor): nv = nor[a]
            else: nv = np.array([0., 1., 0.])
            if Rn is not None: nv = Rn @ nv; nv = nv / (np.linalg.norm(nv) or 1)
            u = uvs[uvi[k]]
            uu = ((u[0] % 1.0) + cx) / G; vv = 1 - ((1 - (u[1] % 1.0)) + cy) / G   # FBX v is up; atlas row cy counts down
            kk = (a, round(uu, 5), round(vv, 5), tuple(np.round(nv, 3)))
            if kk not in key:
                key[kk] = len(P); P.append(V[a]); Nn.append(nv); UV.append([uu, vv]); MID.append(nm)
                iw = sorted(inf[a], reverse=True)[:4]; tot = sum(w for w, _ in iw) or 1
                iw = iw + [(0, 0)] * (4 - len(iw)); SI.append([b for _, b in iw]); SW.append([w / tot for w, _ in iw])
                AL.append(1 if malpha.get(mat) else 0)
            poly.append(key[kk])
            if vi < 0:
                for j in range(1, len(poly) - 1): IDX += [poly[0], poly[j], poly[j + 1]]
                poly = []; pi += 1
    P = np.array(P, np.float32); Nn = np.array(Nn, np.float32); UV = np.array(UV, np.float32)
    SI = np.array(SI, np.uint8); SW = np.array(SW, np.float32)
    if blender:   # (Blender exports) the file's normals don't survive the trip: smooth normals from the geometry, shared across seams
        I3 = np.array(IDX, np.int64).reshape(-1, 3); fn = np.cross(P[I3[:, 1]] - P[I3[:, 0]], P[I3[:, 2]] - P[I3[:, 0]])
        key = np.round(P / 0.05).astype(np.int64); _, grp = np.unique(key, axis=0, return_inverse=True); grp = grp.reshape(-1)
        acc = np.zeros((grp.max() + 1, 3))
        for e in range(3): np.add.at(acc, grp[I3[:, e]], fn)
        Nn = acc[grp]; Nn = (Nn / np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-9)).astype(np.float32)
    if blender and body:   # skin under the clothes: drop body triangles lying just inside a garment (stops the skin poking through)
        from scipy.spatial import cKDTree
        MIDa = np.array(MID); isb = MIDa == body
        cl = np.array([not isb[i] and not any(w in MIDa[i].lower() for w in ('eye', 'brow', 'lash', 'teeth', 'tongue', 'hair', 'short0', 'long0', 'low-poly', 'high-poly')) for i in range(len(P))])
        if cl.any():
            T = cKDTree(P[cl]); dd, ii = T.query(P[isb]); ii = np.where(cl)[0][ii]; cov = np.zeros(len(P), bool); cov[np.where(isb)[0]] = r3_outward(P, Nn, isb, cl, dd, ii, cover_cm)
            I3 = np.array(IDX, np.int64).reshape(-1, 3); keep = ~(cov[I3[:, 0]] & cov[I3[:, 1]] & cov[I3[:, 2]])
            print('  covered body triangles dropped', int((~keep).sum()))
            IDX = I3[keep].reshape(-1).tolist()
    if blender:   # trousers' waistband under the shirt: drop it too (it shows through a loose polo)
        MIDa = np.array(MID)
        for outer, inner in ((('shirt', 'polo'), ('pants', 'trouser')), (('pants', 'trouser'), ('shoe',))):   # shirt over trousers, trouser legs over shoe tops
          sh = np.array([any(w in m.lower() for w in outer) for m in MIDa]); pa = np.array([any(w in m.lower() for w in inner) for m in MIDa])
          if sh.any() and pa.any():
              from scipy.spatial import cKDTree
              Ts = cKDTree(P[sh][:, [0, 2]]); ys = P[sh][:, 1]; cov = np.zeros(len(P), bool)
              for i in np.where(pa)[0]:   # the shirt hangs over this point: some shirt vertex beside it (4 cm across) reaches lower
                  nb = Ts.query_ball_point(P[i, [0, 2]], 4.0)
                  if nb and ys[nb].min() < P[i, 1] - 1.0: cov[i] = True
              I3 = np.array(IDX, np.int64).reshape(-1, 3); keep = ~(cov[I3[:, 0]] & cov[I3[:, 1]] & cov[I3[:, 2]])
              print('  covered trouser triangles dropped', int((~keep).sum())); IDX = I3[keep].reshape(-1).tolist()
    if tpose:   # re-bind in the Mixamo T-pose of a reference body, so the shared clips (retargeted by rest pose) fit
        P, Nn, restW = rebind_tpose(P, Nn, SI, SW, restW, par, [N[b] for b in order], tpose)
        inv = np.array([np.linalg.inv(restW[k]) for k in range(len(order))], np.float32)
        Lt = np.array([((np.linalg.inv(restW[par[k]]) if par[k] >= 0 else np.eye(4)) @ restW[k])[:3, 3] for k in range(len(order))], np.float32)
    if height_cm:   # stand him at a chosen height (top of head, rest pose)
        sk = height_cm / float(P[:, 1].max() - P[:, 1].min()); P = P * sk
        restW = [np.array(m, np.float64) for m in restW]
        for m in restW: m[:3, 3] *= sk
        inv = np.array([np.linalg.inv(restW[k]) for k in range(len(order))], np.float32)
        Lt = np.array([((np.linalg.inv(restW[par[k]]) if par[k] >= 0 else np.eye(4)) @ restW[k])[:3, 3] for k in range(len(order))], np.float32)
        print('  scaled to', height_cm, 'cm (x', round(sk, 3), ')')
    IDX = np.array(IDX, np.uint16 if len(P) < 65536 else np.uint32)
    lo, hi = P.min(0), P.max(0)
    print(cid, 'bones', len(order), 'verts', len(P), 'tris', len(IDX) // 3, 'height', round(float(hi[1] - lo[1]), 1), 'atlas', G, 'x', G, 'cells', keys)
    Pq = np.round((P - lo) / (hi - lo) * 65535).astype(np.uint16)
    Nq = np.round(Nn / np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-6) * 127).astype(np.int8)
    UVq = np.round(np.clip(UV, 0, 1) * 65535).astype(np.uint16)
    SWq = np.round(SW * 255).astype(np.uint8); SWq[:, 0] += (255 - SWq.sum(1)).astype(np.uint8)
    PT = np.zeros(len(P), np.uint8)           # part 0 everywhere: no outfit tinting, torso found by skin weights
    pmean = None
    if blender:   # outfit labels from the garment each vertex came from, so a legend's colours can be laid on (0 shirt, 9 trousers, 20 shoes, 23 hair, 3 the rest)
        def lab(m):
            m = m.lower()
            if 'shirt' in m or 'polo' in m: return 0
            if 'pants' in m or 'trouser' in m or 'jeans' in m: return 9
            if 'shoe' in m or 'boot' in m: return 20
            if any(h in m for h in ('short0', 'long0', 'hair', 'afro', 'bob0')): return hair_label
            return 3
        PT = np.array([lab(m) for m in MID], np.uint8)
        if hair_rim:   # hat wearers: hide only the hair the hat covers, keep what shows below the brim at the sides and back
            nm_ = [N[b] for b in order]; hk = nm_.index('Head'); MIDa = np.array(MID)
            hv = (MIDa == body) & (SI[:, 0] == hk) & (SW[:, 0] > .7)
            if hv.any():
                mn, mx = P[hv, 1].min(), P[hv, 1].max(); rim = mn + (mx - mn) * hair_rim
                PT[(PT == 22) & (P[:, 1] < rim - .5)] = 23
        if knickers:   # plus-fours: below the knee the trouser leg becomes the (argyle) stocking
            names_ = [N[b] for b in order]; ky = min(restW[names_.index(n)][1, 3] for n in ('LeftLeg', 'RightLeg') if n in names_)
            PT[(PT == 9) & (P[:, 1] < ky - 3)] = 21
        Aa = np.asarray(A.convert('RGB')).astype(np.float64) / 255; Wd = Aa.shape[0]
        px = Aa[np.clip(((1 - UV[:, 1]) * Wd).astype(int), 0, Wd - 1), np.clip((UV[:, 0] * Wd).astype(int), 0, Wd - 1)]
        pmean = [[.5, .5, .5]] * 26
        for k in set(PT.tolist()):
            sel = PT == k
            if sel.any(): pmean[k] = [round(float(x), 3) for x in px[sel].mean(0)]
    hasAlpha = any(malpha.get(m) for m in used)
    if not hasAlpha:
        A = A.convert('RGB').convert('RGBA')
    buf = io.BytesIO(); A.save(buf, 'WEBP', quality=84, method=6, alpha_quality=85)
    out = dict(id=cid, names=[N[b] for b in order], parent=par, lt=b64(Lt), inv=b64(inv),
               mesh=dict(n=len(P), lo=lo.tolist(), hi=hi.tolist(), p=b64(Pq), nr=b64(Nq), uv=b64(UVq), si=b64(SI), sw=b64(SWq), pt=b64(PT), idx=b64(IDX), i32=bool(IDX.dtype == np.uint32)),
               **({'pmean': pmean} if pmean else {}), alpha=hasAlpha, tex=dict(d='data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()))
    js = 'R3CHAR(' + json.dumps(out, separators=(',', ':')) + ');\n'
    return js, out


def r3_outward(P, Nn, inner, outer, dd, ii, near):
    """An inner-layer vertex counts as covered when a garment vertex is very close, or within 4.5 cm and lying outward along its normal."""
    pi = np.where(inner)[0]; v = P[ii] - P[pi]; d = np.maximum(dd, 1e-6)[:, None]
    out = (Nn[pi] * (v / d)).sum(1)
    return (dd < near) | ((dd < 4.5) & (out > .45))


PREF = {'LeftHand': 'LeftHandMiddle1', 'RightHand': 'RightHandMiddle1', 'Spine2': 'Neck', 'LeftFoot': 'LeftToeBase', 'RightFoot': 'RightToeBase'}


def rebind_tpose(P, Nn, SI, SW, restW, par, names, ref_js):
    """Pose the skeleton so every bone points the way the reference (Mixamo) body's bone does at rest, skin the mesh into
    that pose (linear blend), and return it as the new bind pose."""
    D = json.loads(open(ref_js).read().strip()[len('R3CHAR('):-2])
    rinv = np.frombuffer(base64.b64decode(D['inv']), np.float32).reshape(-1, 4, 4)
    rW = {n: np.linalg.inv(rinv[i].T.astype(np.float64)) if False else np.linalg.inv(rinv[i].astype(np.float64)) for i, n in enumerate(D['names'])}
    # stored inv may be column-major (three.js): pick the layout whose translation looks like a position
    if abs(rW['Hips'][3, :3]).max() > abs(rW['Hips'][:3, 3]).max():
        rW = {n: np.linalg.inv(rinv[i].T.astype(np.float64)) for i, n in enumerate(D['names'])}
    nb = len(names); idx = {n: i for i, n in enumerate(names)}
    kids = [[j for j in range(nb) if par[j] == k] for k in range(nb)]
    def sub(k):
        out = [k]
        for c in kids[k]: out += sub(c)
        return out
    cur = [np.array(m, np.float64) for m in restW]
    def rot_between(a, b):
        a = a / np.linalg.norm(a); b = b / np.linalg.norm(b); v = np.cross(a, b); c = float(np.dot(a, b))
        if np.linalg.norm(v) < 1e-8: return np.eye(3)
        vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
        return np.eye(3) + vx + vx @ vx * (1 / (1 + c))
    for k in range(nb):
        n = names[k]
        if n in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head') or n not in rW: continue   # limbs only: keep his own posture
        ch = PREF.get(n) or next((names[c] for c in kids[k] if names[c] in rW), None)
        if not ch or ch not in idx or ch not in rW: continue
        dc = cur[idx[ch]][:3, 3] - cur[k][:3, 3]; dr = rW[ch][:3, 3] - rW[n][:3, 3]
        if np.linalg.norm(dc) < 1e-6 or np.linalg.norm(dr) < 1e-6: continue
        R = rot_between(dc, dr); p0 = cur[k][:3, 3].copy()
        for j in sub(k):
            cur[j][:3, :3] = R @ cur[j][:3, :3]; cur[j][:3, 3] = p0 + R @ (cur[j][:3, 3] - p0)
    Sk = np.array([cur[k] @ np.linalg.inv(restW[k]) for k in range(nb)])
    P2 = np.zeros_like(P, dtype=np.float64); N2 = np.zeros_like(Nn, dtype=np.float64)
    for e in range(4):
        w = SW[:, e:e + 1]; M = Sk[SI[:, e]]
        P2 += w * (np.einsum('nij,nj->ni', M[:, :3, :3], P) + M[:, :3, 3]); N2 += w * np.einsum('nij,nj->ni', M[:, :3, :3], Nn)
    N2 /= np.maximum(np.linalg.norm(N2, axis=1, keepdims=True), 1e-6)
    return P2.astype(np.float32), N2.astype(np.float32), cur


if __name__ == '__main__':
    f, cid = sys.argv[1], sys.argv[2]
    skip = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] else []
    js, out = export(f, cid, skip)
    open('char_%s.js' % cid, 'w').write(js)
    print('wrote', len(js) // 1024, 'KB')

