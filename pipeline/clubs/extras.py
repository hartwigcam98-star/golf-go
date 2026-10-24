"""Per-course extras for a new course: the clubhouse (BLDX club entry, CLUBLID lidar model), its look (CLUBLOOK) and the
course feel and landmarks (CFEEL, CFEEL2). Kept in pipeline/courses/extras/<key>.json and merged into the game files
after inject_auto.py, one course at a time, never touching other courses' entries.

  python3 clubs/extras.py lid <key>                  clubs/work/<key>/final.json + meta.json -> "clublid" (and the club's eave/rise)
  python3 clubs/extras.py apply <index.html> <ground.js> <key> [key...]
                                                     merge each key's extras into those files (run on work/ copies)
extras/<key>.json: {"club": {...from newclub.py}, "bldx": {"a": [...], "p": [...]}, "clublid": {...}, "clublook": {...},
                    "cfeel": {"fo":..,"pe":..,"br":..}, "cfeel2": {...}}   (every part optional)
"""
import json, math, os, re, sys
G = '/home/claude/golf/'
EX = '/home/claude/golf-go/pipeline/courses/extras/'

def lid(key):
    W = f'{G}clubs/work/{key}/'; m = json.load(open(W + 'meta.json')); b = json.load(open(W + 'final.json'))
    R = lambda bl: [[x[0]] + [round(float(v), 2) for v in x[1:8]] + ([x[8]] if len(x) > 8 and x[8] else []) for x in bl]
    L = dict(o=m['o'], a=m['a'], ref=m['ref'], blocks=R(b.get('blocks', [])))
    sys.path.insert(0, G + 'clubs'); import bk; L['gr'] = bk.ring(key, b)
    if b.get('parts'):
        A = math.radians(m['a'])
        L['parts'] = [dict(o=[round(m['o'][0] + p['du'] * math.cos(A) + p['dv'] * math.sin(A), 2), round(m['o'][1] - p['du'] * math.sin(A) + p['dv'] * math.cos(A), 2)],
                           a=round(m['a'] + p['da'], 2), blocks=R(p['blocks'])) for p in b['parts']]
    f = EX + key + '.json'; E = json.load(open(f)) if os.path.exists(f) else {}
    E['clublid'] = L
    # the clubhouse record's eave and rise from the model (used if the model ever isn't drawn)
    blk = [x for x in L['blocks'] if x[0] not in ('T',) and not (len(x) > 8 and set(x[8]) & set('od'))]
    if blk and E.get('bldx', {}).get('a'):
        big = max(blk, key=lambda x: (x[2] - x[1]) * (x[4] - x[3]))
        for a in E['bldx']['a']:
            if a[2] == 'club': a[1][0] = round(max(2.4, big[5]), 1); a[1][1] = round(max(0, min(4.5, max(big[5], big[7]) - big[5])), 1)
    json.dump(E, open(f, 'w'), indent=1); print(key, 'clublid:', len(L['blocks']), 'blocks', len(L.get('parts', [])), 'parts')

def jline(src, name):
    m = re.search(r'^const ' + name + r'=(\{.*\});\s*$', src, re.M)
    if not m: raise SystemExit('no single-line const ' + name)
    return m, json.loads(m.group(1))

def apply(index_f, ground_f, keys):
    s = open(index_f).read(); g = open(ground_f).read().split('\n')
    for key in keys:
        f = EX + key + '.json'
        if not os.path.exists(f): print(key, 'no extras'); continue
        E = json.load(open(f)); done = []
        if E.get('clublook'):
            a = 'const CLUBLOOK={\n'; assert s.count(a) == 1
            if re.search(r'^  ' + key + r':\{', s, re.M): s = re.sub(r'^  ' + key + r':\{.*\},?\n', '', s, count=1, flags=re.M)
            s = s.replace(a, a + '  ' + key + ':' + json.dumps(E['clublook'], separators=(',', ':')) + ',\n'); done.append('CLUBLOOK')
        if E.get('cfeel'):
            m, o = jline(s, 'CFEEL'); o[key] = E['cfeel']
            s = s[:m.start(1)] + json.dumps(o, separators=(',', ':')) + s[m.end(1):]; done.append('CFEEL')
        if E.get('cfeel2'):
            a = 'const CFEEL2={'; assert s.count(a) == 1
            seg = s[s.index(a):s.index('\n', s.index(a)) + 2000]
            if re.search(r'[{,\s]' + key + r':\{', seg): raise SystemExit(key + ' already has a CFEEL2 entry')
            s = s.replace(a, a + key + ':' + json.dumps(E['cfeel2'], separators=(',', ':')) + ',', 1); done.append('CFEEL2')
        for name, part in (('BLDX', 'bldx'), ('CLUBLID', 'clublid')):
            if not E.get(part): continue
            i = next((j for j, l in enumerate(g) if l.startswith('const ' + name + '=')), None)
            if i is None and name == 'CLUBLID':
                b = next(j for j, l in enumerate(g) if l.startswith('const BLDX=')); g.insert(b + 1, 'const CLUBLID={};'); i = b + 1
            o = json.loads(g[i][len('const ' + name + '='):].rstrip().rstrip(';'))
            if name == 'BLDX':
                cur = o.get(key, {})
                for k2, v in E[part].items():
                    if k2 in ('a', 'p') and isinstance(cur.get(k2), list): cur[k2] = [x for x in cur[k2] if not (k2 == 'a' and x[2] == 'club')] + v
                    else: cur[k2] = v
                o[key] = cur
            else: o[key] = E[part]
            g[i] = 'const ' + name + '=' + json.dumps(o, separators=(',', ':')) + ';'; done.append(name)
        print(key, 'merged:', ', '.join(done) or 'nothing')
    open(index_f, 'w').write(s); open(ground_f, 'w').write('\n'.join(g))

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'lid': lid(a[1])
    elif a[0] == 'apply': apply(a[1], a[2], a[3:])
