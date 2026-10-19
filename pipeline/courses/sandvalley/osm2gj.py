"""Overpass JSON ('out geom') -> GeoJSON FeatureCollection in the same shape overpass-turbo exports
(closed ways -> Polygon, open ways -> LineString, multipolygon relations -> MultiPolygon, nodes -> Point).
Properties carry the OSM tags plus '@id'."""
import json, sys

AREA_KEYS = {'building', 'landuse', 'leisure', 'natural', 'amenity', 'golf', 'area', 'place', 'water'}
LINE_GOLF = {'hole', 'cartpath', 'path'}


def is_area(tags, closed):
    if not closed: return False
    if tags.get('area') == 'no': return False
    if tags.get('golf') in LINE_GOLF: return False
    if 'highway' in tags and tags.get('area') != 'yes': return False
    if 'barrier' in tags or 'waterway' in tags and tags.get('waterway') not in ('riverbank', 'dock'): return False
    return any(k in tags for k in AREA_KEYS) or tags.get('area') == 'yes'


def join_rings(ways):
    """Join way coordinate lists end to end into closed rings."""
    ways = [list(w) for w in ways if len(w) >= 2]
    rings = []
    while ways:
        cur = ways.pop(0)
        changed = True
        while cur[0] != cur[-1] and changed:
            changed = False
            for i, w in enumerate(ways):
                if w[0] == cur[-1]: cur += w[1:]
                elif w[-1] == cur[-1]: cur += w[::-1][1:]
                elif w[-1] == cur[0]: cur = w + cur[1:]
                elif w[0] == cur[0]: cur = w[::-1] + cur[1:]
                else: continue
                ways.pop(i); changed = True; break
        if cur[0] != cur[-1]:
            if len(cur) >= 3: cur.append(cur[0])   # close a ring that was cut by the query box
            else: continue
        if len(cur) >= 4: rings.append(cur)
    return rings


def inside(pt, ring):
    x, y = pt; c = False
    for i in range(len(ring)):
        x1, y1 = ring[i]; x2, y2 = ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c


def convert(d):
    F = []
    for el in d['elements']:
        tags = el.get('tags', {}) or {}
        props = dict(tags); props['@id'] = el['type'] + '/' + str(el['id'])
        if el['type'] == 'node':
            if not tags: continue
            F.append({'type': 'Feature', 'properties': props, 'geometry': {'type': 'Point', 'coordinates': [el['lon'], el['lat']]}})
        elif el['type'] == 'way':
            g = el.get('geometry') or []
            pts = [[p['lon'], p['lat']] for p in g if p]
            if len(pts) < 2: continue
            closed = pts[0] == pts[-1] and len(pts) >= 4
            if is_area(tags, closed): geom = {'type': 'Polygon', 'coordinates': [pts]}
            else: geom = {'type': 'LineString', 'coordinates': pts}
            F.append({'type': 'Feature', 'properties': props, 'geometry': geom})
        elif el['type'] == 'relation':
            if tags.get('type') not in ('multipolygon', 'boundary'): continue
            outer = [[[p['lon'], p['lat']] for p in m.get('geometry') or [] if p] for m in el.get('members', []) if m.get('type') == 'way' and m.get('role') in ('outer', '')]
            inner = [[[p['lon'], p['lat']] for p in m.get('geometry') or [] if p] for m in el.get('members', []) if m.get('type') == 'way' and m.get('role') == 'inner']
            O = join_rings(outer); I = join_rings(inner)
            if not O: continue
            polys = [[o] for o in O]
            for r in I:
                for p in polys:
                    if inside(r[0], p[0]): p.append(r); break
            F.append({'type': 'Feature', 'properties': props, 'geometry': {'type': 'MultiPolygon', 'coordinates': polys}})
    return {'type': 'FeatureCollection', 'generator': 'overpass-api (converted)', 'features': F}


if __name__ == '__main__':
    d = json.load(open(sys.argv[1]))
    json.dump(convert(d), open(sys.argv[2], 'w'))

