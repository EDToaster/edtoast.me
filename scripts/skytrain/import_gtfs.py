"""Import the five full SkyTrain service patterns. No bus, ferry or commuter rail.
Usage: python scripts/skytrain/import_gtfs.py ARCHIVED_ZIP OUT.json
Feed shape and parent IDs are provenance; rider-facing IDs survive GTFS renumbering.
"""
import csv, io, json, re, sys, zipfile
from collections import Counter, defaultdict

def load(archive):
    def rows(name):
        return csv.DictReader(io.TextIOWrapper(archive.open(name+'.txt'),encoding='utf-8-sig'))
    routes={r['route_id']:r['route_long_name'].split()[0].lower() for r in rows('routes')
            if r['route_type']=='1' and r['route_long_name'] in ('Expo Line','Millennium Line','Canada Line')}
    ends={'expo':['King George','Production Way-University'],'millennium':['Lafarge Lake-Douglas'],'canada':['YVR-Airport','Richmond-Brighouse']}
    patterns=Counter()
    example={}
    for t in rows('trips'):
        line=routes.get(t['route_id'])
        if line:
            for end in ends[line]:
                if t['trip_headsign'].endswith('To '+end):
                    k=line,end,t['shape_id']
                    patterns[k]+=1
                    example[k]=t['trip_id']
    chosen=[max((k for k in patterns if k[:2]==(line,end)),key=patterns.get) for line in ends for end in ends[line]]
    trips={example[k]:k for k in chosen}
    shapes=defaultdict(list); ordered=defaultdict(list)
    shape_ids={k[2] for k in chosen}
    for p in rows('shapes'):
        if p['shape_id'] in shape_ids:
            shapes[p['shape_id']].append((int(p['shape_pt_sequence']),[float(p['shape_pt_lat']),float(p['shape_pt_lon'])]))
    for t in rows('stop_times'):
        if t['trip_id'] in trips: ordered[t['trip_id']].append((int(t['stop_sequence']),t['stop_id']))
    stops={r['stop_id']:r for r in rows('stops')}
    stations={}; segments={}; connections={}
    for k in chosen:
        line,end,shape=k
        points=[p for _,p in sorted(shapes[shape])]
        prev=None; cursor=0; last_point=None
        for _,platform in sorted(ordered[example[k]]):
            parent=stops[platform]['parent_station']; s=stops[parent]
            name=s['stop_name'].removesuffix(' Station')
            sid=re.sub('[^a-z0-9]+','-',name.lower()).strip('-')
            ll=[float(s['stop_lat']),float(s['stop_lon'])]
            if sid in stations and stations[sid]['gtfs']!=parent: raise ValueError('Ambiguous physical station: '+sid)
            stations[sid]=dict(id=sid,name=name,at=ll,gtfs=parent)
            cid=line+':'+sid
            connections[cid]=dict(id=cid,station=sid,line=line,project='network')
            def project(i):
                a,b=points[i:i+2]; y,x=b[0]-a[0],b[1]-a[1]
                t=max(0,min(1,((ll[0]-a[0])*y+.426*(ll[1]-a[1])*x)/(y*y+.426*x*x or 1)))
                p=[round(a[0]+t*y,6),round(a[1]+t*x,6)]
                return (p[0]-ll[0])**2+.426*(p[1]-ll[1])**2,i+t,p
            _,ix,point=min(project(i) for i in range(int(cursor),len(points)-1))
            if prev:
                if ix<=cursor: raise ValueError('Non-monotonic shape: '+sid)
                key=f'{line}:{prev}~{sid}'
                segments[key]=dict(id=key,line=line,project='network',ends=[prev,sid],path=[last_point,*points[int(cursor)+1:int(ix)+1],point],shape=shape)
            cursor=ix;prev=sid;last_point=point
    assert len(stations)>=53 and len(chosen)==5
    return dict(feed=next(rows('feed_info'))['feed_version'],stations=list(stations.values()),connections=list(connections.values()),segments=list(segments.values()))
if __name__=='__main__':
    with zipfile.ZipFile(sys.argv[1]) as f, open(sys.argv[2],'w') as out: json.dump(load(f),out,ensure_ascii=False,separators=(',',':'));out.write('\n')
