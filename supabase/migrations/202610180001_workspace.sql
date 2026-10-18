-- Apply in the hosted project's SQL Editor. No reset, local database or service key.
begin;
create schema if not exists sat_private;
revoke all on schema sat_private from public, anon, authenticated;

create table public.sat_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  target_score integer check (target_score between 400 and 1600),
  timezone text not null default 'America/Sao_Paulo' check (timezone = 'America/Sao_Paulo')
);
create table public.sat_study_items (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object' and payload->>'id' = id::text and payload->>'userId' = user_id::text),
  check (payload ?& array['id','userId','skillId','title','date','time','durationMinutes','status','personalDifficulty','notes','resource']),
  check (jsonb_typeof(payload->'title') = 'string' and jsonb_typeof(payload->'notes') = 'string' and jsonb_typeof(payload->'skillId') = 'string'),
  check ((payload->>'date')::date is not null and payload->>'time' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  check (payload->>'status' in ('planned', 'in_progress', 'completed')),
  check (char_length(payload->>'title') between 1 and 160 and char_length(payload->>'notes') <= 4000),
  check ((payload->>'durationMinutes')::integer between 1 and 1440)
);
create table public.sat_assessments (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object' and payload->>'id' = id::text),
  check (payload ?& array['id','title','date','origin','readingWriting','math']),
  check (jsonb_typeof(payload->'title') = 'string' and char_length(payload->>'title') between 1 and 120 and (payload->>'date')::date is not null),
  check (payload->>'origin' in ('official_self_reported', 'printed_estimate')),
  check ((payload->>'readingWriting')::integer between 200 and 800 and (payload->>'math')::integer between 200 and 800)
);
create table public.sat_lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (char_length(lesson_id) between 1 and 100),
  completed boolean not null default false,
  notes text not null default '' check (char_length(notes) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create table sat_private.questions (
  id uuid not null,
  version integer not null check (version > 0),
  document jsonb not null,
  option_id text not null,
  explanation text not null,
  primary key (id, version)
);
create table public.sat_practice_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null,
  question_version integer not null,
  skill_id text not null,
  option_id text not null,
  correct boolean not null,
  created_at timestamptz not null default now(),
  foreign key (question_id, question_version) references sat_private.questions(id, version),
  unique (id, user_id)
);
create table public.sat_errors (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null unique,
  question_id uuid not null,
  question_version integer not null,
  skill_id text not null,
  question_text text not null,
  given_answer text not null,
  correct_answer text not null,
  explanation text not null,
  cause text not null default 'unknown' check (cause in ('reading', 'concept', 'attention', 'unknown')),
  reflection text not null default '' check (char_length(reflection) <= 2000),
  review_due_date date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  foreign key (attempt_id, user_id) references public.sat_practice_attempts(id, user_id) on delete cascade,
  unique (id, user_id)
);
create table public.sat_error_reviews (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  error_id uuid not null,
  reviewed_at timestamptz not null default now(),
  foreign key (error_id, user_id) references public.sat_errors(id, user_id) on delete cascade
);
create index on public.sat_study_items(user_id);
create index on public.sat_assessments(user_id, created_at desc);
create index on public.sat_practice_attempts(user_id, created_at desc);
create index on public.sat_errors(user_id, review_due_date);
create index on public.sat_error_reviews(user_id, error_id);

alter table public.sat_profiles enable row level security;
alter table public.sat_study_items enable row level security;
alter table public.sat_assessments enable row level security;
alter table public.sat_lesson_progress enable row level security;
alter table public.sat_practice_attempts enable row level security;
alter table public.sat_errors enable row level security;
alter table public.sat_error_reviews enable row level security;
alter table sat_private.questions enable row level security;

create policy own_profile on public.sat_profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy own_study on public.sat_study_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_assessments on public.sat_assessments for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_lessons on public.sat_lesson_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_attempts on public.sat_practice_attempts for select to authenticated using ((select auth.uid()) = user_id);
create policy own_errors_read on public.sat_errors for select to authenticated using ((select auth.uid()) = user_id);
create policy own_errors_reflect on public.sat_errors for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_reviews on public.sat_error_reviews for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.sat_profiles, public.sat_study_items, public.sat_assessments, public.sat_lesson_progress, public.sat_practice_attempts, public.sat_errors, public.sat_error_reviews from anon, authenticated;
grant select, insert, update, delete on public.sat_profiles, public.sat_study_items, public.sat_assessments, public.sat_lesson_progress to authenticated;
grant select on public.sat_practice_attempts, public.sat_errors, public.sat_error_reviews to authenticated;
grant update (cause, reflection) on public.sat_errors to authenticated;

create function public.sat_submit_practice(p_request_id uuid, p_question_id uuid, p_version integer, p_option_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  q sat_private.questions%rowtype;
  a public.sat_practice_attempts%rowtype;
  correct_text text;
  given_text text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into q from sat_private.questions where id = p_question_id and version = p_version;
  if not found then raise exception 'Question unavailable'; end if;
  select item->>'text' into given_text from jsonb_array_elements(q.document->'options') item where item->>'id' = p_option_id;
  select item->>'text' into correct_text from jsonb_array_elements(q.document->'options') item where item->>'id' = q.option_id;
  if given_text is null or correct_text is null then raise exception 'Invalid option'; end if;
  insert into public.sat_practice_attempts(id, user_id, question_id, question_version, skill_id, option_id, correct)
    values (p_request_id, uid, q.id, q.version, q.document->>'skillId', p_option_id, p_option_id = q.option_id)
    on conflict (id) do nothing;
  select * into a from public.sat_practice_attempts where id = p_request_id;
  if a.user_id <> uid or a.question_id <> q.id or a.question_version <> q.version or a.option_id <> p_option_id then raise exception 'Request conflict'; end if;
  if not a.correct then
    insert into public.sat_errors(id,user_id,attempt_id,question_id,question_version,skill_id,question_text,given_answer,correct_answer,explanation)
      values (a.id,uid,a.id,q.id,q.version,a.skill_id,concat_ws(E'\n\n',q.document->>'passage',q.document->>'prompt'),given_text,correct_text,q.explanation)
      on conflict (attempt_id) do nothing;
  end if;
  return jsonb_build_object('attemptId',a.id,'correct',a.correct,'correctAnswer',correct_text,'explanation',q.explanation,'errorId',case when a.correct then null else a.id end);
end;
$$;
revoke all on function public.sat_submit_practice(uuid,uuid,integer,text) from public, anon;
grant execute on function public.sat_submit_practice(uuid,uuid,integer,text) to authenticated;

create function public.sat_review_error(p_error_id uuid, p_event_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); existing public.sat_error_reviews%rowtype;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  perform id from public.sat_errors where id = p_error_id and user_id = uid for update;
  if not found then raise exception 'Record unavailable'; end if;
  insert into public.sat_error_reviews(id,user_id,error_id) values (p_event_id,uid,p_error_id) on conflict (id) do nothing;
  select * into existing from public.sat_error_reviews where id = p_event_id;
  if existing.user_id <> uid or existing.error_id <> p_error_id then raise exception 'Request conflict'; end if;
  return p_event_id;
end;
$$;
revoke all on function public.sat_review_error(uuid,uuid) from public, anon;
grant execute on function public.sat_review_error(uuid,uuid) to authenticated;
commit;
