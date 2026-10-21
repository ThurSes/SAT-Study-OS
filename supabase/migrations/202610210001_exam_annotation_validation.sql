create or replace function public.sat_exam_command(p_command jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
    if jsonb_typeof(x) is distinct from 'object' or not(x ?& array['blockId','style','start','end']) or
       jsonb_typeof(x->'blockId') is distinct from 'string' or jsonb_typeof(x->'style') is distinct from 'string' or
       jsonb_typeof(x->'start') is distinct from 'number' or jsonb_typeof(x->'end') is distinct from 'number' then
      raise exception 'Invalid annotation';
    end if;
    if (x->>'start')::numeric <> trunc((x->>'start')::numeric) or
       (x->>'end')::numeric <> trunc((x->>'end')::numeric) or
       (x->>'start')::numeric < 0 or (x->>'end')::numeric > 100000 then raise exception 'Invalid annotation'; end if;
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
