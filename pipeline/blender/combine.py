"""raw_sun.npz + raw_sky.npz (Blender image rows, row 0 = bottom = max z) -> light.png (row 0 = min z) + previews"""
import sys, math, numpy as np
from PIL import Image
sun = np.load(sys.argv[1])['sun']; sky = np.load(sys.argv[2])['sky']; out = sys.argv[3]
def blur(a, s):
    r = int(math.ceil(s * 3)); k = np.exp(-(np.arange(-r, r + 1) ** 2) / (2 * s * s)); k /= k.sum()
    p = np.pad(a, r, mode='edge'); a = sum(k[i] * p[i:i + a.shape[0], r:r + a.shape[1]] for i in range(2 * r + 1))
    p = np.pad(a, r, mode='edge'); return sum(k[i] * p[r:r + a.shape[0], i:i + a.shape[1]] for i in range(2 * r + 1))
S = np.clip(blur(sun, .8), 0, 1)
ref = float(np.percentile(sky, 97)); K = np.clip(blur(sky, 2.0) / max(ref, 1e-3), 0, 1)
print('sun mean %.3f  sky mean %.3f ref %.3f' % (S.mean(), K.mean(), ref))
img = np.zeros(S.shape + (3,), np.uint8); img[..., 0] = np.round(S * 255); img[..., 1] = np.round(K * 255)
Image.fromarray(np.flipud(img)).save(out + '/light.webp', 'WEBP', quality=88, method=6)   # ~1/7 of the PNG, error ~1/255
for n, a in (('sun', S), ('sky', K)): Image.fromarray(np.flipud(np.round(a * 255).astype(np.uint8))).save(out + '/prev_%s.png' % n)
