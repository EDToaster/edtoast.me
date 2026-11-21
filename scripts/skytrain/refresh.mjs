/** Pure candidate merge + validation; no web access, credentials or git writes. */
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {isDeepStrictEqual as equal} from "node:util";
import {pathToFileURL} from "node:url";
export const dir="src/data/skytrain/", names=["network","extensions","sources","events","history","review","health"];
const file=n=>dir+n+".json", read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
export const load=()=>Object.fromEntries(names.map(n=>[n,read(file(n))]));
export const registry=()=>read("docs/skytrain/registry.json");
const demand=(b,msg)=>{if(!b)throw Error(msg)};
const ymd=s=>typeof s==="string"&&/^\d{4}-\d\d-\d\d$/.test(s)&&new Date(s+"T12:00Z").toISOString().slice(0,10)===s;
const instant=s=>typeof s==="string"&&/Z$|[+-]\d\d:\d\d$/.test(s)&&Number.isFinite(Date.parse(s));
const date=s=>ymd(s)||(/^\d{4}-(0[1-9]|1[012])$/.test(s));
const unique=xs=>{const ids=xs.map(r=>r.id);demand(ids.every(x=>typeof x==="string"&&x.length)&&new Set(ids).size===ids.length,"missing/duplicate stable ID");return new Set(ids)};
const basis={operating:"passenger-service",construction:"physical-construction",approved:"construction-funding",proposed:"documented-proposal"};
const trusted=u=>/(^|\.)(translink\.ca|gov\.bc\.ca|gc\.ca|canada\.ca|surrey\.ca|vancouver\.ca|ubc\.ca|portcoquitlam\.ca|broadwaysubway\.ca|northshoreconnects\.ca|cnv\.org|yvr\.ca)$/.test(new URL(u).hostname);
export function validate(db){
 const {network:n,extensions:x,sources,events,history,review,health}=db;
 for(const s of Object.values(sources)){const u=new URL(s.url);demand(u.protocol==="https:"&&!u.username&&!u.password&&typeof s.publisher==="string"&&typeof s.authority==="boolean","invalid source");if(s.authority)demand(trusted(s.url),"unrecognized authority: "+s.url)}
 const sts=[...n.stations,...x.stations],ss=unique(sts),cs=[...n.connections,...x.connections],segs=[...n.segments,...x.segments],ps=unique(x.projects),segIDs=unique(segs),all=unique([...sts,...cs,...segs,...x.projects]);
 const ls=new Set(["expo","millennium","canada","study"]);
 const pt=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>48.9&&p[0]<49.6&&p[1]>-123.6&&p[1]<-122.3;
 const refs=(arr,set)=>Array.isArray(arr)&&arr.every(k=>set.has(k));
 const proof=r=>demand(r.sources?.length&&r.sources.every(k=>Object.hasOwn(sources,k)),"missing evidence for "+r.id);
 for(const st of sts)demand(pt(st.at)&&st.name,"invalid station "+st.id);
 for(const p of x.projects){proof(p);demand(typeof p.archive==="boolean"&&(ls.has(p.line)||p.line===""),"invalid project "+p.id)}
 for(const c of cs)demand(ss.has(c.station)&&ls.has(c.line)&&ps.has(c.project),"orphan connection "+c.id);
 for(const s of segs)demand(refs(s.ends,ss)&&ls.has(s.line)&&ps.has(s.project)&&s.path?.length>=2&&s.path.every(pt),"invalid segment "+s.id);
 const eids=unique(events), fingerprints=new Set();
 for(const e of events){proof(e);demand(ymd(e.published)&&instant(e.firstSeen)&&(e.effective===null||date(e.effective))&&e.title&&e.summary&&refs(e.stations,ss)&&refs(e.segments,segIDs)&&refs(e.projects,ps)&&refs(e.lines,ls),"invalid event "+e.id);
 const f=[e.published,e.title.trim().toLowerCase()].join("|");demand(!fingerprints.has(f),"duplicate publication: "+e.id);fingerprints.add(f)}
 unique(history);for(const h of history){proof(h);demand(h.targets.length&&refs(h.targets,all)&&date(h.effective)&&h.basis===basis[h.state]&&h.sources.some(k=>sources[k].authority)&&(h.event===null||eids.has(h.event))&&h.note,"unsupported observation "+h.id)}
 unique(review);for(const r of review){proof(r);demand(r.reason&&instant(r.firstSeen)&&refs(r.projects,ps),"invalid review "+r.id)}
 demand(instant(health.lastAttempt)&&(!health.lastSuccessful||instant(health.lastSuccessful))&&ymd(health.coverageStart),"invalid collection time");
 return db;
}
function upsert(arr,adds=[]){for(const r of adds){const old=arr.find(t=>t.id===r.id);if(old){demand(equal(old,r),"existing record changed: "+r.id);continue}arr.push(r)}}
export function merge(old,candidate){
 const db=structuredClone(old),{checkedAt,checks}=candidate;demand(instant(checkedAt)&&Date.parse(checkedAt)>=Date.parse(old.health.lastAttempt),"invalid or older attempt");
 for(const [k,s] of Object.entries(candidate.sources??{})){demand(!db.sources[k]||equal(db.sources[k],s),"source ID collision");db.sources[k]=s}
 for(const k of ["events","history","review"])upsert(db[k],candidate[k]);
 for(const k of ["stations","projects","segments","connections"])upsert(db.extensions[k],candidate.extensions?.[k]);
 for(const h of candidate.history??[])if(!old.history.some(x=>x.id===h.id)){
   demand(h.event&&h.evidenceText&&h.evidenceText.length>=15,"new status requires a linked event and brief source passage");
   if(h.state==="operating"){
     demand(ymd(h.effective)&&h.effective<=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Vancouver"}).format(new Date(checkedAt)),"future or imprecise opening");
     demand(!/expected|anticipat|scheduled|projected|planned|will open|testing|not (yet )?open/i.test(h.evidenceText)&&/now open|opened (?:to|for)|began (?:carrying|passenger)|passenger service (?:began|started)|open to (?:the public|passengers|customers)/i.test(h.evidenceText),"opening not explicitly confirmed");
   }
 }
 const ids=registry().map(r=>r.id);
 demand(checks&&equal(Object.keys(checks).sort(),[...ids].sort()),"each registry source needs a result");
 for(const id of ids){const r=checks[id];demand(typeof r.ok==="boolean"&&r.note?.trim(),"invalid check "+id);const prev=db.health.sources[id];db.health.sources[id]={ok:r.ok,checked:checkedAt,lastOK:r.ok?checkedAt:prev?.lastOK??null,note:r.note}}
 const ok=ids.filter(id=>checks[id].ok).length;
 const added=db.events.length-old.events.length;db.health.lastAttempt=checkedAt;
 if(ok===ids.length)db.health.lastSuccessful=checkedAt;
 db.health.outcome=ok===0?"Sources could not be checked":ok<ids.length?"Partial collection":added?"Verified updates":"No new updates";
 return validate(db)
}
function guard(base){
 const git=(...args)=>execFileSync("git",args,{encoding:"utf8",maxBuffer:16e6});
 const changed=[...new Set([...git("diff","--name-only",base,"--").trim().split("\n"),...git("ls-files","--others","--exclude-standard").trim().split("\n")].filter(Boolean))];
 demand(changed.every(p=>names.map(file).includes(p)),"non-data diff: "+changed);
 const db=validate(load());const before=Object.fromEntries(names.map(n=>[n,JSON.parse(git("show",base+":"+file(n)))]));
 for(const k of ["events","history","review"]){for(const r of before[k])demand(db[k].some(u=>equal(u,r)),"lost or changed "+k+" "+r.id)}
 for(const [k,s] of Object.entries(before.sources))demand(equal(s,db.sources[k]),"lost evidence "+k);
 for(const k of ["network","extensions"])for(const field of ["stations","connections","segments",...(k==="extensions"?["projects"]:[])])for(const r of before[k][field])demand(db[k][field].some(x=>x.id===r.id),"lost "+k+" "+r.id);
 const added=db.history.filter(h=>!before.history.some(x=>x.id===h.id));
 // The same assertion gate applies even if JSON was edited without the candidate helper.
 const checks=Object.fromEntries(registry().map(r=>[r.id,db.health.sources[r.id]??{}]));
 merge(before,{checkedAt:db.health.lastAttempt,checks,sources:db.sources,events:db.events.filter(e=>!before.events.some(x=>x.id===e.id)),history:added,extensions:Object.fromEntries(["stations","connections","projects","segments"].map(k=>[k,db.extensions[k].filter(r=>!before.extensions[k].some(x=>x.id===r.id))]))});
 if(Object.values(checks).some(c=>!c.ok))demand(db.health.lastSuccessful===before.health.lastSuccessful,"partial run advanced checkpoint");
 console.log(changed.length+" allowlisted file(s); prior records retained");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const [action,arg]=process.argv.slice(2);
 if(action==="guard")guard(arg||"HEAD");
 else if(action==="apply"){const old=load(),db=merge(old,read(arg));for(const n of names)if(!equal(old[n],db[n]))fs.writeFileSync(file(n),JSON.stringify(db[n],null,2)+"\n");console.log(db.health.outcome)}
 else if(action==="validate"){validate(load());console.log("Tracker data valid")}
 else throw Error("Use validate | apply /absolute/candidate.json | guard <base-sha>");
}
