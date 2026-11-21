"""One-off offline cartography. pip install requests shapely mapbox-vector-tile
python scripts/skytrain/basemap.py > src/demos/skytrain/geography.json
Contains only generalized water, parks and major roads. OpenStreetMap / ODbL.
"""
import concurrent.futures, math, json, requests, mapbox_vector_tile as mvt
from shapely.geometry import shape, box, mapping
from shapely.ops import unary_union
Z=10
def xy(lon,lat):
    return (lon+180)/360*2**Z, (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**Z
def coord(x,y):
    return (round(x/2**Z*360-180,5),round(math.degrees(math.atan(math.sinh(math.pi*(1-2*y/2**Z)))),5))
west,south,east,north=-123.38,49.035,-122.54,49.41
t= requests.get('https://tiles.openfreemap.org/planet',timeout=20).json()['tiles'][0]
l,b=xy(west,south);r,u=xy(east,north)
def tile(key):
    x,y=key;res=requests.get(t.format(z=Z,x=x,y=y),timeout=30);res.raise_for_status()
    decoded=mvt.decode(res.content,default_options={'y_coord_down':True,'transformer':lambda a,b:coord(x+a/4096,y+b/4096)})
    clip=box(*coord(x,y+1),*coord(x+1,y)).intersection(box(west,south,east,north))
    out=[]
    for layer in ['water','landcover','transportation']:
        for f in decoded.get(layer,{}).get('features',[]):
            cls=f['properties'].get('class')
            if layer=='landcover' and cls!='wood':continue
            if layer=='transportation' and cls not in ('motorway','trunk','primary'):continue
            g=shape(f['geometry'])
            if not g.is_valid:g=g.buffer(0)
            g=g.intersection(clip)
            if not g.is_empty: out.append((layer,g))
    return out
with concurrent.futures.ThreadPoolExecutor(6) as pool:
    parts=sum(pool.map(tile,[(x,y) for x in range(int(l),int(r)+1) for y in range(int(u),int(b)+1)]),[])
def rounded(obj):
    if isinstance(obj,(tuple,list)):return [rounded(x) for x in obj]
    if isinstance(obj,float):return round(obj,5)
    return obj
features=[]
for kind in ['landcover','water','transportation']:
    g=unary_union([s for k,s in parts if k==kind]).simplify(.00035,preserve_topology=True)
    for geom in getattr(g,'geoms',[g]):
        if geom.geom_type not in ['Polygon','LineString']:continue
        if kind=='landcover' and geom.area<.000045:continue
        if kind=='water' and geom.area<.000002:continue
        if kind=='transportation' and geom.length<.001:continue
        geo=mapping(geom)
        features.append({'type':'Feature','properties':{'kind':kind},'geometry':{'type':geo['type'],'coordinates':rounded(geo['coordinates'])}})
print(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':')))
