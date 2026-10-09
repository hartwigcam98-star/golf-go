"""Course data job: Silver Lakes hole diagrams from the RTJ Golf Trail course tour (for routing the Backbreaker nine)."""
import os,requests,json,re
os.makedirs('out/slmaps',exist_ok=True);res={}
H={'User-Agent':'Mozilla/5.0 (golf-go course research)'}
def get(u,fn=None):
    try:
        r=requests.get(u,headers=H,timeout=60);res[u]=[r.status_code,len(r.content),r.headers.get('content-type')]
        if r.ok and fn:open(fn,'wb').write(r.content)
        return r
    except Exception as e:res[u]=str(e)
p=get('https://www.rtjgolf.com/silverlakes/','out/slmaps/page.html')
links=set(re.findall(r'(?:href|src)=["\']([^"\']+)["\']',p.text)) if p is not None and p.ok else set()
for l in sorted(links):
    if re.search(r'tour|hole|\.png|\.pdf|scorecard|map',l,re.I):
        u=l if l.startswith('http') else 'https://www.rtjgolf.com/silverlakes/'+l.lstrip('/') if not l.startswith('/') else 'https://www.rtjgolf.com'+l
        get(u,'out/slmaps/'+re.sub(r'[^A-Za-z0-9._-]','_',u.split('//')[1])[-120:])
for c in range(1,5):
    for h in range(1,19):
        u=f'https://www.rtjgolf.com/silverlakes/tour-2013/c{c}h{h}.png';r=get(u,f'out/slmaps/c{c}h{h}.png')
        if h==1 and (r is None or not r.ok):break
json.dump(res,open('out/summary.json','w'),indent=1);print(json.dumps(res,indent=1))
