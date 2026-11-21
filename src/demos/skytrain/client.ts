import {atlasMap} from "./map";
import {stations,connections,segments,projects,events,history as changes,health,lines,statuses,project,station,segName,dayText,bound,today,observation,related,escape as h,citations} from "./model";
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const day=today();const controls=["line","status","asof","station","project","from","to","changes","studies"];
let q=new URLSearchParams(location.search);
function patch(values:Record<string,string|null>,push=true){for(const [k,v] of Object.entries(values)){if(v)q.set(k,v);else q.delete(k)}if(push)window.history.pushState(null,"",location.pathname+(q.size?"?"+q:""));render()}
const eventTitle=(e:typeof events[number])=>'<strong>'+h(e.title)+'</strong>';
const map=atlasMap(id=>patch({selected:id}));
const selectedName=(id:string)=>station(id)?.name??(segments.find(s=>s.id===id)?segName(segments.find(s=>s.id===id)!):projects.find(s=>s.id===id)?.name??id);
function showUpdates(id:string,kind:string){patch({station:kind==="station"?id:null,project:kind==="project"?id:null,segment:kind==="segment"?id:null});el("updates").scrollIntoView({block:"start"})}
function detail(date:string){
 const id=q.get("selected")??"",st=station(id),seg=segments.find(x=>x.id===id),p=projects.find(x=>x.id===id);
 const box=el("detail");box.hidden=!st&&!seg&&!p;if(box.hidden)return;
 const ent=st?connections.filter(c=>c.station===id):seg?[seg]:[{id:p!.id,project:p!.id,line:p!.line}];
 const relevant=events.filter(e=>e.published<=date&&related(e,id));
 const sources=new Set<string>();const details=ent.map(c=>{const o=observation(c,date),pr=project(c.project);(o?.sources??[]).forEach(s=>sources.add(s));pr.sources.slice(0,1).forEach(s=>sources.add(s));
 return '<li><b>'+h(lines[c.line]??"Network")+'</b> · '+h(statuses[o?.state??"unknown"])+(st&&c.project!=="network"?' · '+h(pr.name):'')+'</li>'}).join("");
 const pr=seg?project(seg.project):p;
 const note=pr?'<p>'+h(pr.detail)+'</p><p class="muted">'+h(pr.geometry)+'</p>':"";
 const recent=relevant[0];const fallback=seg&&!recent?events.find(e=>e.published<=date&&e.projects.includes(seg.project)):undefined;
 box.innerHTML='<button class="dismiss" aria-label="Close details">×</button><div class="folio">'+(st?"Station record":seg?"Route segment":"Project record")+'</div><h3>'+h(selectedName(id))+'</h3><ul>'+details+'</ul>'+note+(recent?'<p>Latest update · '+dayText(recent.published)+'<br>'+h(recent.title)+'</p>':fallback?'<p>No segment-specific report. Latest project update · '+dayText(fallback.published)+': '+h(fallback.title)+'</p>':'<p>No entity-specific news recorded by this date.</p>')+'<div>'+citations([...sources,...recent?.sources??[],...fallback?.sources??[]])+'</div><button class="viewnews">View updates ↓</button>'+(seg?'<button class="projectnews">Project updates ↓</button>':"");
 box.querySelector(".dismiss")!.addEventListener("click",()=>patch({selected:null}));box.querySelector(".viewnews")!.addEventListener("click",()=>showUpdates(id,st?"station":seg?"segment":"project"));box.querySelector(".projectnews")?.addEventListener("click",()=>showUpdates(seg!.project,"project"));
}
function log(date:string){
 const id=q.get("segment"),line=q.get("line"),st=q.get("station"),pr=q.get("project"),from=q.get("from"),to=q.get("to");
 const filtered=events.filter(e=>e.published<=date&&(!from||e.published>=from)&&(!to||e.published<=to)&&(!line||e.lines.includes(line))&&(!st||e.stations.includes(st))&&(!pr||e.projects.includes(pr))&&(!id||related(e,id))&&(!q.has("changes")||changes.some(c=>c.event===e.id&&bound(c.effective)<=date)));
 el("scope").textContent=filtered.length+" "+(filtered.length===1?"entry":"entries")+(st||pr||id?" · "+selectedName((st||pr||id)!):"")+(q.has("asof")?" · through "+dayText(date):"");
 let last="",out="";for(const e of filtered){
 if(e.published!==last){if(last)out+="</div>";out+='<div class="newsday"><h3><time datetime="'+e.published+'">'+dayText(e.published)+'</time></h3>';last=e.published}
 out+='<article data-event="'+h(e.id)+'"><div class="newsmeta">'+e.lines.map(k=>'<span class="line-dot '+h(k)+'"></span>'+h(lines[k])).join(" / ")+(changes.some(x=>x.event===e.id)?' · Status record':'')+'</div>'+eventTitle(e)+'<p>'+h(e.summary)+'</p><div>'+citations(e.sources)+'</div></article>'}
 el("timeline").innerHTML=out?out+"</div>":'<p class="emptylog">No recorded updates match this view. Reset the filters or try a wider date range.</p>';
}
function render(){const date=q.get("asof")||day;
 for(const key of controls){const c=el<HTMLInputElement>(key);if(c.type==="checkbox")c.checked=q.has(key);else c.value=q.get(key)??(key==="asof"?day:"")}
 const warn=el("historical");warn.hidden=date>=health.coverageStart;warn.textContent="Partial historical record: continuous news coverage starts "+dayText(health.coverageStart)+". Only statuses supported by evidence on or before this date are drawn.";
 const visible=map.draw(q,date);
 const idx=el("index-content");idx.innerHTML='<p>'+visible.stations.length+' physical stations · '+visible.segments.length+' segments</p>'+["Stations","Segments"].map((title,i)=>'<h3>'+title+'</h3><div>'+ (i?visible.segments.map(s=>[s.id,segName(s)]):visible.stations.map(s=>[s.id,s.name])).sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=>'<button data-entity="'+h(id)+'">'+h(name)+'</button>').join("")+'</div>').join("");
 detail(date);log(date)
}
for(const key of controls){el<HTMLInputElement>(key).addEventListener("change",e=>{const c=e.currentTarget as HTMLInputElement;const v=c.type==="checkbox"?(c.checked?"1":null):c.value;patch({[key]:key==="asof"&&v===day?null:v,...(key==="line"||key==="status"?{selected:null}:{}),...(key==="station"||key==="project"?{segment:null}:{})})})}
el("index-content").addEventListener("click",e=>{const id=(e.target as HTMLElement).closest("button")?.dataset.entity;if(id){el<HTMLDetailsElement>("index").open=false;patch({selected:id});map.focus(id);el("detail").scrollIntoView({block:"nearest"})}});
function find(){const input=el<HTMLInputElement>("search"),v=input.value.trim().toLowerCase();if(!v)return;const s=stations.find(s=>s.name.toLowerCase()===v)??stations.find(s=>s.name.toLowerCase().includes(v));if(!s){input.setCustomValidity("No matching station in the inventory.");input.reportValidity();return}input.setCustomValidity("");input.value=s.name;patch({selected:s.id,line:null,status:null});map.focus(s.id)}
el("search").addEventListener("input",()=>el<HTMLInputElement>("search").setCustomValidity(""));el("search").addEventListener("change",find);el("search").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();find()}});
el("fit").addEventListener("click",map.fit);
el("reset").addEventListener("click",()=>{q=new URLSearchParams();el<HTMLInputElement>("search").value="";patch({});map.fit()});
window.addEventListener("popstate",()=>{q=new URLSearchParams(location.search);render()});
el<HTMLInputElement>("asof").max=day;
const formatTime=(s:string)=>new Date(s).toLocaleString("en-CA",{timeZone:"America/Vancouver",dateStyle:"medium",timeStyle:"short"});
const stale=Object.entries(health.sources).filter(([,s])=>!s.ok||Date.now()-Date.parse(s.lastOK??s.checked)>48*3600000).map(([id])=>id);
el("collection-health").textContent="Last successful collection: "+(health.lastSuccessful?formatTime(health.lastSuccessful)+" Vancouver time":"not yet completed")+" · "+health.outcome+". "+(stale.length?"Stale or unavailable: "+stale.join(", ")+".":Object.keys(health.sources).length?"No stale sources at the last check.":"Seed sources checked "+formatTime(health.seededAt)+".");
render();if(q.has("selected"))map.focus(q.get("selected")!);
