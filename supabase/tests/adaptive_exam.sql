-- Run as postgres in the hosted development SQL Editor after adaptive migrations.
-- Every fixture is synthetic, private to generated test users, and rolled back.
-- Role changes exercise actual grants/RLS; admin is used only for fixtures/time control.
begin;
set local statement_timeout = '120s';
create temporary table exam_test_context(a uuid, b uuid, last_attempt uuid);
insert into exam_test_context values(gen_random_uuid(),gen_random_uuid(),null);
grant select,update on exam_test_context to authenticated;
insert into auth.users(id,aud,role,email)
select id,'authenticated','authenticated','sat-exam-fixture-'||id||'@example.invalid'
from (select a id from exam_test_context union all select b from exam_test_context) u;

create function pg_temp.check_true(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION: %',message; end if; end $$;
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
declare caught text;
begin
 begin execute statement; exception when others then caught:=sqlerrm; end;
 if caught is null or caught not like '%'||expected||'%' then
  raise exception 'Expected error containing %, got %',expected,coalesce(caught,'SUCCESS');
 end if;
end $$;

-- Deliberately no copyrighted/existing content. Extra rows allow all six pools.
insert into sat_private.exam_questions(id,version,owner_id,document,key,reviewed,source_hash)
select id,1,a,jsonb_build_object('id',id,'version',1,'section',sec,'domain',dom,'skillId','fixture-'||dom,
 'difficulty',(array['easy','medium','hard'])[1+(n%3)],'format',fmt,
 'passage',jsonb_build_array(jsonb_build_object('id','passage','type','text','text','Synthetic fixture passage.')),
 'content',jsonb_build_array(jsonb_build_object('id','prompt','type','text','text','Synthetic fixture question.')),
 'options',case when fmt='numeric' then '[]'::jsonb else '[{"id":"a","text":"One"},{"id":"b","text":"Two"},{"id":"c","text":"Three"},{"id":"d","text":"Four"}]'::jsonb end,
 'provenance',jsonb_build_object('kind','original','label','Synthetic integration fixture'),
 'correctAnswer','MUST_NOT_LEAK','explanation','MUST_NOT_LEAK'),
 jsonb_build_object('accepted',jsonb_build_array(case when fmt='numeric' then '1/2' else 'a' end),'explanation','Synthetic fixture explanation.'),true,'synthetic-integration-fixture'
from (select gen_random_uuid() id,c.a,d.sec,d.dom,f.fmt,n
 from exam_test_context c cross join (values
 ('rw','information-and-ideas'),('rw','craft-and-structure'),('rw','expression-of-ideas'),('rw','standard-english-conventions'),
 ('math','algebra'),('math','advanced-math'),('math','problem-solving-and-data-analysis'),('math','geometry-and-trigonometry')) d(sec,dom)
 cross join (values('multiple-choice'),('numeric')) f(fmt) cross join generate_series(1,30) n
 where d.sec='math' or f.fmt='multiple-choice') fixtures;

-- Pure correction and bank composition. No client ever calls these private helpers.
do $$ declare p jsonb; seed uuid:=gen_random_uuid(); pool record; q jsonb; seen_count integer; begin
 p:=sat_private.exam_prepare((select a from exam_test_context),seed);
 perform pg_temp.check_true(p is not null,'fixture covers every path');
 perform pg_temp.check_true(p=sat_private.exam_prepare((select a from exam_test_context),seed),'seed deterministic');
 select count(distinct item->'question'->>'id') into seen_count from jsonb_each(p) pools cross join lateral jsonb_array_elements(pools.value) item;
 perform pg_temp.check_true(seen_count=147,'147 globally unique reserved question IDs');
 for pool in select * from jsonb_each(p) loop
  perform pg_temp.check_true(jsonb_array_length(pool.value)=case when pool.key like 'rw%' then 27 else 22 end,'module size '||pool.key);
  perform pg_temp.check_true((select count(*) from jsonb_array_elements(pool.value) x where not (x->>'scored')::boolean)=2,'two unscored per pool');
  perform pg_temp.check_true((select count(*) from jsonb_array_elements(pool.value) x where x->'question'->>'format'='numeric')=case when pool.key like 'rw%' then 0 else 5 end,'five numeric Math items');
  for q in select x from jsonb_array_elements(pool.value) x loop
   perform pg_temp.check_true(not ((q->'question') ?| array['key','correctAnswer','explanation','scored']),'editorial solution excluded');
  end loop;
 end loop;
 q:='{"question":{"format":"numeric"},"key":{"accepted":["1/2",".333"]}}';
 perform pg_temp.check_true(sat_private.exam_correct(q,'0.5') and sat_private.exam_correct(q,'2/4'),'equivalent rational');
 perform pg_temp.check_true(sat_private.exam_correct(q,'.333') and not sat_private.exam_correct(q,'.334'),'explicit rounded answers only');
 perform pg_temp.check_true(not sat_private.exam_correct(q,'1/0') and not sat_private.exam_correct(q,null) and not sat_private.exam_correct(q,''),'blank and zero denominator');
 perform pg_temp.check_true(sat_private.exam_rational('123456') is null and sat_private.exam_rational('-12345') is not null and sat_private.exam_rational('2,5') is null and sat_private.exam_rational('50%') is null,'numeric input limits');
end $$;

-- Four real RPC journeys. Correct counts straddle the 65% cutoff (RW 16/17, Math 12/13).
-- The non-scored answers are correct but must not affect routing or score.
do $$
declare uid uuid:=(select a from exam_test_context); other_uid uuid:=(select b from exam_test_context);
 rw_count integer; math_count integer; s jsonb; command jsonb; response jsonb; plan jsonb;
 aid uuid; sec text; item record; req uuid; answer jsonb; target integer; expected_route text;
correct_total integer; errors_before integer; all_questions integer; qid text; snapshot_revision integer; annotation jsonb;
begin
 for rw_count in 16..17 loop
  for math_count in 12..13 loop
   perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
   execute 'set local role authenticated';
   command:=jsonb_build_object('operation','start','requestId',gen_random_uuid());
   s:=public.sat_exam_command(command); aid:=(s->>'attemptId')::uuid;
   response:=public.sat_exam_command(command);
   perform pg_temp.check_true(response->>'attemptId'=aid::text and response->>'revision'=s->>'revision','start retry same attempt');
   perform pg_temp.check_true(s->>'status'='in_progress' and s->>'phase'='rw1','starts RW1');
   perform pg_temp.check_true(s->'result'='null'::jsonb and not(s ?| array['plan','key','routes','scored','seed']),'active snapshot hides key/route');
   perform pg_temp.check_true(s::text not like '%MUST_NOT_LEAK%','editorial metadata does not leak');
   -- Direct RPC clients must obey the same annotation contract as the UI.
   for annotation in select x from jsonb_array_elements('[
    {"blockId":"prompt","start":0,"end":3},
    {"blockId":"prompt","start":0,"end":3,"style":null},
    {"blockId":"prompt","start":"0","end":"3","style":"highlight"},
    {"blockId":"prompt","start":0.5,"end":3,"style":"highlight"},
    {"blockId":"prompt","start":0,"end":9999,"style":"highlight"},
    {"blockId":"missing","start":0,"end":3,"style":"highlight"}
   ]'::jsonb) x loop
    answer:='{"value":null,"marked":false,"eliminated":[],"notes":"","observedMs":0}'::jsonb||jsonb_build_object('annotations',jsonb_build_array(annotation));
    perform pg_temp.expect_error(format('select public.sat_exam_command(%L::jsonb)',jsonb_build_object('operation','save','requestId',gen_random_uuid(),'attemptId',aid,'expectedRevision',s->'revision','questionId',s->'questions'->0->>'id','answer',answer)),'Invalid annotation');
   end loop;
   perform pg_temp.expect_error(format('select public.sat_exam_command(%L::jsonb)',jsonb_build_object('operation','start','requestId',gen_random_uuid())),'already active');
   execute 'reset role';
   select a.plan into plan from sat_private.exam_attempts a where id=aid;
   update exam_test_context set last_attempt=aid;
   for sec in select unnest(array['rw','math']) loop
    target:=case sec when 'rw' then rw_count else math_count end;
    if sec='math' then
     update sat_private.exam_attempts set started_at=clock_timestamp()-interval '74 minutes' where id=aid;
     execute 'set local role authenticated';
     s:=public.sat_exam_command(jsonb_build_object('operation','sync','requestId',gen_random_uuid(),'attemptId',aid));
     perform pg_temp.check_true(s->>'phase'='math1','resumed across interval into Math1');
     execute 'reset role';
    end if;
    for item in select x,row_number() over(order by ord) ordinal from jsonb_array_elements(plan->(sec||'1')) with ordinality e(x,ord) where (x->>'scored')::boolean loop
     if item.ordinal>target then continue; end if;
     answer:=sat_private.exam_empty_answer()||jsonb_build_object('value',case when item.x->'question'->>'format'='numeric' then '2/4' else 'a' end,'observedMs',1000);
     command:=jsonb_build_object('operation','save','requestId',gen_random_uuid(),'attemptId',aid,'expectedRevision',s->'revision','questionId',item.x->'question'->>'id','answer',answer);
     execute 'set local role authenticated';
     s:=public.sat_exam_command(command);
     response:=public.sat_exam_command(command);
     perform pg_temp.check_true(response->>'revision'=s->>'revision','save retry does not increment revision');
     perform pg_temp.expect_error(format('select public.sat_exam_command(%L::jsonb)',jsonb_set(command,'{answer,notes}','"Changed retry"')),'Request conflict');
     perform pg_temp.expect_error(format('select public.sat_exam_command(%L::jsonb)',jsonb_set(command,'{requestId}',to_jsonb(gen_random_uuid()))),'Revision conflict');
     execute 'reset role';
    end loop;
    for item in select x from jsonb_array_elements(plan->(sec||'1')) x where not (x->>'scored')::boolean loop
     answer:=sat_private.exam_empty_answer()||'{"value":"a"}';
     execute 'set local role authenticated';
     s:=public.sat_exam_command(jsonb_build_object('operation','save','requestId',gen_random_uuid(),'attemptId',aid,'expectedRevision',s->'revision','questionId',item.x->'question'->>'id','answer',answer));
     execute 'reset role';
    end loop;
    -- Wrong option and future-module IDs cannot enter the answer map.
    qid:=s->'questions'->0->>'id'; answer:=sat_private.exam_empty_answer()||'{"value":"foreign-option"}';
    execute 'set local role authenticated';
    perform pg_temp.expect_error(format('select public.sat_exam_command(%L::jsonb)',jsonb_build_object('operation','save','requestId',gen_random_uuid(),'attemptId',aid,'expectedRevision',s->'revision','questionId',qid,'answer',answer)),'Invalid');
    execute 'reset role';
    answer:=sat_private.exam_empty_answer(); qid:=plan->(sec||'2_lower')->0->'question'->>'id';
    execute 'set local role authenticated';
    perform pg_temp.expect_error(format('select public.sat_exam_command(%L::jsonb)',jsonb_build_object('operation','save','requestId',gen_random_uuid(),'attemptId',aid,'expectedRevision',s->'revision','questionId',qid,'answer',answer)),'current module');
    execute 'reset role';
    update sat_private.exam_attempts set started_at=clock_timestamp()-make_interval(secs=>case sec when 'rw' then 1920 else 6540 end) where id=aid;
    execute 'set local role authenticated';
    -- A save at expiry has an old revision and must be refused; sync performs transition.
    perform pg_temp.expect_error(format('select public.sat_exam_command(%L::jsonb)',jsonb_build_object('operation','save','requestId',gen_random_uuid(),'attemptId',aid,'expectedRevision',s->'revision','questionId',s->'questions'->0->>'id','answer',answer)),'Revision conflict');
    s:=public.sat_exam_command(jsonb_build_object('operation','sync','requestId',gen_random_uuid(),'attemptId',aid));
    perform pg_temp.check_true(s->>'phase'=sec||'2','deadline moves to second module');
    perform pg_temp.check_true(s->'result'='null'::jsonb and not(s ? 'routes'),'route still private');
    execute 'reset role';
    expected_route:=case when target=case sec when 'rw' then 17 else 13 end then 'higher' else 'lower' end;
    perform pg_temp.check_true((select routes->>sec from sat_private.exam_attempts where id=aid)=expected_route,'65% routing '||sec||' '||target);
   end loop;
   update sat_private.exam_attempts set started_at=clock_timestamp()-interval '144 minutes' where id=aid;
   execute 'set local role authenticated';
   s:=public.sat_exam_command(jsonb_build_object('operation','sync','requestId',gen_random_uuid(),'attemptId',aid));
   perform pg_temp.check_true(s->>'status'='completed' and jsonb_array_length(s->'questions')=0,'completed snapshot');
   correct_total:=rw_count+math_count;
   perform pg_temp.check_true((s->'result'->>'correct')::integer=correct_total and (s->'result'->>'total')::integer=90,'90 scored, unscored excluded');
   perform pg_temp.check_true(jsonb_array_length(s->'result'->'items')=98,'98 reviewed items');
   perform pg_temp.check_true((s->'result'->>'blank')::integer=98-correct_total-4,'blank count');
   perform pg_temp.check_true((s->'result'->>'observedMs')::integer=correct_total*1000,'observed time');
   select count(*) into errors_before from public.sat_errors where exam_attempt_id=aid;
   perform pg_temp.check_true(errors_before=98-correct_total-4,'errors linked once');
   response:=public.sat_exam_command(jsonb_build_object('operation','sync','requestId',gen_random_uuid(),'attemptId',aid));
   perform pg_temp.check_true(response->'result'=s->'result','finalization stable');
   perform pg_temp.check_true((select count(*) from public.sat_errors where exam_attempt_id=aid)=errors_before and (select count(*) from public.sat_exam_results where attempt_id=aid)=1,'finalization exactly once');
   execute 'reset role';
  end loop;
 end loop;
end $$;

-- Exact boundaries use a deterministic clock supplied only to the private function.
do $$ declare uid uuid:=(select a from exam_test_context); a sat_private.exam_attempts; t timestamptz; pair record; begin
 insert into sat_private.exam_attempts(user_id,seed,plan) values(uid,gen_random_uuid(),sat_private.exam_prepare(uid,gen_random_uuid())) returning * into a;
 t:=a.started_at;
 for pair in select * from (values (1919.999,'rw1'),(1920,'rw2'),(3839.999,'rw2'),(3840,'break'),(4439.999,'break'),(4440,'math1'),(6539.999,'math1'),(6540,'math2'),(8639.999,'math2'),(8640,'completed')) e(seconds,phase) loop
  a:=sat_private.exam_reconcile(a,t+pair.seconds*interval '1 second');
  perform pg_temp.check_true(a.phase=pair.phase,'exact boundary '||pair.seconds);
 end loop;
end $$;

-- A/B/anonymous, private media, legacy practice isolation and abandoned attempts.
insert into storage.objects(bucket_id,name) select 'sat-exam-assets',a||'/fixture.png' from exam_test_context;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true) from exam_test_context;
do $$ declare aid uuid:=(select last_attempt from exam_test_context); s jsonb; command jsonb; begin
 perform pg_temp.check_true((select count(*) from public.sat_exam_results)=5,'owner reads all completed results');
 perform pg_temp.check_true((select count(*) from storage.objects where bucket_id='sat-exam-assets')=1,'owner reads own media');
 perform pg_temp.expect_error('select * from sat_private.exam_questions','permission denied');
 perform pg_temp.expect_error('select * from sat_private.exam_attempts','permission denied');
 perform pg_temp.expect_error('select * from sat_private.exam_receipts','permission denied');
 perform pg_temp.expect_error('update public.sat_exam_results set correct=90','permission denied');
 perform pg_temp.expect_error('delete from public.sat_exam_results','permission denied');
 perform pg_temp.expect_error(format('insert into public.sat_exam_results(attempt_id,user_id,completed_at,correct,total,observed_ms,sections) values(%L,auth.uid(),now(),90,90,0,''[]'')',gen_random_uuid()),'permission denied');
 s:=public.sat_exam_command(jsonb_build_object('operation','start','requestId',gen_random_uuid()));
 perform pg_temp.expect_error(format('select public.sat_submit_practice(%L,%L,1,''a'')',gen_random_uuid(),s->'questions'->0->>'id'),'Question unavailable');
 perform pg_temp.check_true((s->'questions'->0->>'previouslySeen')::boolean,'repeated exposure identified');
 command:=jsonb_build_object('operation','abandon','requestId',gen_random_uuid(),'attemptId',s->>'attemptId','expectedRevision',s->'revision');
 s:=public.sat_exam_command(command);
 perform pg_temp.check_true(s->>'status'='abandoned' and s->'result'='null'::jsonb,'abandon no result');
 perform pg_temp.check_true(public.sat_exam_command(command)->>'status'='abandoned','abandon retry');
 perform pg_temp.check_true((select count(*) from public.sat_exam_results)=5,'abandoned excluded from results');
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true) from exam_test_context;
do $$ declare aid uuid:=(select last_attempt from exam_test_context); s jsonb; op text; begin
 perform pg_temp.check_true(not exists(select from public.sat_exam_results) and not exists(select from public.sat_errors),'B cannot read A results/errors');
 perform pg_temp.check_true(not exists(select from storage.objects where bucket_id='sat-exam-assets'),'B cannot read A media');
 for op in select unnest(array['sync','save','calculator','abandon']) loop
  perform pg_temp.expect_error(format('select public.sat_exam_command(%L::jsonb)',jsonb_build_object('operation',op,'requestId',gen_random_uuid(),'attemptId',aid,'expectedRevision',0)),'Attempt unavailable');
 end loop;
 s:=public.sat_exam_command(jsonb_build_object('operation','sync','requestId',gen_random_uuid()));
 perform pg_temp.check_true(s->>'status'='idle' and not(s->'availability'->>'ready')::boolean and (s->'availability'->>'reviewedCount')::integer=0,'B cannot use A private bank');
 perform pg_temp.expect_error(format('select public.sat_exam_command(%L::jsonb)',jsonb_build_object('operation','start','requestId',gen_random_uuid())),'insufficient');
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 perform pg_temp.expect_error('select public.sat_exam_command(''{"operation":"sync","requestId":"00000000-0000-4000-a000-000000000001"}'')','permission denied');
 perform pg_temp.expect_error('select * from public.sat_exam_results','permission denied');
 perform pg_temp.expect_error('select * from sat_private.exam_questions','permission denied');
end $$;
reset role;
select pg_temp.check_true(not public,'asset bucket private') from storage.buckets where id='sat-exam-assets';
rollback;
select 'PASS: adaptive routes, scoring, numeric, deadlines, retries, ownership, legacy isolation and media RLS. All fixtures rolled back.' as verification;
