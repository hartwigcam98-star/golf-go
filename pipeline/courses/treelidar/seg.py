"""Individual trees from the lidar canopy: treetops (variable-window local maxima), crowns (watershed), height, crown radius,
crown base (from the vertical return profile), matched to the photo trees. -> seg_troy.npz"""
from common import *
import cv2
from scipy import ndimage as ndi
from skimage.segmentation import watershed
from skimage.feature import peak_local_max
REG = (0.62, 1.0)          # lidar -> course map (pipeline/courses/lidar2/regshift.json)
chm = D['chm'] / 10.; prof = D['prof'].astype(np.float32); H, W = chm.shape
# leaf-off crowns have holes between branches: close them, then smooth a little
c2 = ndi.grey_closing(chm, size=3)
cs = ndi.gaussian_filter(c2, 1.0)
# variable window: a peak must be the highest point within r(h) = 0.5 * (2.5 + 0.009 h^2) metres (Popescu & Wynne)
pk = peak_local_max(cs, min_distance=2, threshold_abs=3.0, exclude_border=False)
hp = cs[pk[:, 0], pk[:, 1]]; rad = 0.5 * (2.5 + 0.009 * hp ** 2)
order = np.argsort(-hp); keep = np.ones(len(pk), bool)
from scipy.spatial import cKDTree
kd = cKDTree(pk.astype(float))
for i in order:
    if not keep[i]: continue
    for j in kd.query_ball_point(pk[i].astype(float), rad[i]):
        if j != i and keep[j] and hp[j] <= hp[i]: keep[j] = False
pk = pk[keep]; hp = hp[keep]
print('treetops', len(pk), 'height pct', np.percentile(hp, [10, 50, 90]).round(1))
mk = np.zeros((H, W), np.int32); mk[pk[:, 0], pk[:, 1]] = np.arange(1, len(pk) + 1)
mask = cs > 2.0
lab = watershed(-cs, mk, mask=mask)
# a crown keeps only the cells within 1.6 x the window-derived max radius of its top and above 35% of its top height
n = len(pk); yy, xx = np.indices((H, W))
L = lab.ravel(); ok = L > 0
py, px = pk[:, 0], pk[:, 1]
d = np.hypot(yy.ravel() - py[L - 1].clip(0) * 1.0, xx.ravel() - px[L - 1] * 1.0)
rmax = np.clip(1.2 + 0.32 * hp, 3.0, 11.0)
bad = ok & ((d > rmax[L - 1]) | (cs.ravel() < 0.35 * hp[L - 1]))
L2 = L.copy(); L2[bad] = 0; lab = L2.reshape(H, W)
area = np.bincount(lab.ravel(), minlength=n + 1)[1:].astype(float)
top = ndi.maximum(chm, lab, index=np.arange(1, n + 1))
# crown base from the profile: returns 1.5 m and up over the crown's 2-m cells; the height where 8% of them have been passed
lab2 = lab[::2, ::2][:prof.shape[0], :prof.shape[1]]
P = np.zeros((n + 1, prof.shape[2]), np.float64)
np.add.at(P, lab2.ravel(), prof.reshape(-1, prof.shape[2]))
P = P[1:]
base = np.zeros(n); lo = 2
for i in range(n):
    p = P[i, lo:int(min(prof.shape[2] - 1, top[i])) + 1]
    if p.sum() < 4: base[i] = np.nan; continue
    c = np.cumsum(p) / p.sum(); base[i] = lo + np.searchsorted(c, 0.08)
nb = np.isnan(base); base[nb] = 0.3 * top[nb]
base = np.minimum(base, 0.7 * top)
# positions (the treetop) in course yards on the course map
ux = x0u + px + 0.5; uy = y1u - py - 0.5
cxy = u2c(ux, uy) - np.array(REG)
crad = np.sqrt(np.maximum(area, 1) / np.pi)   # metres
np.savez('seg_troy.npz', xy=cxy, h=top, cb=base, cr=crad, area=area, n=n)
print('crown radius m pct', np.percentile(crad, [10, 50, 90]).round(1), 'base m pct', np.percentile(base, [10, 50, 90]).round(1),
      'base/h', np.percentile(base / top, [10, 50, 90]).round(2))
np.save('lab_troy.npy', lab)
