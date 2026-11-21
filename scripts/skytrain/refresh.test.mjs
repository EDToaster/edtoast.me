import test from "node:test";
import assert from "node:assert/strict";
import {load,merge,registry,validate} from "./refresh.mjs";
const initial=load(),now="2028-01-04T15:00:00Z";
// Keep fixtures independent of tomorrow's production checkpoint.
initial.health.lastAttempt="2027-12-31T15:00:00Z";
initial.health.lastSuccessful=initial.health.lastAttempt;
const checks=(ok=true)=>Object.fromEntries(registry().map(r=>[r.id,{ok,note:ok?"Full source reviewed":"Source unavailable"}]));
const input=(more={})=>({checkedAt:now,checks:checks(),...more});
test("a replay of the same publication adds exactly one event; a distinct follow-up survives",()=>{
 const e={...initial.events[0],id:"test-opening-report",title:"Confirmed opening",published:"2028-01-02",firstSeen:now};
 const c=input({events:[e]});const once=merge(initial,c),twice=merge(once,c);
 assert.deepEqual(twice.events,once.events);assert.equal(once.events.length,initial.events.length+1);
 assert.throws(()=>merge(once,input({events:[{...e,id:"syndicated-copy"}]})),/duplicate publication/);
 assert.equal(merge(once,input({events:[{...e,id:"next-milestone",title:"Separate milestone"}]})).events.length,once.events.length+1);
});
test("source failures cannot blank history or move a successful checkpoint",()=>{
 const good=merge(initial,input());const bad=merge(good,{checkedAt:"2028-01-05T15:00:00Z",checks:checks(false),history:[],events:[]});
 for(const k of ["events","history","network","extensions","sources"])assert.deepEqual(bad[k],good[k]);
 assert.equal(bad.health.lastSuccessful,good.health.lastSuccessful);assert.equal(bad.health.sources.broadway.lastOK,now);assert.equal(bad.health.outcome,"Sources could not be checked");
 const c=checks();c.poco.ok=false;const e={...initial.events[0],id:"independent",title:"Unrelated verified report"};
 const partial=merge(good,input({checks:c,events:[e]}));assert.ok(partial.events.some(x=>x.id==="independent"));assert.equal(partial.health.outcome,"Partial collection");
});
test("a forecast, test train, future opening or political commitment is not passenger service",()=>{
 const h={id:"test-status",targets:["millennium:broadway-city-hall"],state:"operating",basis:"passenger-service",effective:"2028-01-03",sources:["bspstations"],event:"broadway-test",note:"Opening evidence"};
 for(const s of ["The station is expected to open to passengers in 2028.","Testing is underway; trains are not yet open to passengers.","The Mayor committed to the extension."])
 assert.throws(()=>merge(initial,input({history:[{...h,evidenceText:s}]})),/opening not explicitly/);
 assert.throws(()=>merge(initial,input({history:[{...h,effective:"2028-01-05",evidenceText:"The station is now open to passengers."}]})),/future/);
 const changed=merge(initial,input({history:[{...h,evidenceText:"The station is now open to passengers."}]}));assert.deepEqual(changed.history.at(-1).targets,["millennium:broadway-city-hall"]);
});
test("unknown entity references and altered old evidence fail closed",()=>{
 assert.throws(()=>merge(initial,input({events:[{...initial.events[0],id:"bad-entity",stations:["not-a-station"]}]})),/invalid event/);
 assert.throws(()=>merge(initial,input({events:[{...initial.events[0],title:"Rewritten"}]})),/existing record changed/);
 validate(initial);
});
