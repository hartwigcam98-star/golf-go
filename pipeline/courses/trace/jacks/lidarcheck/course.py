import json,re
def load(path='/home/claude/golf-go/index.html'):
    s=open(path).read();i=s.index('let COURSE_JAK=');j=s.index('\n',i);t=s[i:j]
    holes=json.loads(re.search(r'holes:(\[.*?\]),polys:',t).group(1));polys=json.loads(re.search(r'polys:(\{.*?\}),paths:',t).group(1))
    return holes,polys,s,i,j,t
