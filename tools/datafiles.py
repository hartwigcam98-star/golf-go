#!/usr/bin/env python3
"""The game's big data lines live in data/, one file each; index.html keeps a one-line marker where each one was.

Why: index.html used to be 27 MB, almost all of it data (course layouts and surroundings, textures, the golfer's motion,
character pictures, course pictures). Code and data are now apart, and nothing about the game changes:

  pack    rebuilds the old all-in-one page, byte for byte (each marker swapped back for its line, the data script tags dropped).
          The publish build (tools/split/build.js) and the stamp (tools/stamp.py) work from it, so players get exactly the same
          files as before. Course-pipeline steps that edit the page as one text start from it too.
  unpack  takes any page and moves every big data line out of the game script into data/<NAME>.js, leaving the marker and
          loading the files with plain <script> tags just before the game script. Lines already moved stay moved; a data file
          whose marker is gone is deleted. Running it on an all-in-one page (e.g. the nightly build's work/index.html once it
          has been copied back into the repo) splits it again, so it is safe to run any time. tools/stamp.py runs it.
  check   pack(unpack(page)) must give the page back exactly; also run by the Same-game check.

A line moves when it sits in the game script, is at least 20,000 characters, and is `const|let NAME=<literal>;` or
`Object.assign(NAME,<literal>);` (a trailing // comment is fine) whose literal is plain data (an object, array or string
literal that evaluates on its own, checked with node),
so running it as its own script before the game gives the same value. Moving it from the game's closure to a top-level script
keeps it visible to the game by the same name. KEEP lists lines that pipeline tools edit in place in the repo copy.

usage (from the repo root, or pass --repo DIR):
  python3 tools/datafiles.py pack [OUT]     all-in-one page to OUT (default: stdout)
  python3 tools/datafiles.py unpack [IN]    split IN (default: index.html) into index.html + data/
  python3 tools/datafiles.py check          round-trip test of the current repo
"""
import hashlib, json, os, re, subprocess, sys, tempfile

MIN = 20000
KEEP = {'RLID'}   # pipeline/ranges/sync.py edits it in the repo page
GAME_START = '(()=>{\nconst $=id=>document.getElementById(id)'
TAGS_A, TAGS_B = '<!-- data files: tools/datafiles.py -->', '<!-- /data files -->'
MARK = re.compile(r'^/\*@data ([A-Za-z_$][\w$]*(?:\.assign\d+)?)\*/$')
DEF = re.compile(r'^(?:const|let) ([A-Za-z_$][\w$]*)=')
ASSIGN = re.compile(r'^Object\.assign\(([A-Za-z_$][\w$]*),')

def repo_dir(argv):
    if '--repo' in argv:
        i = argv.index('--repo'); r = argv[i + 1]; del argv[i:i + 2]; return os.path.abspath(r)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def rd(p): return open(p, encoding='utf-8', newline='').read()
def wr(p, s):
    with open(p, 'w', encoding='utf-8', newline='') as f: f.write(s)
def sha(s): return hashlib.sha1(s.encode('utf-8')).hexdigest()[:10]

def game_span(lines):
    """first and last line index of the game script body (the line after '<script>' up to the line before '</script>')"""
    for i in range(1, len(lines)):
        if lines[i] == '(()=>{' and i + 1 < len(lines) and lines[i + 1].startswith('const $=id=>document.getElementById(id)'):
            if lines[i - 1] != '<script>': sys.exit('datafiles: the game script does not start with a <script> line')
            j = i
            while j < len(lines) and lines[j] != '</script>': j += 1
            if j == len(lines): sys.exit('datafiles: the game script has no </script>')
            return i, j - 1
    sys.exit('datafiles: game script not found')

def literal_ok(texts):
    """for each candidate literal, True when node evaluates it on its own as plain data"""
    js = ('const vm=require("vm"),fs=require("fs");const L=JSON.parse(fs.readFileSync(0,"utf8"));'
          'console.log(JSON.stringify(L.map(t=>{try{const v=vm.runInNewContext("("+t+")",{}, {timeout:20000});return typeof v==="string"||(v!==null&&typeof v==="object");}catch(e){return false;}})));')
    r = subprocess.run(['node', '-e', js], input=json.dumps(texts), capture_output=True, text=True)
    if r.returncode: sys.exit('datafiles: node failed: ' + r.stderr[:400])
    return json.loads(r.stdout)

def split_line(l):
    """(key, literal) for a movable line shape, else None. key is NAME, or NAME.assign for Object.assign lines"""
    m = DEF.match(l); kind = 'def'
    if not m:
        m = ASSIGN.match(l); kind = 'assign'
        if not m: return None
    body = l[m.end():]
    # the literal ends at the last ';' (def) or ');' (assign) that is followed only by spaces and an optional // comment
    end = ';' if kind == 'def' else ');'
    for k in reversed([x.start() for x in re.finditer(re.escape(end), body)]):
        tail = body[k + len(end):]
        if re.fullmatch(r'\s*(//.*)?', tail): return (m.group(1), kind, body[:k])
    return None

def tags_block(names, repo):
    out = [TAGS_A]
    for n in names: out.append('<script src="data/%s.js?v=%s"></script>' % (n, sha(rd(os.path.join(repo, 'data', n + '.js')))))
    out.append(TAGS_B)
    return out

