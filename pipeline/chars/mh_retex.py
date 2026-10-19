"""Sharper faces for the MakeHuman golfers (Oct 2026): rebuilds the texture atlas of a char_mh_<name>.js in place.

export_char.py packs every material into equal cells of one 2048 atlas, so a MakeHuman body's skin (the whole body, face
included) got a 512 px cell while six cells sat empty. This keeps the mesh, rig and labels exactly as they are and only
re-lays the atlas:
  - the skin moves to a 1024 px block (top-left), re-read at that size from the original export (mh-data branch: mh_<name>.fbx),
    with the paint already on the old cell (scalp, brows, stubble) carried over, minus its soft tail onto the forehead
  - the cells the skin block now covers move to empty cells
  - the eyes: a darker, less red iris and a cleaner white (MakeHuman's brown eye reads red at this size)
and rewrites the UVs and the per-part colour means (pmean) to match.

usage: python pipeline/chars/mh_retex.py char_mh_rory.js path/to/mh_rory.fbx   (rewrites the .js)"""
import sys, os, io, re, json, base64, colorsys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from conv import Scene

G = 4                                  # the old atlas: 4 x 4 cells of 512
SKIN = (0, 0)                          # the skin cell in every MakeHuman export (the body is the first material)
SKIN_BLOCK = [(0, 0), (1, 0), (0, 1), (1, 1)]


def fbx_images(path):
    S = Scene(path); out = {}
    for v in S.obj.values():
        if v.name != 'Video': continue
        c = v.find('Content'); fn = v.find('RelativeFilename') or v.find('FileName')
        if c and c.props and isinstance(c.props[0], bytes) and len(c.props[0]) > 0 and fn:
            out[os.path.basename(str(fn.props[0]).replace('\\', '/'))] = Image.open(io.BytesIO(c.props[0]))
    return out


def cell_img(A, cx, cy, n=512):
    return A.crop((cx * n, cy * n, (cx + 1) * n, (cy + 1) * n))


def is_empty(im):
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    return np.abs(a - 128).mean() < 3 and a.std() < 4   # the exporter's grey fill (webp leaves it a touch off 128)


def fix_eye(im):
    """MakeHuman's brown iris is a saturated red-brown: turn it a darker, cooler brown and calm the veins in the white."""
    a = np.asarray(im.convert('RGBA')).astype(np.float64) / 255; rgb = a[..., :3]
    mx = rgb.max(-1); mn = rgb.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-6)
    lum = rgb @ [.299, .587, .114]
    iris = np.clip((sat - .3) / .2, 0, 1) * (lum < .6)
    brown = np.stack([lum * 1.05 + .02, lum * .78 + .01, lum * .55], -1)   # warm brown at the iris's own brightness
    rgb = rgb * (1 - iris[..., None] * .85) + brown * (iris[..., None] * .85)
    white = np.clip((lum - .55) / .2, 0, 1) * (1 - iris)                    # the sclera: pull the pink veins toward a soft white
    rgb = rgb * (1 - white[..., None] * .6) + np.array([.93, .91, .89]) * (white[..., None] * .6)
    a[..., :3] = np.clip(rgb, 0, 1)
    return Image.fromarray((a * 255).round().astype(np.uint8), 'RGBA')


