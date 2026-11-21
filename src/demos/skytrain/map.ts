import L from "leaflet";
import "leaflet/dist/leaflet.css";
import geo from "./geography.json";
import { stations,connections,segments,projects,lines,colors,observation,segName,escape } from "./model";
const dashes:Record<string,string|undefined>={construction:"9 6",approved:"11 4 2 4",proposed:"1 7"};
const places:[string,number,number][]=[["VANCOUVER",49.244,-123.129],["BURNABY",49.247,-122.967],["RICHMOND",49.155,-123.128],["SURREY",49.166,-122.863],["COQUITLAM",49.275,-122.805],["NORTH SHORE",49.323,-123.079],["LANGLEY",49.09,-122.66],["BURRARD INLET",49.303,-122.962],["STRAIT OF GEORGIA",49.207,-123.252]];
type Point=L.LatLngTuple;
export function atlasMap(select:(id:string)=>void){
 const map=L.map("railmap",{zoomControl:false,attributionControl:false,scrollWheelZoom:false,zoomSnap:.1,zoomDelta:.75,minZoom:9,maxZoom:17,maxBounds:[[48.98,-123.58],[49.48,-122.35]],maxBoundsViscosity:.8});
 L.control.zoom({position:"topright"}).addTo(map);
 L.control.scale({position:"bottomleft",imperial:false,maxWidth:80}).addTo(map);
 map.createPane("terrain").style.zIndex="220"; map.createPane("placenames").style.zIndex="320";map.createPane("labels").style.zIndex="590";
 const renderer=L.canvas({pane:"terrain",padding:.4});
 // Batch the static basemap into three paths rather than thousands of interactive layers.
 const groups=new Map<string,any[]>();
 for(const f of geo.features){const key=f.properties.kind;if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(f.geometry.coordinates)}
 for(const [k,coords] of groups){L.geoJSON({type:"Feature",properties:{},geometry:{type:k==="transportation"?"MultiLineString":"MultiPolygon",coordinates:coords}} as any,{pane:"terrain",interactive:false,style:()=>({renderer,pane:"terrain",interactive:false,stroke:k==="transportation",weight:.8,color:"#d5d1c5",opacity:.72,fill:k!=="transportation",fillColor:k==="water"?"#c7dedc":"#dfe5d0",fillOpacity:1})}).addTo(map)}
 const geography=L.layerGroup().addTo(map), tracks=L.layerGroup().addTo(map), dots=L.layerGroup().addTo(map), labels=L.layerGroup().addTo(map);
 function fit(){map.fitBounds([[49.102,-123.255],[49.313,-122.651]],{padding:[18,23],animate:false})}fit();
 let visible:typeof stations=[], selected="", corridorLabels:[string,number,number][]=[];
 const hubs=["waterfront","broadway-city-hall","metrotown","king-george","coquitlam-central","yvr-airport","langley-city-centre","arbutus","richmond-brighouse","commercial-broadway","lougheed-town-centre","lafarge-lake-douglas","vcc-clark","bridgeport"];
 function names(){
   labels.clearLayers();geography.clearLayers();const size=map.getSize(),zoom=map.getZoom();let rects:number[][]=[];
   const taken=(r:number[])=>r[0]<2||r[2]>size.x-2||r[1]<2||r[3]>size.y-2||rects.some(q=>r[0]<q[2]&&r[2]>q[0]&&r[1]<q[3]&&r[3]>q[1]);
   const rank=(id:string)=>id===selected?-2:hubs.includes(id)?hubs.indexOf(id):100;
   const sorted=[...visible].sort((a,b)=>rank(a.id)-rank(b.id));
   for(const s of sorted){
     const pt=map.latLngToContainerPoint(s.at as Point);if(zoom<11.5&&rank(s.id)>=100)continue;
     const w=s.name.length*(zoom>=13?6.5:5.9)+6;
     for(const [dx,dy] of [[7,-15],[7,1],[-w-8,-15],[-w-8,1],[2,-22]]){
       const r=[pt.x+dx,pt.y+dy,pt.x+dx+w,pt.y+dy+15];if(taken(r))continue;
       rects.push(r);L.marker(s.at as Point,{pane:"labels",interactive:false,keyboard:false,icon:L.divIcon({className:"atlas-label",html:escape(s.name),iconAnchor:[-dx,-dy],iconSize:[w,15]})}).addTo(labels);break;
     }
   }
   for(const [name,lat,lon] of [...corridorLabels,...places]){const p=map.latLngToContainerPoint([lat,lon]),w=name.length*6.9;const r=[p.x-w/2,p.y-6,p.x+w/2,p.y+6];if(taken(r))continue;rects.push(r);L.marker([lat,lon],{pane:"placenames",interactive:false,keyboard:false,icon:L.divIcon({className:"atlas-place",html:name,iconSize:[w,14],iconAnchor:[w/2,7]})}).addTo(geography)}
 }
 map.on("moveend zoomend resize",names);
 const indexDist=(p:string)=>projects.find(v=>v.id===p)?.archive;
 function draw(q:URLSearchParams,day:string){
   tracks.clearLayers();dots.clearLayers();selected=q.get("selected")??"";
   const line=q.get("line"),status=q.get("status");const match=(s:{id:string;project:string;line:string})=>{const state=observation(s,day)?.state;return !!state&&(!line||line===s.line)&&(!status||status===state)&&(!indexDist(s.project)||q.has("studies"))};
   const shown=segments.filter(match);
   const areas:Record<string,[string,number,number]>={ubcx:["UBC",49.270,-123.248],newton:["NEWTON",49.13,-122.845],poco:["PORT COQUITLAM",49.254,-122.765]};
   corridorLabels=shown.flatMap(s=>areas[s.project]?[areas[s.project]]:[]);
   // Casing the shared Expo/Millennium pair preserves both identities at all zooms.
   for(const s of [...shown].sort((a,b)=>Number(b.line==="expo")-Number(a.line==="expo"))){
     const state=observation(s,day)!.state;const other=shown.find(t=>t.line!==s.line&&t.ends.length===2&&s.ends.length===2&&t.ends.every(id=>s.ends.includes(id)));
     const width=other?(s.line==="expo"?9:3):state==="operating"?4.2:4.6;
     const path=s.path as Point[];
     if(selected===s.id)L.polyline(path,{weight:width+7,color:"#322e29",opacity:.45,interactive:false}).addTo(tracks);
     L.polyline(path,{color:colors[s.line],weight:width,dashArray:dashes[state],lineCap:"round",opacity:.96,interactive:false}).addTo(tracks);
     const hit=L.polyline(path,{color:"#000",weight:14,opacity:0,bubblingMouseEvents:false}).on("click",()=>select(s.id)).addTo(tracks);
     hit.bindTooltip(escape(segName(s))+" · "+lines[s.line]);hit.getElement()?.setAttribute("data-segment",s.id);
   }
   const conns=connections.filter(match);visible=stations.filter(s=>conns.some(c=>c.station===s.id));
   for(const s of visible){
     const cs=conns.filter(c=>c.station===s.id);const preferred=cs.find(c=>observation(c,day)?.state==="operating")??cs[0];
     const state=observation(preferred,day)!.state;const hub=cs.length>1;
     const p=s.at as Point;
     const opts={color:hub?"#222b2f":colors[preferred.line],fillColor:state==="operating"?"#fffef9":colors[preferred.line],fillOpacity:1,weight:hub?2.5:1.8,radius:s.id===selected?7.2:hub?4.8:state==="operating"?3.5:3.7,bubblingMouseEvents:false};
     if(s.id===selected)L.circleMarker(p,{radius:11,weight:1.5,color:"#292d28",fillColor:"#fff",fillOpacity:.75,interactive:false}).addTo(dots);
     const pin=L.circleMarker(p,opts).addTo(dots).bindTooltip(escape(s.name)).on("click",()=>select(s.id));
     pin.getElement()?.setAttribute("data-station",s.id);
   }names();return {stations:visible,segments:shown};
 }
 function focus(id:string){const st=stations.find(s=>s.id===id),seg=segments.find(s=>s.id===id);if(st)map.setView(st.at as Point,Math.max(14,map.getZoom()),{animate:false});else if(seg)map.fitBounds(L.latLngBounds(seg.path as Point[]),{padding:[40,40],maxZoom:14,animate:false})}
 return {draw,fit,focus};
}
