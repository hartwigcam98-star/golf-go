"""write golf-go/b10/bake.js from b10/light/<course>/bounds.json (+ hNN.webp) and b10/club/<id>.js"""
import json, glob, os
G = '/home/claude/golf-go/b10'
L = ["/* Blender trial (?b10=1): per-course data. courses[id].holes[index] = this hole's light baked in Cycles (R sun, G sky) with its",
     "   bounds [x0, y0, w, h]; clubs[id] = version of b10/club/<id>.js (the game's clubhouse run through Blender). k = [sun, sky strength]. */",
     "window.B10BAKE={k:[.9,.8],", "courses:{"]
for d in sorted(glob.glob(G + '/light/*/bounds.json')):
    c = d.split('/')[-2]; B = json.load(open(d)); hs = []
    for k in sorted(B, key=int):
        if os.path.exists('%s/light/%s/h%02d.webp' % (G, c, int(k) + 1)):
            hs.append("%s:{b:[%s],png:'b10/light/%s/h%02d.webp?v=1'}" % (k, ','.join('%g' % v for v in B[k]), c, int(k) + 1))
    if hs: L.append("%s:{holes:{%s}}," % (c, ','.join(hs)))
L.append("},")
ids = sorted(os.path.basename(f)[:-3] for f in glob.glob(G + '/club/*.js'))
L.append("clubs:{" + ','.join('%s:1' % i for i in ids) + "}};")
open(G + '/bake.js', 'w').write('\n'.join(L) + '\n'); print('courses', sum(1 for l in L if l.endswith('}}},')), 'clubs', len(ids))
