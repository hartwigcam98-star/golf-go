"""Put the measured trees into trees.js: [TJ=path/trees.js] python3 insL.py <trees-data checkout> [key ...]
Each <dir>/<key>/L.json becomes R3NAIP[key].L (replacing any earlier one). Courses whose run failed are listed and left alone."""
import json, os, sys, re
HERE = os.path.dirname(os.path.abspath(__file__)); TJ = os.environ.get('TJ') or os.path.abspath(os.path.join(HERE, '..', '..', '..', 'trees.js'))   # TJ=<work copy> for the nightly build
D = sys.argv[1]; keys = sys.argv[2:] or sorted(k for k in os.listdir(D) if os.path.isdir(os.path.join(D, k)) and not k.startswith('.'))
s = open(TJ).read(); done, skip = [], []
for k in keys:
    f = os.path.join(D, k, 'L.json')
    if not os.path.exists(f): skip.append(k); continue
    L = json.load(open(f)); L.pop('scan', None)
    if L.get('n', 0) < 50: skip.append(k + '(n=%d)' % L.get('n', 0)); continue
    i = s.find('"%s":{' % k)
    if i < 0: skip.append(k + '(not in R3NAIP)'); continue
    j = s.index('"ext":', i); j = s.index(']', j) + 1          # end of this entry's ext; an old L follows it
    e = s.index('}', j) if not s.startswith(',"L":', j) else s.index('}', s.index('}', j) + 1)
    s = s[:j] + ',"L":' + json.dumps(L, separators=(',', ':')) + s[e:]
    done.append('%s %d' % (k, L['n']))
open(TJ, 'w').write(s); print('in:', ', '.join(done)); print('left as they were:', ', '.join(skip) or '-')