def retex(js_path, fbx_path, dbg=None):
    src = open(js_path).read().strip(); assert src.startswith('R3CHAR(') and src.endswith(');')
    D = json.loads(src[len('R3CHAR('):-2])
    A = Image.open(io.BytesIO(base64.b64decode(D['tex']['d'].split(',', 1)[1]))).convert('RGBA'); W = A.size[0]; n = W // G
    assert W == 2048, W
    imgs = fbx_images(fbx_path)
    old_skin = cell_img(A, *SKIN, n).convert('RGB')
    # which source image is the skin: the one that looks most like the old skin cell (paint aside)
    def norm(x): x = x - x.mean((0, 1)); return x / (x.std((0, 1)) + 1e-6)
    o64 = norm(np.asarray(old_skin.resize((64, 64), Image.BOX)).astype(float))
    best, bk = 1e9, None
    for k, im in imgs.items():   # by layout, not colour: some bodies' skin was re-toned after export
        if im.size[0] < 1024 or im.mode == 'RGBA' and np.asarray(im)[..., 3].min() < 200 or k.upper().endswith(('_NRM.PNG', 'NORM.PNG')): continue
        d = np.abs(norm(np.asarray(im.convert('RGB').resize((64, 64), Image.BOX)).astype(float)) - o64).mean()
        if d < best: best, bk = d, k
    print(os.path.basename(js_path), 'skin', bk, 'layout diff', round(best, 2))
    assert best < .6, 'no source image matches the skin cell'
    skin_src = imgs[bk].convert('RGB')
    # the paint on the old cell, as a per-pixel colour change, carried over at the new size
    base512 = np.asarray(skin_src.resize((n, n), Image.LANCZOS)).astype(np.float64)
    old = np.asarray(old_skin).astype(np.float64)
    # the old cell's overall tone (a body re-toned after export): a per-channel gain and offset, fitted where the two agree best
    gain, off = np.ones(3), np.zeros(3)
    for c in (range(3) if np.abs(base512 - old).mean() > 20 else ()):
        x, y = base512[..., c].ravel(), old[..., c].ravel()
        for _ in range(3):
            A_ = np.vstack([x, np.ones_like(x)]).T; g_, o_ = np.linalg.lstsq(A_, y, rcond=None)[0]
            res = np.abs(y - (g_ * x + o_)); sel = res < np.percentile(res, 60); x, y = x[sel], y[sel]
        gain[c], off[c] = g_, o_
    print('  tone gain', np.round(gain, 2), 'offset', np.round(off, 1))
    base512 = np.clip(base512 * gain + off, 0, 255)
    delta = old - base512
    amt = np.abs(delta).mean(-1)
    keep = np.clip((amt - 14) / 12, 0, 1)                 # small differences (resampling, the exporter's colour shifts) are not paint; the soft tail fades out
    keep = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float64) / 255
    big = 2 * n
    base1024 = np.clip(np.asarray(skin_src.resize((big, big), Image.LANCZOS)).astype(np.float64) * gain + off, 0, 255)
    oldU = np.asarray(old_skin.resize((big, big), Image.BICUBIC)).astype(np.float64)   # painted texels keep the old colour as is (a colour difference laid on the new skin turns red at the hairline)
    kU = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).resize((big, big), Image.BICUBIC)).astype(np.float64)[..., None] / 255
    new_skin = Image.fromarray(np.clip(base1024 * (1 - kU) + oldU * kU, 0, 255).round().astype(np.uint8), 'RGB').convert('RGBA')
    # cells: the skin block's three other cells move to empty ones
    empty = [(cx, cy) for cy in range(G) for cx in range(G) if (cx, cy) not in SKIN_BLOCK and is_empty(cell_img(A, cx, cy, n))]
    move = {}
    for c in SKIN_BLOCK[1:]:
        if is_empty(cell_img(A, *c, n)): continue
        assert empty, 'no room in the atlas'
        move[c] = empty.pop(0)
    B = Image.new('RGBA', (W, W), (128, 128, 128, 255))
    for cy in range(G):
        for cx in range(G):
            if (cx, cy) in SKIN_BLOCK: continue
            B.paste(cell_img(A, cx, cy, n), (cx * n, cy * n))
    for (cx, cy), (nx, ny) in move.items(): B.paste(cell_img(A, cx, cy, n), (nx * n, ny * n))
    B.paste(new_skin, (0, 0))
    # eyes: the cell the eye vertices sample (found from the mesh below)
    uv = np.frombuffer(base64.b64decode(D['mesh']['uv']), np.uint16).reshape(-1, 2).astype(np.float64) / 65535
    idx = np.frombuffer(base64.b64decode(D['mesh']['idx']), np.uint32 if D['mesh'].get('i32') else np.uint16).reshape(-1, 3)
    cen = uv[idx].mean(1)                                 # triangle centres decide each vertex's cell (edge texels belong to their triangle)
    tcx = np.clip((cen[:, 0] * G).astype(int), 0, G - 1); tcy = np.clip(((1 - cen[:, 1]) * G).astype(int), 0, G - 1)
    vcx = np.full(len(uv), -1); vcy = np.full(len(uv), -1)
    for e in range(3): vcx[idx[:, e]] = tcx; vcy[idx[:, e]] = tcy
    # the eye cell: brown_eye-like image (a round iris) — the cell whose old image best matches the source eye texture
    eyek = next((k for k in imgs if 'eye' in k.lower() and 'eyebrow' not in k.lower() and 'lash' not in k.lower()), None)
    if eyek:
        e64 = np.asarray(imgs[eyek].convert('RGB').resize((64, 64), Image.BOX)).astype(float); be, ec = 1e9, None
        for cy in range(G):
            for cx in range(G):
                if (cx, cy) in SKIN_BLOCK and (cx, cy) not in move: continue
                d = np.abs(np.asarray(cell_img(A, cx, cy, n).convert('RGB').resize((64, 64), Image.BOX)).astype(float) - e64).mean()
                if d < be: be, ec = d, (cx, cy)
        ec2 = move.get(ec, ec); B.paste(fix_eye(cell_img(B, *ec2, n)), (ec2[0] * n, ec2[1] * n)); print('  eyes', eyek, 'cell', ec, '->', ec2, 'diff', round(be, 1))
    # UVs
    u2 = uv.copy()
    for i in range(len(uv)):
        c = (int(vcx[i]), int(vcy[i]))
        if c == SKIN:
            u2[i, 0] = uv[i, 0] * 2; u2[i, 1] = 1 - (1 - uv[i, 1]) * 2
        elif c in move:
            nx, ny = move[c]; u2[i, 0] = uv[i, 0] + (nx - c[0]) / G; u2[i, 1] = uv[i, 1] - (ny - c[1]) / G
    D['mesh']['uv'] = base64.b64encode(np.round(np.clip(u2, 0, 1) * 65535).astype(np.uint16).tobytes()).decode()
    # colour means per outfit part, as the exporter computes them
    if D.get('pmean'):
        pt = np.frombuffer(base64.b64decode(D['mesh']['pt']), np.uint8)
        Aa = np.asarray(B.convert('RGB')).astype(np.float64) / 255
        px = Aa[np.clip(((1 - u2[:, 1]) * W).astype(int), 0, W - 1), np.clip((u2[:, 0] * W).astype(int), 0, W - 1)]
        for k in set(pt.tolist()):
            sel = pt == k
            if sel.any(): D['pmean'][k] = [round(float(x), 3) for x in px[sel].mean(0)]
    if not D.get('alpha'): B = B.convert('RGB').convert('RGBA')
    buf = io.BytesIO(); B.save(buf, 'WEBP', quality=84, method=6, alpha_quality=85)
    D['tex']['d'] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    if dbg: B.convert('RGB').resize((1024, 1024)).save(dbg)
    open(js_path, 'w').write('R3CHAR(' + json.dumps(D, separators=(',', ':')) + ');\n')
    print('  moved', move, 'atlas', len(buf.getvalue()) // 1024, 'KB')


if __name__ == '__main__':
    retex(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
