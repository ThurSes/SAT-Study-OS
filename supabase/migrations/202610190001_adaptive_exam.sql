-- Additive migration. Private imported content never enters the legacy practice bank.
begin;
create table sat_private.exam_questions (
  id uuid not null, version integer not null check(version>0),
  owner_id uuid references auth.users(id) on delete cascade,
  document jsonb not null, key jsonb not null, reviewed boolean not null default false,
  source_hash text not null, primary key(id,version),
  check(document->>'id'=id::text and (document->>'version')::integer=version),
  check(document->>'section' in ('rw','math')),
  check(document->>'format' in ('multiple-choice','numeric')),
  check(document->>'difficulty' in ('easy','medium','hard')),
  check(jsonb_typeof(key->'accepted')='array' and jsonb_array_length(key->'accepted')>0),
  check(length(key->>'explanation')>0),
  check(owner_id is not null or document->'provenance'->>'kind'='original')
);
create index exam_bank_owner on sat_private.exam_questions(owner_id) where reviewed;
create table sat_private.exam_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check(status in ('in_progress','completed','abandoned')),
  revision integer not null default 0, started_at timestamptz not null default clock_timestamp(),
  phase text not null default 'rw1', seed uuid not null, rule_version text not null default 'adaptive-2026-10-v1',
  plan jsonb not null, routes jsonb not null default '{}', answers jsonb not null default '{}',
  calculator jsonb not null default '{}', result jsonb,
  unique(id,user_id)
);
create unique index one_active_exam on sat_private.exam_attempts(user_id) where status='in_progress';
create index exam_attempt_owner on sat_private.exam_attempts(user_id,started_at desc);
create table sat_private.exam_receipts (
  user_id uuid not null references auth.users(id) on delete cascade, request_id uuid not null,
  payload jsonb not null, attempt_id uuid not null,
  primary key(user_id,request_id), foreign key(attempt_id,user_id) references sat_private.exam_attempts(id,user_id) on delete cascade
);
create table sat_private.exam_exposures (
  user_id uuid not null references auth.users(id) on delete cascade, question_id uuid not null,
  primary key(user_id,question_id)
);
create table public.sat_exam_results (
  attempt_id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null, correct integer not null check(correct between 0 and 90),
  total integer not null check(total=90), observed_ms integer not null check(observed_ms>=0),
  sections jsonb not null, foreign key(attempt_id,user_id) references sat_private.exam_attempts(id,user_id) on delete cascade
);
alter table sat_private.exam_questions enable row level security;
alter table sat_private.exam_attempts enable row level security;
alter table sat_private.exam_receipts enable row level security;
alter table sat_private.exam_exposures enable row level security;
alter table public.sat_exam_results enable row level security;
revoke all on sat_private.exam_questions,sat_private.exam_attempts,sat_private.exam_receipts,sat_private.exam_exposures from public,anon,authenticated;
revoke all on public.sat_exam_results from public,anon,authenticated;
grant select on public.sat_exam_results to authenticated;
create policy own_exam_results on public.sat_exam_results for select to authenticated using(user_id=(select auth.uid()));
alter table public.sat_errors alter column attempt_id drop not null;
alter table public.sat_errors add column exam_attempt_id uuid;
alter table public.sat_errors add constraint exam_error_owner foreign key(exam_attempt_id,user_id) references sat_private.exam_attempts(id,user_id) on delete cascade;
alter table public.sat_errors add constraint one_error_source check(num_nonnulls(attempt_id,exam_attempt_id)=1);
create unique index exam_error_unique on public.sat_errors(exam_attempt_id,question_id) where exam_attempt_id is not null;
-- Existing external-result rows retain their exact meaning.
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.sat_assessments'::regclass and contype='c' and pg_get_constraintdef(oid) like '%official_self_reported%'
  loop execute format('alter table public.sat_assessments drop constraint %I',c.conname); end loop;
end; $$;
alter table public.sat_assessments add constraint assessment_origin check(payload->>'origin' in ('official_self_reported','printed_estimate','bluebook_self_reported'));

create function sat_private.exam_rational(v text) returns numeric[] language plpgsql immutable set search_path='' as $$
declare d integer;
begin
 if v is null or length(v)>(case when left(v,1)='-' then 6 else 5 end) or v !~ '^-?([0-9]+(\.[0-9]*)?|\.[0-9]+|[0-9]+/[0-9]+)$' then return null; end if;
 if position('/' in v)>0 then
  if split_part(v,'/',2)::numeric=0 then return null; end if;
  return array[split_part(v,'/',1)::numeric,split_part(v,'/',2)::numeric];
 end if;
 d:=length(split_part(v,'.',2)); return array[replace(v,'.','')::numeric,power(10::numeric,d)];
