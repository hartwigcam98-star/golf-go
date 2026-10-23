"""Clubhouses gallery update for the lidar rebuild: new 'Now' pictures (crop of the course-side render like the original gallery)
and a 'From the survey' line in each rebuilt course's card; lede updated. usage: mkclubgal.py <renders dir>"""
import cv2, html, json, os, re, sys
R = '/home/claude/golf-go/clubhouses/'
A = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(A + '/survey_text.json'))
SRC = {'gnlake': 'gnlinks'}            # gallery id -> render name when they differ
rd = sys.argv[1]
page = open(R + 'index.html').read()
done = []
for gid, txt in T.items():
    src = rd + '/' + SRC.get(gid, gid) + '.png'
    if not os.path.exists(src): print('no render', gid); continue
    m = re.search(r'<article class="course" id="%s">.*?</article>' % gid, page, re.S)
    if not m: print('no card', gid); continue
    im = cv2.imread(src); h, w = im.shape[:2]
    im = im[int(h * .14):int(h * .72), :]
    im = cv2.resize(im, (640, 440), interpolation=cv2.INTER_AREA)
    cv2.imwrite(R + f'img/{gid}_after.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, 78, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
    card = m.group(0)
    card = re.sub(r'\n  <p class="survey">.*?</p>', '', card)
    card = card.replace('\n  <div class="shots">', '\n  <p class="survey">' + html.escape(txt) + '</p>\n  <div class="shots">', 1)
    page = page.replace(m.group(0), card); done.append(gid)
if '.survey{' not in page:
    page = page.replace('</style>', '.survey{margin:0;max-width:75ch;font-size:14px;color:var(--muted)}\n</style>', 1)
old = re.search(r'<p class="lede">.*?</p>', page, re.S).group(0)
page = page.replace(old, '<p class="lede">October 22, 2026: every clubhouse was checked against photos of the real building and got the right storeys, roof, colours, materials and features. '
    'October 23: ' + str(len(done) + 1) + ' of them were then rebuilt from the USGS lidar survey of each course, so every wing, roof and tower now has the measured shape, height and pitch of the real building. '
    'Here\'s each one before and now, seen from the course.</p>')
open(R + 'index.html', 'w').write(page)
print(len(done), 'cards updated', sorted(set(T) - set(done)))
