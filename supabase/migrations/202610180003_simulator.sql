begin;
create table public.sat_simulator_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 0,
  status text not null default 'idle' check (status in ('idle','running','paused','expired')),
  answers jsonb not null default '{}',
  remaining_ms integer not null default 300000 check (remaining_ms between 0 and 300000),
  deadline timestamptz,
  last_request_id uuid,
  updated_at timestamptz not null default now()
);
alter table public.sat_simulator_sessions enable row level security;
create policy own_simulator on public.sat_simulator_sessions for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.sat_simulator_sessions from anon, authenticated;
grant select on public.sat_simulator_sessions to authenticated;

create function public.sat_simulator_event(p_request_id uuid, p_expected_revision integer, p_event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  s public.sat_simulator_sessions%rowtype;
  t timestamptz := clock_timestamp();
  kind text := p_event->>'type';
  initial_answers jsonb;
  qid text := p_event->>'questionId';
  opt text := p_event->>'optionId';
  q sat_private.questions%rowtype;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_request_id is null or kind is null or kind not in ('read','start','pause','resume','restart','tick','select','toggle-review') then raise exception 'Invalid event'; end if;
  select jsonb_object_agg(id::text, jsonb_build_object('question',jsonb_build_object('id',id,'version',version),'optionId',null,'markedForReview',false))
    into initial_answers from sat_private.questions where version = 1;
  if initial_answers is null or (select count(*) from jsonb_object_keys(initial_answers)) <> 5 then raise exception 'Plan unavailable'; end if;
  insert into public.sat_simulator_sessions(user_id, answers) values(uid,initial_answers) on conflict(user_id) do nothing;
  select * into s from public.sat_simulator_sessions where user_id = uid for update;
  t := clock_timestamp();
  if s.status = 'running' then
    s.remaining_ms := greatest(0, ceil(extract(epoch from (s.deadline-t))*1000)::integer);
    if s.remaining_ms = 0 then
      s.status := 'expired'; s.deadline := null;
      update public.sat_simulator_sessions set status='expired',remaining_ms=0,deadline=null where user_id=uid;
    end if;
  end if;
  if kind <> 'read' and s.last_request_id is distinct from p_request_id then
    if p_expected_revision is null or p_expected_revision <> s.revision then raise exception 'Session changed; reload'; end if;
    if kind = 'restart' then s.status := 'idle'; s.remaining_ms := 300000; s.deadline := null; s.answers := initial_answers;
    elsif s.status = 'expired' then null; -- Deadline wins even if pause/resume arrives at the boundary.
    elsif kind = 'start' and s.status = 'idle' then s.status := 'running'; s.deadline := t + s.remaining_ms * interval '1 millisecond';
    elsif kind = 'resume' and s.status = 'paused' then s.status := 'running'; s.deadline := t + s.remaining_ms * interval '1 millisecond';
    elsif kind = 'pause' and s.status = 'running' then s.status := 'paused'; s.deadline := null;
    elsif kind in ('select','toggle-review') and s.status = 'running' then
      if qid is null or not (s.answers ? qid) then raise exception 'Invalid question'; end if;
      select * into q from sat_private.questions where id::text = qid and version = (s.answers->qid->'question'->>'version')::integer;
      if not found then raise exception 'Question unavailable'; end if;
      if kind = 'select' then
        if opt is not null and not exists (select 1 from jsonb_array_elements(q.document->'options') item where item->>'id' = opt) then raise exception 'Invalid option'; end if;
        s.answers := jsonb_set(s.answers, array[qid,'optionId'], coalesce(to_jsonb(opt),'null'::jsonb));
      else s.answers := jsonb_set(s.answers, array[qid,'markedForReview'], to_jsonb(not (s.answers->qid->>'markedForReview')::boolean)); end if;
    elsif kind not in ('tick','select','toggle-review') then raise exception 'Invalid transition';
    end if;
    s.revision := s.revision + 1; s.last_request_id := p_request_id;
    update public.sat_simulator_sessions set revision=s.revision,status=s.status,answers=s.answers,remaining_ms=s.remaining_ms,deadline=s.deadline,last_request_id=s.last_request_id,updated_at=t where user_id=uid;
  end if;
  return jsonb_build_object('revision',s.revision,'status',s.status,'answers',s.answers,'remainingMs',s.remaining_ms,'deadline',s.deadline);
end;
$$;
revoke all on function public.sat_simulator_event(uuid,integer,jsonb) from public, anon;
grant execute on function public.sat_simulator_event(uuid,integer,jsonb) to authenticated;
commit;
