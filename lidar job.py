"""Course data job: Oxmoor Valley Ridge hole diagrams from the RTJ Golf Trail course tour (for re-routing the traced Ridge)."""
import os,requests,json
os.makedirs('out/ridgemaps',exist_ok=True);res={}
H={'User-Agent':'Mozilla/5.0 (golf-go course research)'}
for h in range(1,19):
    u=f'https://www.rtjgolf.com/oxmoorvalley/tour-2013/c1h{h}.png'
    try:
        r=requests.get(u,headers=H,timeout=60);res[h]=[r.status_code,len(r.content),r.headers.get('content-type')]
        if r.ok:open(f'out/ridgemaps/c1h{h}.png','wb').write(r.content)
    except Exception as e:res[h]=str(e)
try:
    r=requests.get('https://www.rtjgolf.com/oxmoorvalley/ridge.html',headers=H,timeout=60);open('out/ridgemaps/ridge.html','wb').write(r.content)
except Exception as e:res['page']=str(e)
json.dump(res,open('out/summary.json','w'),indent=1);print(res)
