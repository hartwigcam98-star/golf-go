"""Apply clubhouse photo-matching proposals to a private test copy of the game.
usage: python3 apply_props.py props.json OUTDIR
props.json: {course id: {"look": {CLUBLOOK keys to set; null deletes}, "st": [[u,v,width],...] or null to clear}}
Shared clubhouses: the same change is applied to every course id that uses the clubhouse (judge/senator follow legislator,
gnlinks follows gnlake for the look and gnlake follows gnlinks for the model, ridge follows valley)."""
import json, re, sys, os, subprocess, shutil
R = '/home/claude/golf-go/'
props = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
LOOK_ALIAS = {'legislator': ['judge', 'senator'], 'gnlinks': ['gnlake'], 'gnlake': ['gnlinks'], 'valley': ['ridge'], 'crsc': ['crls'], 'slmh': ['slbm'], 'sandvalley': ['mammoth']}
s = open(R + 'index.html').read(); g = open(R + 'ground.js').read().split('\n')
i = s.index('const CLUBLOOK={\n'); j = s.index('};', i); body = s[i:j]
li = next(k for k, l in enumerate(g) if l.startswith('const CLUBLID=')); LID = json.loads(g[li][len('const CLUBLID='):].rstrip().rstrip(';'))
for cid, P in props.items():
    for k in [cid] + LOOK_ALIAS.get(cid, []):
        if P.get('look'):
            m = re.search(r'^  ' + k + r':(\{.*?\})(,?)$', body, re.M)
            if m:
                o = json.loads(m.group(1))
                for a, v in P['look'].items():
                    if v is None: o.pop(a, None)
                    else: o[a] = v
                body = body[:m.start()] + '  ' + k + ':' + json.dumps(o, separators=(',', ':')) + m.group(2) + body[m.end():]
        if 'st' in P and k in LID:
            if P['st']: LID[k]['st'] = P['st']
            else: LID[k].pop('st', None)
s = s[:i] + body + s[j:]; g[li] = 'const CLUBLID=' + json.dumps(LID, separators=(',', ':')) + ';'
open(out + '/src_index.html', 'w').write(s)
subprocess.run(['python3', '/home/claude/golf/test/mkharness.py', out + '/src_index.html', out + '/index.html'], check=True, capture_output=True)
open(out + '/ground.js', 'w').write('\n'.join(g))
for f in ('greens.js', 'trees.js'): shutil.copy(R + f, out + '/' + f)
print('applied', ', '.join(props), '->', out)