def strip_tags(lines):
    if TAGS_A not in lines: return lines
    a = lines.index(TAGS_A); b = lines.index(TAGS_B, a)
    return lines[:a] + lines[b + 1:]

def pack_text(repo, page=None):
    s = rd(os.path.join(repo, 'index.html')) if page is None else page
    lines = strip_tags(s.split('\n'))
    out = []
    for l in lines:
        m = MARK.match(l)
        if m:
            p = os.path.join(repo, 'data', m.group(1) + '.js')
            if not os.path.exists(p): sys.exit('datafiles: marker for %s but no %s' % (m.group(1), p))
            d = rd(p)
            if not d.endswith('\n') or '\n' in d[:-1]: sys.exit('datafiles: %s must be exactly one line' % p)
            out.append(d[:-1])
        else: out.append(l)
    return '\n'.join(out)

def unpack(repo, src=None, quiet=False):
    s = rd(os.path.join(repo, 'index.html')) if src is None else rd(src)
    lines = strip_tags(s.split('\n'))
    g0, g1 = game_span(lines)
    cands = []
    for i in range(g0, g1 + 1):
        l = lines[i]
        if len(l) < MIN: continue
        sp = split_line(l)
        if not sp or sp[0] in KEEP: continue
        cands.append((i, sp))
    ok = literal_ok([c[1][2] for c in cands]) if cands else []
    ddir = os.path.join(repo, 'data'); os.makedirs(ddir, exist_ok=True)
    nassign = {}
    moved = 0
    # keys for lines already moved (markers), so new assign keys don't clash
    for l in lines[g0:g1 + 1]:
        m = MARK.match(l)
        if m and '.assign' in m.group(1):
            b, n = m.group(1).split('.assign'); nassign[b] = max(nassign.get(b, 0), int(n))
    for (i, (name, kind, lit)), good in zip(cands, ok):
        if not good:
            if not quiet: print('stays inline (not plain data):', name)
            continue
        if kind == 'assign':
            nassign[name] = nassign.get(name, 0) + 1; key = '%s.assign%d' % (name, nassign[name])
        else: key = name
        # a name declared more than once in the game script would change meaning at top level: refuse
        if kind == 'def':
            decl = sum(1 for x in lines[g0:g1 + 1] if re.match(r'^\s*(?:const|let|var|function)\s+' + re.escape(name) + r'\b', x))
            decl += sum(1 for x in lines[g0:g1 + 1] if MARK.match(x) and MARK.match(x).group(1) == name)
            if decl != 1: sys.exit('datafiles: %s is declared %d times in the game script' % (name, decl))
        wr(os.path.join(ddir, key + '.js'), lines[i] + '\n')
        lines[i] = '/*@data %s*/' % key
        moved += 1
    keys = [MARK.match(l).group(1) for l in lines[g0:g1 + 1] if MARK.match(l)]
    if len(set(keys)) != len(keys): sys.exit('datafiles: a data marker appears twice')
    for f in os.listdir(ddir):
        if f.endswith('.js') and f[:-3] not in keys:
            os.remove(os.path.join(ddir, f))
            if not quiet: print('removed data/%s (its line is gone from the page)' % f)
    if keys:
        at = g0 - 1   # the '<script>' line of the game
        lines = lines[:at] + tags_block(keys, repo) + lines[at:]
    wr(os.path.join(repo, 'index.html'), '\n'.join(lines))
    if not quiet: print('datafiles: %d line(s) moved now, %d data files in all' % (moved, len(keys)))
    return keys

def check(repo):
    """the current page packs into an all-in-one page that unpacks back to exactly the current page and data"""
    page = rd(os.path.join(repo, 'index.html'))
    full = pack_text(repo)
    with tempfile.TemporaryDirectory() as t:
        os.makedirs(os.path.join(t, 'data'))
        wr(os.path.join(t, 'index.html'), full)
        unpack(t, quiet=True)
        page2 = rd(os.path.join(t, 'index.html'))
        if page2 != page: sys.exit('datafiles CHECK FAILED: unpacking the packed page does not give index.html back')
        js = lambda d: sorted(f for f in os.listdir(d) if f.endswith('.js')) if os.path.isdir(d) else []
        a = js(os.path.join(repo, 'data')); b = js(os.path.join(t, 'data'))
        if a != b: sys.exit('datafiles CHECK FAILED: data files differ: %s' % sorted(set(a) ^ set(b)))
        for f in a:
            if rd(os.path.join(repo, 'data', f)) != rd(os.path.join(t, 'data', f)): sys.exit('datafiles CHECK FAILED: data/' + f)
        if pack_text(t) != full: sys.exit('datafiles CHECK FAILED: packing twice differs')
    print('datafiles check ok: %d data files, page %d KB, all-in-one %d KB' % (len(a), len(page.encode()) // 1024, len(full.encode()) // 1024))

if __name__ == '__main__':
    argv = sys.argv[1:]; repo = repo_dir(argv)
    cmd = argv[0] if argv else 'check'
    if cmd == 'pack':
        t = pack_text(repo)
        if len(argv) > 1 and argv[1] != '-': wr(argv[1], t)
        else: sys.stdout.write(t)
    elif cmd == 'unpack': unpack(repo, argv[1] if len(argv) > 1 else None)
    elif cmd == 'check': check(repo)
    else: sys.exit(__doc__)
