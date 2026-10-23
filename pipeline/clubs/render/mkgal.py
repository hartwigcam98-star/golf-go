"""Build landmarks/ (index.html + img/*_before.jpg, *_after.jpg) in the repo, in the style of clubhouses/."""
import cv2, html, os, sys
S = '/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/'
R = '/home/claude/golf-go/landmarks/'
os.makedirs(R + 'img', exist_ok=True)
L = [
 ('01_northfork_truss_bridge', 'The Links at Northfork', 'Ramsey, MN', 'Truss bridge', "The big red-brown steel arch bridge that carries the cart path over the road by the clubhouse, on stone-block abutments."),
 ('02_windsong_silo', 'Windsong Farm', 'Independence, MN', 'Silo', "The farm silo that stands beside the 4th green."),
 ('03_windsong_boardwalk', 'Windsong Farm', 'Independence, MN', 'Boardwalk', "The long grey timber boardwalk that crosses the pond."),
 ('04_maddens_covered_bridge', "The Classic at Madden's", 'Brainerd, MN', 'Covered bridge', "A roofed wooden covered bridge over the marsh."),
 ('05_maddens_pavilion', "The Classic at Madden's", 'Brainerd, MN', 'Pavilion', "The covered timber pavilion on the pond bank behind a green."),
 ('06_stoneridge_barn', 'StoneRidge', 'Stillwater, MN', 'The Barn', "The building by the pond was already there; it's now drawn as The Barn from the club's logo, with barn doors and its real shape."),
 ('07_troy_barn', 'Troy Burne', 'Hudson, WI', 'Barn', "The small dark barn by the par-3 pond."),
 ('08_mystic_gazebo', 'The Meadows at Mystic Lake', 'Prior Lake, MN', 'Gazebo', "The white gazebo on the bank of the big pond."),
 ('09_mystic_hotel_tower', 'The Meadows at Mystic Lake', 'Prior Lake, MN', 'Hotel tower', "Mystic Lake's hotel tower rising over the casino, from the photos: cream wings banded with teal windows, a taller centre core with teal glass, and the red Mystic Lake sign on top."),
 ('10_rossbridge_waterfall_1', 'Ross Bridge', 'Hoover, AL', 'Waterfall', "A flowing waterfall over limestone ledges into the pond, with a foam pool where it lands."),
 ('11_rossbridge_waterfall_2', 'Ross Bridge', 'Hoover, AL', 'Waterfall', "The second waterfall, by the 8th green."),
 ('12_mystic_waterfall', 'The Meadows at Mystic Lake', 'Prior Lake, MN', 'Waterfall', "A stone waterfall cascading into the pond."),
 ('13_troy_limestone_ledges', 'Troy Burne', 'Hudson, WI', 'Limestone ledges', "Stacked limestone ledges along the pond banks by the greens."),
 ('14_legend_begonia_beds', 'The Legend', 'Biwabik, MN', 'Begonia beds', "Red begonia beds behind the tees."),
 ('15_pines_begonia_beds', 'The Pines', 'Nisswa, MN', 'Begonia beds', "Red begonia beds behind the greens."),
 ('16_farmlinks_marble', 'FarmLinks at Pursell Farms', 'Sylacauga, AL', 'Marble outcrop', "White marble rock by the 5th tee."),
 ('17_wilderness_snag', 'The Wilderness', 'Tower, MN', 'Dead snag', "The tall bare dead tree near the 12th."),
 ('18_wilderness_fortune_bay', 'The Wilderness', 'Tower, MN', 'Fortune Bay resort', "The Fortune Bay resort and casino now stand at their real height over the course."),
 ('19_rossbridge_hotel', 'Ross Bridge', 'Hoover, AL', 'The castle hotel', "The Renaissance Ross Bridge hotel on the hill now has its chateau skyline from the photos: round corner turrets with tall slate spires and steep stone gables along the roof."),
 ('20_rossbridge_mill', 'Ross Bridge', 'Hoover, AL', 'Old stone mill house', "The honey-stone mill house at the head of the creek, from the photos: steep grey roof, a little cupola and a timber lean-to, with the creek pouring out of an arch at its foot and tumbling down the stones. It replaces the plain white box that stood there."),
 ('21_rossbridge_creek', 'Ross Bridge', 'Hoover, AL', 'Creek and azaleas', "The creek used to sit in a 20-yard-deep canyon, because the game held all of it at the level of the lake it drains into. It now falls along its banks the way the real one does, and pink azaleas line the water like the spring photos."),
]
arts = []
for key, course, town, what, desc in L:
    for src, tag in ((S + 'galold/' + key + '.png', 'before'), (S + 'gal/' + key + '.png', 'after')):
        im = cv2.imread(src)
        if im is None: sys.exit('missing ' + src)
        im = cv2.resize(im, (640, 400), interpolation=cv2.INTER_AREA)
        cv2.imwrite(R + f'img/{key[3:]}_{tag}.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, 78, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
    e = html.escape
    arts.append(f'''<article class="course" id="{key[3:]}">
  <div class="top"><h2>{e(what)}</h2><span class="town">{e(course)} · {e(town)}</span></div>
  <p class="real">{e(desc)}</p>
  <div class="shots">
    <figure><img src="img/{key[3:]}_before.jpg" alt="{e(course)}, {e(what.lower())}: before" loading="lazy" width="640" height="400"><figcaption>Before</figcaption></figure>
    <figure class="now"><img src="img/{key[3:]}_after.jpg" alt="{e(course)}, {e(what.lower())}: now" loading="lazy" width="640" height="400"><figcaption>Now</figcaption></figure>
  </div>
</article>''')
head = open('/home/claude/golf-go/clubhouses/index.html').read()
head = head[:head.index('<body>')].replace('Golf Go · New clubhouses', 'Golf Go · Course landmarks')
page = head + '''<body>
<div class="wrap">
<a class="back" id="back" href="../" hidden>&larr; Back to Golf Go</a>
<h1>Course landmarks</h1>
<p class="lede">October 23, 2026. Courses picked up their real landmarks from photos of each course: bridges, barns, a silo, a gazebo and pavilion, a hotel tower, Ross Bridge's castle hotel and old stone mill, flowing waterfalls, stone ledges and flower beds. Here's each one before and after, seen from the course. (The waterfalls move in the game.)</p>
<div class="list">
''' + '\n'.join(arts) + '''
</div>
</div>
<script>if(window.top===window.self)document.getElementById('back').hidden=false;</script>
</body>
</html>
'''
open(R + 'index.html', 'w').write(page)
print('ok', len(arts), sum(os.path.getsize(R + 'img/' + f) for f in os.listdir(R + 'img')) // 1024, 'KB')
