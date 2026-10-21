import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const folder=path.join(process.cwd(),'artifacts','private-sat','http-qa');
fs.mkdirSync(folder,{recursive:true});
const root=process.cwd();
const statePath=path.join(folder,'state.json');
const sqlQuote=s=>"'"+String(s).replaceAll("'","''")+"'";
const action=process.argv[2]??'start';
if(action==='init'){
 assert(!fs.existsSync(statePath),'Existing fixture requires cleanup first');
 const rows=JSON.parse(fs.readFileSync(path.join(root,'artifacts/private-sat/publish.rows.json'),'utf8'));
 const a={id:crypto.randomUUID(),email:`sat-http-fixture-${crypto.randomUUID()}@example.invalid`,password:crypto.randomBytes(32).toString('base64url')};
 const b={id:crypto.randomUUID(),email:`sat-http-fixture-${crypto.randomUUID()}@example.invalid`,password:crypto.randomBytes(32).toString('base64url')};
 const mapping=rows.map(row=>({old:row.id,id:crypto.randomUUID()}));
 const keyMap=Object.fromEntries(mapping.map((m,i)=>[m.id,rows[i].key.accepted[0]]));
 const setup=`begin;\ninsert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,reauthentication_token,phone_change,phone_change_token) values\n${[a,b].map(u=>`('00000000-0000-0000-0000-000000000000',${sqlQuote(u.id)},'authenticated','authenticated',${sqlQuote(u.email)},extensions.crypt(${sqlQuote(u.password)},extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"purpose":"sat_http_qa"}',false,'','','','','','','','')`).join(',\n')};\ninsert into auth.identities(id,user_id,provider_id,identity_data,provider,created_at,updated_at) values\n${[a,b].map(u=>`(gen_random_uuid(),${sqlQuote(u.id)},${sqlQuote(u.id)},jsonb_build_object('sub',${sqlQuote(u.id)},'email',${sqlQuote(u.email)},'email_verified',true),'email',now(),now())`).join(',\n')};\nwith mappings as(select * from jsonb_to_recordset(${sqlQuote(JSON.stringify(mapping))}::jsonb) x(old uuid,id uuid)) insert into sat_private.exam_questions(id,version,owner_id,document,key,reviewed,source_hash) select m.id,q.version,${sqlQuote(a.id)},jsonb_set(replace(q.document::text,${sqlQuote(rows[0].owner_id)},${sqlQuote(a.id)})::jsonb,'{id}',to_jsonb(m.id::text)),q.key,q.reviewed,q.source_hash from sat_private.exam_questions q join mappings m on m.old=q.id where q.owner_id=${sqlQuote(rows[0].owner_id)};\ninsert into sat_private.exam_assets(path,owner_id,content_type,data) select replace(path,${sqlQuote(rows[0].owner_id)},${sqlQuote(a.id)}),${sqlQuote(a.id)},content_type,data from sat_private.exam_assets where owner_id=${sqlQuote(rows[0].owner_id)};\ncommit;\nselect count(*) as cloned_questions from sat_private.exam_questions where owner_id=${sqlQuote(a.id)};`;
 fs.writeFileSync(path.join(folder,'fixture.sql'),setup);
 fs.writeFileSync(statePath,JSON.stringify({a,b,keyMap},null,2));
 fs.writeFileSync(path.join(folder,'cleanup.sql'),`begin; delete from auth.users where id in(${sqlQuote(a.id)},${sqlQuote(b.id)}) and raw_user_meta_data->>'purpose'='sat_http_qa'; commit; select count(*) as remaining from auth.users where id in(${sqlQuote(a.id)},${sqlQuote(b.id)});`);
 console.log('Fixture prepared privately; credentials are never logged.');process.exit(0);
}
const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
const env={};for(const file of ['.env.example','.env.local'])if(fs.existsSync(file))for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');}
const base=env.NEXT_PUBLIC_SUPABASE_URL;
const apikey=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const save=()=>fs.writeFileSync(statePath,JSON.stringify(state,null,2));
async function request(endpoint,token,body,method='POST'){
 const res=await fetch(base+endpoint,{method,headers:{apikey,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 const text=await res.text();let data;try{data=JSON.parse(text);}catch{data={message:'Non-JSON response'};}
 return {status:res.status,ok:res.ok,data};
}
async function login(user){
 if(user.token)return;
 const r=await request('/auth/v1/token?grant_type=password',null,{email:user.email,password:user.password});
 assert(r.ok,`Synthetic authentication failed (${r.status}): ${r.data.msg??r.data.message??r.data.error_code}`);
 user.token=r.data.access_token;user.refresh=r.data.refresh_token;save();
}
async function rpc(user,command){return request('/rest/v1/rpc/sat_exam_command',user?.token,{p_command:command});}
function safeActive(snapshot){
 if(snapshot.status!=='in_progress')return;
 for(const key of ['result'])assert.equal(snapshot[key],null,'No result during exam');
 function scan(v){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){assert(!['key','accepted','explanation','correctAnswer','scored','routes','route','plan','source_hash'].includes(k),`Private field leaked: ${k}`);scan(x);}}
 scan(snapshot);
}
const cmd=(operation,extra={})=>({operation,requestId:crypto.randomUUID(),...extra});
const answer=value=>({value,marked:false,eliminated:[],notes:'Synthetic HTTP persistence check',annotations:[],observedMs:500});
async function sync(){const r=await rpc(state.a,cmd('sync',{attemptId:state.attemptId}));assert(r.ok,`Sync failed: ${r.data.message}`);safeActive(r.data);state.snapshot=r.data;save();return r.data;}
async function fill(s,all){
 for(const q of (all?s.questions:s.questions.slice(0,1))){
  const r=await rpc(state.a,cmd('save',{attemptId:s.attemptId,expectedRevision:s.revision,questionId:q.id,answer:answer(state.keyMap[q.id])}));
  assert(r.ok,`Save failed: ${r.data.message}`);s=r.data;safeActive(s);
 }
 state.snapshot=s;save();return s;
}
if(action==='health'){
 const r=await request('/auth/v1/health',null,undefined,'GET');assert(r.ok,`Public client reachability failed (${r.status})`);console.log('PASS public API key and hosted Auth reachability.');process.exit(0);
}
await login(state.a);await login(state.b);
if(action==='start'){
 state.expectedRoutes={rw:process.argv[3]??'higher',math:process.argv[4]??'higher'};
 assert(['higher','lower'].includes(state.expectedRoutes.rw)&&['higher','lower'].includes(state.expectedRoutes.math));
 const anon=await rpc(null,cmd('sync'));assert(!anon.ok,'Anonymous RPC blocked');
 const idleB=await rpc(state.b,cmd('sync'));assert(idleB.ok);assert.equal(idleB.data.availability.ready,false,'B cannot use A bank');
 let r=await rpc(state.a,cmd('start'));assert(r.ok,`Start failed: ${r.data.message}`);let s=r.data;safeActive(s);assert.equal(s.questions.length,27);state.attemptId=s.attemptId;save();
 const denied=await rpc(state.b,cmd('sync',{attemptId:s.attemptId}));assert(!denied.ok,'B cannot read A attempt');
 const commands=s.questions.slice(0,2).map(q=>cmd('save',{attemptId:s.attemptId,expectedRevision:s.revision,questionId:q.id,answer:answer(state.keyMap[q.id])}));
 const race=await Promise.all(commands.map(c=>rpc(state.a,c)));assert.equal(race.filter(x=>x.ok).length,1,'Exactly one concurrent update wins');
 const winnerIndex=race.findIndex(x=>x.ok),winner=race[winnerIndex],loser=race[1-winnerIndex];assert.match(loser.data.message,/Revision conflict/);
 const replay=await rpc(state.a,commands[winnerIndex]);assert(replay.ok);assert.equal(replay.data.revision,winner.data.revision,'Retry after commit does not write twice');
 const altered=structuredClone(commands[winnerIndex]);altered.answer.notes+=' changed';const rejected=await rpc(state.a,altered);assert(!rejected.ok);assert.match(rejected.data.message,/Request conflict/);
 const fresh=await sync();assert.equal(fresh.answers[commands[winnerIndex].questionId].value,state.keyMap[commands[winnerIndex].questionId]);
 await fill(fresh,state.expectedRoutes.rw==='higher');console.log('PASS HTTP: auth A/B/anon, no active key leakage, one race winner, revision conflict, post-commit retry, altered retry rejected, persistence reload.');
}else if(action==='stage'){
 const expected=process.argv[3];let s=await sync();assert.equal(s.phase,expected);assert.equal(s.questions.length,expected==='break'?0:expected.startsWith('rw')?27:22);
 if(expected!=='break')s=await fill(s,expected==='math1'&&state.expectedRoutes.math==='higher');console.log(`PASS HTTP stage ${expected}: current module only, expected question count, persisted answer.`);
}else if(action==='finish'){
 const s=await sync();assert.equal(s.status,'completed');assert.equal(s.result.total,90);assert.equal(s.result.items.length,98);assert.equal(s.result.items.filter(q=>q.scored).length,90);assert.equal(s.result.sections.length,2);assert(s.result.sections.every(x=>x.route===(state.expectedRoutes?.[x.section]??'higher')));
 const again=await sync();assert.deepEqual(again.result,s.result,'Finalization stable');
 const b=await rpc(state.b,cmd('sync',{attemptId:s.attemptId}));assert(!b.ok,'B result denied');
 state.report={status:'PASS',completed:true,reviewCount:98,scoredCount:90,correct:s.result.correct,sections:s.result.sections};save();
 const reportsPath=path.join(folder,'reports.json');const reports=fs.existsSync(reportsPath)?JSON.parse(fs.readFileSync(reportsPath,'utf8')):[];reports.push(state.report);fs.writeFileSync(reportsPath,JSON.stringify(reports,null,2));
 fs.writeFileSync(path.join(folder,'result.json'),JSON.stringify(state.report,null,2));console.log(`PASS HTTP completion: 98 reviewed / 90 scored, ${state.expectedRoutes?.rw??'higher'}/${state.expectedRoutes?.math??'higher'}, result stable, B denied.`);
}else if(action==='logout'){
 for(const u of[state.a,state.b]){const r=await request('/auth/v1/logout?scope=global',u.token);assert(r.ok,`Synthetic logout failed (${r.status})`);delete u.token;delete u.refresh;}save();console.log('Synthetic sessions revoked. Run guarded cleanup.sql, then remove state.json.');
}else throw Error('Unknown action');
