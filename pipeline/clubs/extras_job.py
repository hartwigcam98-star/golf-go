"""Course extras job (GitHub Actions, workflow extras.yml): for each requested course, the clubhouse lidar (club_job.py) and
two photo sets (imgjob.py): clubhouse photos (<key>_club) and course photos for landmarks (<key>_course).
Input: extras_req.json {key: {"club": {"lat","lon","R","pref":[ept names]} (optional),
                              "name": "...", "town": "...", "urls": [club site], "must": "regex", "club_qs": [...], "course_qs": [...]}}
Output (out/, pushed to branch extras-data): <key>_lidar.npz, <key>_*.jpg aerials, courseimg/<key>_club.jpg + courseimg/<key>_club/NN.jpg,
courseimg/<key>_course.jpg + dir, courseimg/sources.json, log.txt."""
import json, os, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__))
R = json.load(open('extras_req.json'))
os.makedirs('out', exist_ok=True)
clubs = {k: v['club'] for k, v in R.items() if v.get('club')}
sites = {}
for k, v in R.items():
    base = dict(name=v['name'], town=v.get('town', ''), must=v.get('must', v['name'].split()[0]), q=v['name'])
    sites[k + '_club'] = dict(base, kind='club', urls=v.get('urls', []),
                              qs=v.get('club_qs') or [f"{v['name']} {v.get('town','')} clubhouse", f"{v['name']} clubhouse patio"])
    sites[k + '_course'] = dict(base, kind='course', urls=[], nodefault=1,
                                qs=v.get('course_qs') or [f"{v['name']} golf course pond fountain", f"{v['name']} golf course bridge",
                                                          f"{v['name']} signature hole", f"{v['name']} golf course aerial"])
json.dump(clubs, open('clubs.json', 'w'), indent=1)
json.dump(sites, open('club_sites.json', 'w'), indent=1)
rc = 0
if clubs:
    rc |= subprocess.call([sys.executable, os.path.join(D, 'club_job.py')])
rc |= subprocess.call([sys.executable, os.path.join(D, 'imgjob.py')])
print('extras job done', rc)