end; $$;
create function sat_private.exam_correct(q jsonb,v text) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; a numeric[]; b numeric[];
begin
 if v is null or v='' then return false; end if;
 if q->'question'->>'format'='multiple-choice' then return q->'key'->'accepted' ? v; end if;
 a:=sat_private.exam_rational(v); if a is null then return false; end if;
 for k in select jsonb_array_elements_text(q->'key'->'accepted') loop
  b:=sat_private.exam_rational(k); if b is not null and a[1]*b[2]=b[1]*a[2] then return true; end if;
 end loop; return false;
end; $$;
-- Explicit projection: editorial metadata cannot accidentally ship a solution field.
create function sat_private.exam_public_question(d jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',d->'id','version',d->'version','section',d->'section','domain',d->'domain','skillId',d->'skillId',
 'difficulty',d->'difficulty','format',d->'format','passage',coalesce(d->'passage','[]'),'content',d->'content',
 'options',coalesce(d->'options','[]'),'provenance',d->'provenance','previouslySeen',coalesce(d->'previouslySeen','false'))
$$;
create function sat_private.exam_prepare(uid uuid,seed uuid) returns jsonb language plpgsql set search_path='' as $$
declare
 pool text; sec text; dom text; domains text[]; quotas integer[]; numeric_quotas integer[];
 used uuid[]:='{}'; outplan jsonb:='{}'; entries jsonb; rowq record; di integer; j integer; countq integer; wantformat text; wantdiff text;
begin
 foreach pool in array array['rw1','rw2_lower','rw2_higher','math1','math2_lower','math2_higher'] loop
  sec:=case when pool like 'rw%' then 'rw' else 'math' end;
  domains:=case when sec='rw' then array['information-and-ideas','craft-and-structure','expression-of-ideas','standard-english-conventions'] else array['algebra','advanced-math','problem-solving-and-data-analysis','geometry-and-trigonometry'] end;
  quotas:=case when pool='rw1' then array[6,7,5,7] when sec='rw' then array[7,7,5,6] else array[7,7,3,3] end;
  numeric_quotas:=case when sec='math' then array[2,2,1,0] else array[0,0,0,0] end;
  entries:='[]';
  for di in 1..5 loop
   countq:=case when di=5 then 2 else quotas[di] end;
   for j in 1..countq loop
    dom:=case when di=5 then null else domains[di] end;
    wantformat:=case when di<5 and j<=numeric_quotas[di] then 'numeric' else 'multiple-choice' end;
    wantdiff:=case when pool like '%higher' then 'hard' when pool like '%lower' then 'easy' when j%4=0 then 'hard' when j%4=1 then 'easy' else 'medium' end;
    select q.*,exists(select 1 from sat_private.exam_exposures e where e.user_id=uid and e.question_id=q.id) as seen into rowq
     from sat_private.exam_questions q
     where q.reviewed and (q.owner_id=uid or q.owner_id is null) and not(q.id=any(used))
       and q.document->>'section'=sec and q.document->>'format'=wantformat and (dom is null or q.document->>'domain'=dom)
       and not exists(select 1 from sat_private.exam_questions n where n.id=q.id and n.version>q.version and n.reviewed)
     order by seen,case when q.document->>'difficulty'=wantdiff then 0 when q.document->>'difficulty'='medium' then 1 else 2 end,md5(q.id::text||seed::text||pool) limit 1;
    if not found then return null; end if;
    used:=array_append(used,rowq.id);
    entries:=entries||jsonb_build_array(jsonb_build_object('question',sat_private.exam_public_question(rowq.document)||jsonb_build_object('previouslySeen',rowq.seen),'key',rowq.key,'scored',di<5));
   end loop;
  end loop;
  -- Mix non-scored items into the module; Math difficulty increases, RW grouped by domain.
  select jsonb_agg(x order by case when sec='rw' then array_position(domains,x->'question'->>'domain') else 0 end,
   case x->'question'->>'difficulty' when 'easy' then 1 when 'medium' then 2 else 3 end,md5(x->'question'->>'id'||seed::text)) into entries from jsonb_array_elements(entries) x;
  outplan:=outplan||jsonb_build_object(pool,entries);
 end loop; return outplan;
end; $$;

create function sat_private.exam_empty_answer() returns jsonb language sql immutable set search_path='' as $$
 select '{"value":null,"marked":false,"eliminated":[],"notes":"","annotations":[],"observedMs":0}'::jsonb
