import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const compile = (path) => ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const validators={};
new Function("exports",compile("../src/lib/events/publication-validation.ts"))(validators);
const candidates={};
new Function("require","exports",compile("../src/lib/events/publication-candidates.ts"))(()=>validators,candidates);
function route({user={id:"test-account"},candidate,nearby=[],error=null}={}){
  const calls=[];
  const supabase={auth:{getUser:async()=>({data:{user},error:null})},rpc:async(name,args)=>{
    calls.push({name,args});
    if(name==="event_details")return {data:candidate?[candidate]:[],error};
    if(name==="visible_events_in_bounds")return {data:nearby,error};
    return {data:{outcome:"candidates",candidates:[]},error};
  }};
  const exports={};
  const dependencies={"next/server":{NextResponse:{json:(body,init)=>Response.json(body,init)}},"@/lib/supabase/server":{createClient:async()=>supabase},"@/lib/events/publication-validation":validators,"@/lib/events/publication-candidates":candidates};
  new Function("require","exports",compile("../src/app/api/events/publish/route.ts"))((name)=>{assert.ok(dependencies[name],name);return dependencies[name];},exports);
  return {post:exports.POST,calls};
}
const input={latitude:-0.2,longitude:-78.48,eventDate:null,startTime:"",endTime:null,endDayOffset:0,status:"active",action:"check",candidateId:null};
const request=(body,origin="http://localhost:3000")=>new Request("http://localhost:3000/api/events/publish",{method:"POST",headers:{"content-type":"application/json",origin,host:"localhost:3000"},body:JSON.stringify(body)});
test("the endpoint generates active date/start on the server and preserves indefinite ends",async()=>{
  const {post,calls}=route();
  const before=validators.quitoTimestamp(new Date());
  const response=await post(request({...input,eventDate:"2099-01-01",startTime:"23:59",endDayOffset:1}));
  const after=validators.quitoTimestamp(new Date());
  assert.equal(response.status,200);
  const args=calls.find(call=>call.name==="publish_designed_party").args;
  assert.ok([before.slice(0,10),after.slice(0,10)].includes(args.p_event_date));
  assert.ok([before.slice(11,16),after.slice(11,16)].includes(args.p_start_time));
  assert.equal(args.p_end_time,null);
  assert.equal(args.p_end_day_offset,0);
  assert.equal("user_id" in args,false);
});
test("nearby parties from yesterday are offered for confirmation, even after midnight",async()=>{
  const today=validators.quitoTimestamp(new Date()).slice(0,10);
  const yesterday=validators.shiftDate(today,-1);
  const nearby=[{id:"08b501bc-a15a-4d27-bad2-a82d9c06fccf",latitude:input.latitude+.001,longitude:input.longitude,event_date:yesterday,start_time:"23:00:00",end_time:null,end_day_offset:0,status:"active",created_at:`${yesterday}T23:00:00-05:00`}];
  for(const action of ["check","create"]){
    const {post,calls}=route({nearby});
    const response=await post(request({...input,action}));
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(result.candidates[0].id,nearby[0].id);
    assert.equal(result.outcome,action==="create"?"needs_confirmation":"candidates");
    assert.equal(calls.find(call=>call.name==="publish_designed_party").args.p_action,"check");
  }
  assert.equal(candidates.earlierOngoingCandidates([{...nearby[0],latitude:input.latitude+.003}],input,today).length,0);
  assert.equal(candidates.earlierOngoingCandidates([{...nearby[0],event_date:today}],input,today).length,0);
  assert.equal(candidates.earlierOngoingCandidates([{...nearby[0],status:"planned"}],input,today).length,0);
  const separate=route({nearby});
  assert.equal((await separate.post(request({...input,action:"create",allowSeparate:true}))).status,200);
  assert.equal(separate.calls.find(call=>call.name==="publish_designed_party").args.p_action,"create");
});
test("anonymous and cross-origin requests cannot publish",async()=>{
  const anonymous=route({user:null});
  assert.equal((await anonymous.post(request(input))).status,401);
  assert.equal(anonymous.calls.length,0);
  const foreign=route();
  assert.equal((await foreign.post(request(input,"https://other.example"))).status,403);
  assert.equal(foreign.calls.length,0);
});
test("future dates, partial times and invalid coordinates fail before publication",async()=>{
  for(const patch of [{status:"planned",eventDate:null,startTime:"22:00"},{status:"planned",eventDate:"2026-02-30",startTime:"22:00"},{endTime:"02:"},{latitude:25}]){
    const {post,calls}=route();
    assert.equal((await post(request({...input,...patch}))).status,400);
    assert.equal(calls.length,0);
  }
});
test("confirming an active party keeps its stored schedule and candidate identity",async()=>{
  const now=validators.quitoTimestamp(new Date());
  const candidate={status:"active",event_date:now.slice(0,10),start_time:"00:00:00",end_time:null,end_day_offset:0,created_at:new Date().toISOString()};
  const {post,calls}=route({candidate});
  const candidateId="08b501bc-a15a-4d27-bad2-a82d9c06fccf";
  const response=await post(request({...input,action:"confirm",candidateId}));
  assert.equal(response.status,200);
  assert.deepEqual(calls.map(c=>c.name),["event_details","publish_designed_party"]);
  assert.equal(calls[1].args.p_start_time,"00:00");
  assert.equal(calls[1].args.p_candidate_id,candidateId);
  const previousDay={...candidate,event_date:validators.shiftDate(now.slice(0,10),-1),start_time:"23:00:00"};
  const overnight=route({candidate:previousDay});
  assert.equal((await overnight.post(request({...input,action:"confirm",candidateId}))).status,200);
  assert.equal(overnight.calls[1].args.p_event_date,previousDay.event_date);
  assert.equal(overnight.calls[1].args.p_start_time,"23:00");
});
test("a changed or missing active candidate cannot be confirmed",async()=>{
  for(const candidate of [null,{status:"planned"}]){
    const {post,calls}=route({candidate});
    const response=await post(request({...input,action:"confirm",candidateId:"08b501bc-a15a-4d27-bad2-a82d9c06fccf"}));
    assert.equal(response.status,409);
    assert.equal(calls.length,1);
  }
});
