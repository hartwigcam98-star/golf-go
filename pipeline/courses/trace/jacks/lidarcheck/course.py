import json,re
def load(path='/home/claude/golf-go/index.html'):
    s=open(path).read()
    if '<!-- game code: tools/datafiles.py' in s:   # the repo page in pieces: read the all-in-one page (tools/datafiles.py)
        import sys,os;sys.path.insert(0,os.path.join(os.path.dirname(path),'tools'));import datafiles;s=datafiles.pack_text(os.path.dirname(path),s)
    i=s.index('let COURSE_JAK=');j=s.index('\n',i);t=s[i:j]
    holes=json.loads(re.search(r'holes:(\[.*?\]),polys:',t).group(1));polys=json.loads(re.search(r'polys:(\{.*?\}),paths:',t).group(1))
    return holes,polys,s,i,j,t