$$;
create function sat_private.exam_finish(a sat_private.exam_attempts) returns jsonb language plpgsql set search_path='' as $$
declare p text; pool text; item jsonb; ans jsonb; review jsonb:='[]'; sections jsonb; correct boolean; n integer; blanks integer; observed integer;
begin
 foreach p in array array['rw1','rw2','math1','math2'] loop
  pool:=case p when 'rw2' then 'rw2_'||(a.routes->>'rw') when 'math2' then 'math2_'||(a.routes->>'math') else p end;
  for item in select * from jsonb_array_elements(a.plan->pool) loop
   ans:=coalesce(a.answers->(item->'question'->>'id'),sat_private.exam_empty_answer());
   correct:=sat_private.exam_correct(item,ans->>'value');
   review:=review||jsonb_build_array(jsonb_build_object('question',item->'question','answer',ans,'correct',correct,'scored',item->'scored',
    'correctAnswer',(select string_agg(value, ' or ') from jsonb_array_elements_text(item->'key'->'accepted')),'explanation',item->'key'->>'explanation','phase',p));
   if not correct then
    insert into public.sat_errors(id,user_id,exam_attempt_id,question_id,question_version,skill_id,question_text,given_answer,correct_answer,explanation)
     values(gen_random_uuid(),a.user_id,a.id,(item->'question'->>'id')::uuid,(item->'question'->>'version')::integer,item->'question'->>'skillId',
     coalesce((select string_agg(coalesce(b->>'text',b->>'latex',b->>'alt'),' ') from jsonb_array_elements((item->'question'->'passage')||(item->'question'->'content')) b),'Review question in simulator'),
     coalesce(ans->>'value','Em branco'),(select string_agg(value,' or ') from jsonb_array_elements_text(item->'key'->'accepted')),item->'key'->>'explanation') on conflict do nothing;
   end if;
  end loop;
 end loop;
 select count(*) filter(where (x->>'scored')::boolean and (x->>'correct')::boolean),count(*) filter(where x->'answer'->>'value' is null or x->'answer'->>'value'=''),coalesce(sum((x->'answer'->>'observedMs')::integer),0)
  into n,blanks,observed from jsonb_array_elements(review) x;
 select jsonb_agg(t) into sections from (select x->'question'->>'section' as section,count(*) filter(where (x->>'correct')::boolean) as correct,count(*) as total,a.routes->>(x->'question'->>'section') as route
  from jsonb_array_elements(review) x where (x->>'scored')::boolean group by x->'question'->>'section') t;
 insert into public.sat_exam_results(attempt_id,user_id,completed_at,correct,total,observed_ms,sections)
 values(a.id,a.user_id,a.started_at+interval '144 minutes',n,90,observed,sections) on conflict do nothing;
 return jsonb_build_object('correct',n,'total',90,'blank',blanks,'observedMs',observed,'sections',sections,'items',review);
end; $$;

create function sat_private.exam_reconcile(a sat_private.exam_attempts,t timestamptz) returns sat_private.exam_attempts language plpgsql set search_path='' as $$
declare elapsed numeric; nextphase text; sec text; score integer;
begin
 if a.status<>'in_progress' then return a; end if;
 elapsed:=extract(epoch from(t-a.started_at));
 foreach sec in array array['rw','math'] loop
  if elapsed>=(case sec when 'rw' then 1920 else 6540 end) and not(a.routes ? sec) then
   select count(*) into score from jsonb_array_elements(a.plan->(sec||'1')) q where (q->>'scored')::boolean and sat_private.exam_correct(q,a.answers->(q->'question'->>'id')->>'value');
   a.routes:=a.routes||jsonb_build_object(sec,case when score*100>=65*(case sec when 'rw' then 25 else 20 end) then 'higher' else 'lower' end);
  end if;
 end loop;
 nextphase:=case when elapsed<1920 then 'rw1' when elapsed<3840 then 'rw2' when elapsed<4440 then 'break' when elapsed<6540 then 'math1' when elapsed<8640 then 'math2' else 'completed' end;
 if a.phase<>nextphase then
  a.phase:=nextphase; a.revision:=a.revision+1;
  if nextphase='completed' then a.status:='completed'; a.result:=sat_private.exam_finish(a); end if;
  update sat_private.exam_attempts set phase=a.phase,status=a.status,routes=a.routes,revision=a.revision,result=a.result where id=a.id;
 end if; return a;
end; $$;

