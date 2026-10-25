"""sheet.py <shots dir> <key,key,...> <out.jpg> : the three candidate views (c0 c1 c2) of each course side by side, labelled"""
import os, sys
from PIL import Image, ImageDraw
d, ids, out = sys.argv[1], sys.argv[2].split(','), sys.argv[3]
W, H = 760, 900; y0 = int(H * .12); h = int(W * 440 / 640); s = .42
im = Image.new('RGB', (int(W * 3 * s), int(h * s * len(ids))), 'black'); dr = ImageDraw.Draw(im)
for k, c in enumerate(ids):
    for j in range(3):
        f = '%s/%s_c%d.png' % (d, c, j); x, y = int(j * W * s), int(k * h * s)
        if os.path.exists(f): im.paste(Image.open(f).convert('RGB').crop((0, y0, W, y0 + h)).resize((int(W * s), int(h * s))), (x, y))
        dr.rectangle([x, y, x + 130, y + 16], fill='black'); dr.text((x + 3, y + 3), '%s c%d' % (c, j), fill='yellow')
im.save(out, quality=82); print(out)
