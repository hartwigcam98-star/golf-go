"""Fill the fetch-job template: python3 auto/mkjob.py job.json out.py
job.json: {"name":"...","search":[[S,W,N,E]],"want":{key:regex},"holes":{key:regex},"steps":{key:"all"},
           optional "ids":{key:"way/123"} (use when the regex matches the wrong outline; set want to "^zzz$"),
           "boxes":{key:[W,S,E,N]} (no OSM outline: box round the course's hole lines), "greens":{key:[[W,S,E,N],..]} (traced greens)}"""
import json,sys
J=json.load(open(sys.argv[1]));t=open('/home/claude/golf/auto/fetch_job_tmpl.py').read()
open(sys.argv[2],'w').write(t.replace('@@JOB@@',json.dumps(J)))
import ast;ast.parse(open(sys.argv[2]).read());print('ok')
