#!/usr/bin/env python3
"""The game page is kept in pieces: index.html (page, styles, three.js, the loader), src/ (the game code, one file per
section) and data/ (the game code's big data lines, one file each). Packed together they are exactly the old all-in-one
index.html, byte for byte.

Why: index.html used to be 27 MB and the game code one 7,900-line block. Now code, data and page are apart, and nothing about
the game changes:

  pack    rebuilds the all-in-one page, byte for byte: the game code from src/ goes back between its <script> tags, each data
          marker is swapped back for its line, and the data script tags and the loader are dropped. The publish build
          (tools/split/build.js) and the stamp (tools/stamp.py) work from it, so players get exactly the same files as before.
          Course-pipeline steps that edit the page as one text start from it too.
  unpack  takes any page (all-in-one, already split, or partly) and splits it: every big data line in the game code moves to
          data/<NAME>.js (leaving a /*@data NAME*/ marker); then the game code is cut at its section headings
          (/* ---------- name ---------- */ and /* ---- name ---- */) into src/<name>.js, and index.html gets a small loader in
          its place (the loader's list keeps the order). Files whose
          part is gone are deleted. Safe to run any time; tools/stamp.py runs it.
  check   pack(unpack(page)) must give the page back exactly; also run by the Same-game check.

Data lines: a line moves when it sits in the game code, is at least 20,000 characters, and is `const|let NAME=<literal>;` or
`Object.assign(NAME,<literal>);` (a trailing // comment is fine) whose literal is plain data (an object, array or string
literal that evaluates on its own, checked with node), so running it as its own script before the game gives the same value.
Moving it from the game's closure to a top-level script keeps it visible to the game by the same name. KEEP lists lines that
pipeline tools edit in place.

The game code: in the repo copy, the loader fetches src/ in order and runs the joined text as one inline script, so the game
still runs as one closure, from exactly the same text as before. Edit the game in src/. A tool that writes an all-in-one page
into the repo is fine: the next stamp splits it again.

usage (from the repo root, or pass --repo DIR):
  python3 tools/datafiles.py pack [OUT]     all-in-one page to OUT (default: stdout)
  python3 tools/datafiles.py unpack [IN]    split IN (default: index.html) into index.html + src/ + data/
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

CODE_A, CODE_B = '<!-- game code: tools/datafiles.py (the game is in src/) -->', '<!-- /game code -->'
HEAD = re.compile(r'^/\* -{4,} (.*?) -{4,} \*/\s*$')
PART = re.compile(r'^[a-z0-9-]+\.js$')

def slug(h):
    h = re.split(r'[:(,]', h)[0].lower().replace('&', 'and')
    w = re.findall(r'[a-z0-9]+', h)[:4]
    return '-'.join(w) or 'part'

def loader(names, repo):
    P = ','.join('"src/%s?v=%s"' % (n, sha(rd(os.path.join(repo, 'src', n)))) for n in names)
    return [CODE_A,
            '<script>(function(){var P=[' + P + '],t="",i,x;for(i=0;i<P.length;i++){x=new XMLHttpRequest();x.open("GET",P[i],false);x.send();'
            'if(x.status!==200&&x.status!==0)throw new Error("game code: could not load "+P[i]);t+=x.responseText;}'
            'var s=document.createElement("script");s.text="\\n"+t+"//# sourceURL=game.js\\n";document.currentScript.after(s);})();</script>',
            CODE_B]

def code_inline(repo, lines):
    """the game code back between its <script> tags (no-op when it is already inline)"""
    if CODE_A not in lines: return lines
    a = lines.index(CODE_A); b = lines.index(CODE_B, a)
    names = re.findall(r'"src/([^"?]+)\?v=', '\n'.join(lines[a:b]))
    body = []
    for n in names:
        p = os.path.join(repo, 'src', n)
        if not os.path.exists(p): sys.exit('datafiles: the loader lists %s but it is missing' % p)
        t = rd(p)
        if not t.endswith('\n'): sys.exit('datafiles: %s must end with a newline' % p)
        body += t[:-1].split('\n')
    return lines[:a] + ['<script>'] + body + ['</script>'] + lines[b + 1:]

def code_split(repo, lines, quiet=False):
    g0, g1 = game_span(lines)
    body = lines[g0:g1 + 1]
    cuts = [0] + [k for k, l in enumerate(body) if k > 0 and HEAD.match(l)] + [len(body)]
    sdir = os.path.join(repo, 'src'); os.makedirs(sdir, exist_ok=True)
    names = []
    for n in range(len(cuts) - 1):
        part = body[cuts[n]:cuts[n + 1]]
        m = HEAD.match(part[0]) if n else None
        base = slug(m.group(1)) if m else 'start'; name = base + '.js'; k = 2
        while name in names: name = '%s-%d.js' % (base, k); k += 1
        wr(os.path.join(sdir, name), '\n'.join(part) + '\n')
        names.append(name)
    for f in os.listdir(sdir):
        if PART.match(f) and f not in names:
            os.remove(os.path.join(sdir, f))
            if not quiet: print('removed src/%s (its section is gone or renamed)' % f)
    return lines[:g0 - 1] + loader(names, repo) + lines[g1 + 2:], names

def pack_text(repo, page=None):
    s = rd(os.path.join(repo, 'index.html')) if page is None else page
    lines = strip_tags(code_inline(repo, s.split('\n')))
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
    lines = strip_tags(code_inline(repo, s.split('\n')))
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
    lines, names = code_split(repo, lines, quiet)
    wr(os.path.join(repo, 'index.html'), '\n'.join(lines))
    if not quiet: print('datafiles: %d data line(s) moved now, %d data files in all; game code in %d src files' % (moved, len(keys), len(names)))
    return keys

def check(repo):
    """the current page packs into an all-in-one page that unpacks back to exactly the current page and data"""
    page = rd(os.path.join(repo, 'index.html'))
    full = pack_text(repo)
    with tempfile.TemporaryDirectory() as t:
        os.makedirs(os.path.join(t, 'data')); os.makedirs(os.path.join(t, 'src'))
        wr(os.path.join(t, 'index.html'), full)
        unpack(t, quiet=True)
        page2 = rd(os.path.join(t, 'index.html'))
        if page2 != page: sys.exit('datafiles CHECK FAILED: unpacking the packed page does not give index.html back')
        js = lambda d: sorted(f for f in os.listdir(d) if f.endswith('.js')) if os.path.isdir(d) else []
        a = js(os.path.join(repo, 'data')); b = js(os.path.join(t, 'data'))
        if a != b: sys.exit('datafiles CHECK FAILED: data files differ: %s' % sorted(set(a) ^ set(b)))
        for f in a:
            if rd(os.path.join(repo, 'data', f)) != rd(os.path.join(t, 'data', f)): sys.exit('datafiles CHECK FAILED: data/' + f)
        c = lambda d: sorted(f for f in os.listdir(d) if PART.match(f)) if os.path.isdir(d) else []
        ca = c(os.path.join(repo, 'src')); cb = c(os.path.join(t, 'src'))
        if ca != cb: sys.exit('datafiles CHECK FAILED: src files differ: %s' % sorted(set(ca) ^ set(cb)))
        for f in ca:
            if rd(os.path.join(repo, 'src', f)) != rd(os.path.join(t, 'src', f)): sys.exit('datafiles CHECK FAILED: src/' + f)
        if pack_text(t) != full: sys.exit('datafiles CHECK FAILED: packing twice differs')
    print('datafiles check ok: %d data files, %d src files, page %d KB, all-in-one %d KB' % (len(a), len(ca), len(page.encode()) // 1024, len(full.encode()) // 1024))

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
