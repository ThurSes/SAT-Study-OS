-- Run in the hosted SQL Editor after the three migrations. Synthetic users/data roll back.
begin;
insert into auth.users(id,aud,role,email) values
 ('00000000-0000-4000-a000-000000000001','authenticated','authenticated','sat-rls-a@example.invalid'),
 ('00000000-0000-4000-a000-000000000002','authenticated','authenticated','sat-rls-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}',true);
insert into public.sat_profiles(id,name) values(auth.uid(),'Synthetic A');
insert into public.sat_lesson_progress(user_id,lesson_id,completed,notes) values(auth.uid(),'lesson-test',true,'A only');
insert into public.sat_study_items(id,user_id,payload) values('00000000-0000-4000-a000-000000000011',auth.uid(),
 jsonb_build_object('id','00000000-0000-4000-a000-000000000011','userId',auth.uid(),'skillId','test','title','RLS test','date','2026-10-18','time','09:00','status','planned','notes','','durationMinutes',10,'personalDifficulty',null,'resource',null));
select public.sat_submit_practice('00000000-0000-4000-a000-000000000021','bb5d789f-5ae6-4670-a301-600e20d54e01',1,'b');
select public.sat_submit_practice('00000000-0000-4000-a000-000000000021','bb5d789f-5ae6-4670-a301-600e20d54e01',1,'b');
select public.sat_review_error('00000000-0000-4000-a000-000000000021','00000000-0000-4000-a000-000000000031');
select public.sat_review_error('00000000-0000-4000-a000-000000000021','00000000-0000-4000-a000-000000000031');
do $$ begin
 if (select count(*) from public.sat_practice_attempts) <> 1 or (select count(*) from public.sat_errors) <> 1 or (select count(*) from public.sat_error_reviews) <> 1 then raise exception 'Retry duplicated records'; end if;
 begin perform * from sat_private.questions; raise exception 'Private key leaked'; exception when insufficient_privilege then null; end;
 begin update public.sat_errors set correct_answer='tampered'; raise exception 'Original answer writable'; exception when insufficient_privilege then null; end;
 begin update public.sat_practice_attempts set correct=true; raise exception 'Grade writable'; exception when insufficient_privilege then null; end;
 begin
  perform public.sat_submit_practice('00000000-0000-4000-a000-000000000021','bb5d789f-5ae6-4670-a301-600e20d54e01',1,'a');
  raise exception 'Idempotency accepted changed answer';
 exception when raise_exception then if sqlerrm <> 'Request conflict' then raise; end if; end;
end $$;
select public.sat_simulator_event('00000000-0000-4000-a000-000000000041',null,'{"type":"read"}');
select public.sat_simulator_event('00000000-0000-4000-a000-000000000042',0,'{"type":"start"}');
select public.sat_simulator_event('00000000-0000-4000-a000-000000000043',1,'{"type":"select","questionId":"bb5d789f-5ae6-4670-a301-600e20d54e01","optionId":"b"}');
select public.sat_simulator_event('00000000-0000-4000-a000-000000000044',2,'{"type":"toggle-review","questionId":"bb5d789f-5ae6-4670-a301-600e20d54e01"}');
select public.sat_simulator_event('00000000-0000-4000-a000-000000000044',2,'{"type":"toggle-review","questionId":"bb5d789f-5ae6-4670-a301-600e20d54e01"}');
do $$ declare before_deadline timestamptz; s jsonb; begin
 select deadline into before_deadline from public.sat_simulator_sessions;
 s := public.sat_simulator_event('00000000-0000-4000-a000-000000000045',null,'{"type":"read"}');
 if (s->>'deadline')::timestamptz <> before_deadline or not (s->'answers'->'bb5d789f-5ae6-4670-a301-600e20d54e01'->>'markedForReview')::boolean then raise exception 'Reload or retry changed session'; end if;
 begin update public.sat_simulator_sessions set remaining_ms=300000; raise exception 'Deadline writable'; exception when insufficient_privilege then null; end;
end $$;
select public.sat_simulator_event('00000000-0000-4000-a000-000000000046',3,'{"type":"pause"}');
select public.sat_simulator_event('00000000-0000-4000-a000-000000000047',4,'{"type":"resume"}');
reset role;
update public.sat_simulator_sessions set deadline=now()-interval '1 second' where user_id='00000000-0000-4000-a000-000000000001';
set local role authenticated;
do $$ declare s jsonb; begin
 s := public.sat_simulator_event('00000000-0000-4000-a000-000000000048',5,'{"type":"select","questionId":"bb5d789f-5ae6-4670-a301-600e20d54e01","optionId":"a"}');
 if s->>'status' <> 'expired' or s->'answers'->'bb5d789f-5ae6-4670-a301-600e20d54e01'->>'optionId' <> 'b' then raise exception 'Expired answer accepted'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.sat_profiles) or exists(select 1 from public.sat_study_items) or exists(select 1 from public.sat_lesson_progress) or exists(select 1 from public.sat_practice_attempts) or exists(select 1 from public.sat_errors) or exists(select 1 from public.sat_error_reviews) or exists(select 1 from public.sat_simulator_sessions) then raise exception 'B read A'; end if;
 update public.sat_study_items set payload='{}' where id='00000000-0000-4000-a000-000000000011';
 if found then raise exception 'B updated A'; end if;
 delete from public.sat_study_items where id='00000000-0000-4000-a000-000000000011';
 if found then raise exception 'B deleted A'; end if;
 begin
  insert into public.sat_lesson_progress(user_id,lesson_id) values('00000000-0000-4000-a000-000000000001','spoof');
  raise exception 'B inserted as A';
 exception when insufficient_privilege then null; end;
 begin
  perform public.sat_review_error('00000000-0000-4000-a000-000000000021','00000000-0000-4000-a000-000000000032');
  raise exception 'B reviewed A error';
 exception when raise_exception then if sqlerrm <> 'Record unavailable' then raise; end if; end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin perform * from public.sat_study_items; raise exception 'Anonymous read'; exception when insufficient_privilege then null; end;
 begin perform public.sat_submit_practice('00000000-0000-4000-a000-000000000099','bb5d789f-5ae6-4670-a301-600e20d54e01',1,'a'); raise exception 'Anonymous RPC'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'Ownership, retry, private keys and simulator deadline checks passed; synthetic data rolled back.' as verification;
