import rail from "~/data/skytrain/network.json";
import additions from "~/data/skytrain/extensions.json";
import records from "~/data/skytrain/events.json";
import observations from "~/data/skytrain/history.json";
import evidence from "~/data/skytrain/sources.json";
import collection from "~/data/skytrain/health.json";

export const statuses: Record<string,string> = {operating:"Operating",construction:"Under construction",approved:"Approved, awaiting construction",proposed:"Proposed",unknown:"No record for this date"};
export const lines:Record<string,string>={expo:"Expo",millennium:"Millennium",canada:"Canada",study:"Separate line (study)"};
export const colors:Record<string,string>={expo:"#224da3",millennium:"#c88a09",canada:"#008178",study:"#85628c"};
export const stations=[...rail.stations,...additions.stations];
export const connections=[...rail.connections,...additions.connections];
export const segments=[...rail.segments,...additions.segments];
export const projects=additions.projects;
export interface NewsEvent {id:string;published:string;firstSeen:string;effective:string|null;title:string;summary:string;stations:string[];lines:string[];projects:string[];segments:string[];sources:string[]}
export const events:NewsEvent[]=[...records].sort((a,b)=>b.published.localeCompare(a.published)||a.id.localeCompare(b.id));
export const history=observations;
export const sources:Record<string,{url:string;publisher:string;authority:boolean;label?:string}>=evidence;
export const health: {coverageStart:string;lastAttempt:string;lastSuccessful:string|null;seededAt:string;outcome:string;sources:Record<string,{ok:boolean;checked:string;lastOK:string|null;note?:string}>;gaps:string[]}=collection;
export const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Vancouver",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export const dayText=(s:string)=>new Date(s+"T12:00:00Z").toLocaleDateString("en-CA",{timeZone:"UTC",month:"short",day:"numeric",year:"numeric"});
export const bound=(s:string)=>s.length===7?new Date(Date.UTC(+s.slice(0,4),+s.slice(5),0)).toISOString().slice(0,10):s;
const chronological=[...history].sort((a,b)=>bound(b.effective).localeCompare(bound(a.effective)));
export const project=(id:string)=>projects.find(p=>p.id===id)!;
export const station=(id:string)=>stations.find(p=>p.id===id);
export const stationName=(id:string)=>station(id)?.name??id;
export const segName=(s:typeof segments[number])=>s.ends.length?s.ends.map(stationName).join(" → "):project(s.project).name;
export function observation(entity:{id:string;project:string},day:string){
  const available=chronological.filter(h=>bound(h.effective)<=day);
  const direct=available.find(h=>h.targets.includes(entity.id));
  const inherited=available.find(h=>h.targets.includes(entity.project));
  // An opening of a project is not a blanket opening of every station. Network is a dated service inventory.
  if(connections.some(c=>c.id===entity.id)&&entity.project!=="network"){
    if(direct)return direct;
    if(inherited && ["operating","construction"].includes(inherited.state))return undefined;
  }
  return direct??inherited;
}
export function related(e:typeof events[number],id:string):boolean {
  const seg=segments.find(s=>s.id===id);
  if(seg)return (e.segments as string[]).includes(id);
  return e.stations.includes(id)||e.projects.includes(id);
}
export function escape(s:string){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!))}
export function citations(ids:string[]){return [...new Set(ids)].map(k=>{const s=sources[k];return s?'<a class="evidence" href="'+escape(s.url)+'" title="'+escape(s.publisher)+'" target="_blank" rel="noopener">'+escape(s.label??s.publisher)+' ↗</a>':""}).join(" ")}