create function sat_private.exam_snapshot(a sat_private.exam_attempts,t timestamptz) returns jsonb language plpgsql set search_path='' as $$
declare qs jsonb:='[]'; ans jsonb:='{}'; pool text; item jsonb; deadline timestamptz;
begin
 if a.status='in_progress' then
  deadline:=a.started_at+make_interval(secs=>case a.phase when 'rw1' then 1920 when 'rw2' then 3840 when 'break' then 4440 when 'math1' then 6540 else 8640 end);
  if a.phase<>'break' then
   pool:=case a.phase when 'rw2' then 'rw2_'||(a.routes->>'rw') when 'math2' then 'math2_'||(a.routes->>'math') else a.phase end;
   for item in select * from jsonb_array_elements(a.plan->pool) loop
    qs:=qs||jsonb_build_array(item->'question');
    ans:=ans||jsonb_build_object(item->'question'->>'id',coalesce(a.answers->(item->'question'->>'id'),sat_private.exam_empty_answer()));
    insert into sat_private.exam_exposures values(a.user_id,(item->'question'->>'id')::uuid) on conflict do nothing;
   end loop;
  end if;
 end if;
 return jsonb_build_object('availability',jsonb_build_object('ready',true,'reviewedCount',(select count(*) from sat_private.exam_questions where reviewed and (owner_id=a.user_id or owner_id is null)),'reason',null),
 'serverNow',t,'attemptId',a.id,'revision',a.revision,'status',a.status,'phase',case when a.status='in_progress' then a.phase else null end,'deadline',deadline,
 'questions',qs,'answers',ans,'calculator',case when a.phase in ('math1','math2') then a.calculator else '{}'::jsonb end,'result',case when a.status='completed' then a.result else null end);
end; $$;

create function public.sat_exam_command(p_command jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); op text:=p_command->>'operation'; req uuid; aid uuid; a sat_private.exam_attempts%rowtype; receipt sat_private.exam_receipts%rowtype;
 t timestamptz; prepared jsonb; answer jsonb; q jsonb; qid text; pool text; x jsonb; block jsonb; ready boolean; total integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(p_command) is distinct from 'object' or length(p_command::text)>120000 or op is null or op not in ('start','sync','save','abandon','calculator') then raise exception 'Invalid command'; end if;
 req:=(p_command->>'requestId')::uuid; if req is null then raise exception 'Request ID required'; end if;
 -- Serializes starts, receipts and updates for one owner, across tabs and retries.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 aid:=(p_command->>'attemptId')::uuid;
 if op<>'sync' then
  select * into receipt from sat_private.exam_receipts where user_id=uid and request_id=req;
  if found then
   if receipt.payload<>p_command then raise exception 'Request conflict'; end if;
   select * into a from sat_private.exam_attempts where id=receipt.attempt_id and user_id=uid for update;
   t:=clock_timestamp(); a:=sat_private.exam_reconcile(a,t); return sat_private.exam_snapshot(a,t);
  end if;
 end if;
 if aid is not null then
  select * into a from sat_private.exam_attempts where id=aid and user_id=uid for update;
  if not found then raise exception 'Attempt unavailable'; end if;
 else
  select * into a from sat_private.exam_attempts where user_id=uid and status='in_progress' order by started_at desc limit 1 for update;
 end if;
 t:=clock_timestamp();
 if a.id is not null then a:=sat_private.exam_reconcile(a,t); end if;
 if op='start' then
  if a.id is not null and a.status='in_progress' then raise exception 'An attempt is already active'; end if;
  prepared:=sat_private.exam_prepare(uid,req);
  if prepared is null then raise exception 'Reviewed bank insufficient for all adaptive paths'; end if;
  insert into sat_private.exam_attempts(user_id,seed,plan,started_at) values(uid,req,prepared,clock_timestamp()) returning * into a;
 elsif op='sync' and a.id is null then
  prepared:=sat_private.exam_prepare(uid,req); ready:=prepared is not null;
  select count(*) into total from sat_private.exam_questions where reviewed and (owner_id=uid or owner_id is null);
  return jsonb_build_object('availability',jsonb_build_object('ready',ready,'reviewedCount',total,'reason',case when ready then null else 'O banco revisado ainda não cobre todos os módulos e caminhos. O treino curto continua disponível.' end),
   'serverNow',clock_timestamp(),'attemptId',null,'revision',0,'status','idle','phase',null,'deadline',null,'questions','[]'::jsonb,'answers','{}'::jsonb,'calculator','{}'::jsonb,'result',null);
 elsif op in ('save','abandon','calculator') then
  if a.id is null or aid is null or a.status<>'in_progress' then raise exception 'Attempt closed'; end if;
  if (p_command->>'expectedRevision')::integer is distinct from a.revision then raise exception 'Revision conflict; reload confirmed state'; end if;
  if op='abandon' then a.status:='abandoned';
  elsif op='calculator' then
   if a.phase not in ('math1','math2') or jsonb_typeof(p_command->'calculator') is distinct from 'object' or length((p_command->'calculator')::text)>100000 then raise exception 'Invalid calculator state'; end if;
   a.calculator:=p_command->'calculator';
  else
   if a.phase='break' then raise exception 'Module closed'; end if;
   pool:=case a.phase when 'rw2' then 'rw2_'||(a.routes->>'rw') when 'math2' then 'math2_'||(a.routes->>'math') else a.phase end;
   qid:=p_command->>'questionId';
   select item into q from jsonb_array_elements(a.plan->pool) item where item->'question'->>'id'=qid;
   if q is null then raise exception 'Question unavailable in current module'; end if;
   answer:=p_command->'answer';
   if jsonb_typeof(answer) is distinct from 'object' or not(answer ?& array['value','marked','eliminated','notes','annotations','observedMs']) or
     jsonb_typeof(answer->'marked') is distinct from 'boolean' or jsonb_typeof(answer->'notes') is distinct from 'string' or length(answer->>'notes')>4000 or
     jsonb_typeof(answer->'eliminated') is distinct from 'array' or jsonb_array_length(answer->'eliminated')>4 or
     jsonb_typeof(answer->'annotations') is distinct from 'array' or jsonb_array_length(answer->'annotations')>100 or
     jsonb_typeof(answer->'observedMs') is distinct from 'number' or (answer->>'observedMs') !~ '^[0-9]+$' or (answer->>'observedMs')::numeric>2100000 then raise exception 'Invalid answer'; end if;
   if jsonb_typeof(answer->'value') not in ('null','string') then raise exception 'Invalid answer value'; end if;
   if answer->>'value' is not null then
    if q->'question'->>'format'='numeric' then
     if sat_private.exam_rational(answer->>'value') is null then raise exception 'Invalid numeric response'; end if;
    elsif not exists(select 1 from jsonb_array_elements(q->'question'->'options') opt where opt->>'id'=answer->>'value') then raise exception 'Invalid option'; end if;
   end if;
   for x in select * from jsonb_array_elements(answer->'eliminated') loop
    if not exists(select 1 from jsonb_array_elements(q->'question'->'options') opt where opt->'id'=x) then raise exception 'Invalid eliminated option'; end if;
   end loop;
   for x in select * from jsonb_array_elements(answer->'annotations') loop
    select b into block from jsonb_array_elements((q->'question'->'passage')||(q->'question'->'content')) b where b->>'id'=x->>'blockId' and b->>'type'='text';
    if block is null or x->>'style' not in ('highlight','underline') or x->>'start' is null or x->>'end' is null or
      (x->>'start')::integer<0 or (x->>'end')::integer<=(x->>'start')::integer or (x->>'end')::integer>length(block->>'text') then raise exception 'Invalid annotation'; end if;
   end loop;
   -- Store only permitted fields, never arbitrary browser metadata.
   answer:=jsonb_build_object('value',answer->'value','marked',answer->'marked','eliminated',answer->'eliminated','notes',answer->'notes','annotations',answer->'annotations','observedMs',answer->'observedMs');
   a.answers:=a.answers||jsonb_build_object(qid,answer);
  end if;
  a.revision:=a.revision+1;
  update sat_private.exam_attempts set answers=a.answers,calculator=a.calculator,status=a.status,revision=a.revision where id=a.id;
 end if;
 if op<>'sync' then insert into sat_private.exam_receipts(user_id,request_id,payload,attempt_id) values(uid,req,p_command,a.id); end if;
 return sat_private.exam_snapshot(a,clock_timestamp());
end; $$;
revoke all on all functions in schema sat_private from public,anon,authenticated;
revoke all on function public.sat_exam_command(jsonb) from public,anon;
grant execute on function public.sat_exam_command(jsonb) to authenticated;

-- Private media: storage policy verifies account folder; no public bucket or anonymous URL.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('sat-exam-assets','sat-exam-assets',false,10485760,array['image/png','image/webp','image/svg+xml']) on conflict(id) do nothing;
create policy exam_assets_owner_read on storage.objects for select to authenticated using(bucket_id='sat-exam-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;

