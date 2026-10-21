-- Hosted development integration test. All fixture data is synthetic and rolled back.
begin;
set local statement_timeout = '30s';
create temporary table media_test_context(a uuid, b uuid, path_a text, path_b text);
insert into media_test_context(a,b) values(gen_random_uuid(),gen_random_uuid());
update media_test_context set path_a=a::text||'/media-test/a.png',path_b=b::text||'/media-test/b.png';
grant select on media_test_context to authenticated,anon;
insert into auth.users(id,aud,role,email)
select id,'authenticated','authenticated','sat-media-fixture-'||id||'@example.invalid'
from (select a id from media_test_context union all select b from media_test_context) s;
insert into sat_private.exam_assets(path,owner_id,content_type,data)
select path_a,a,'image/png',decode('89504e470d0a1a0a','hex') from media_test_context
union all select path_b,b,'image/jpeg',decode('ffd8ffd9','hex') from media_test_context;

create function pg_temp.media_assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION: %',message; end if; end $$;
create function pg_temp.media_expect_error(statement text, expected text) returns void language plpgsql as $$
declare caught text;
begin
 begin execute statement; exception when others then caught:=sqlerrm; end;
 if caught is null or position(expected in caught)=0 then
  raise exception 'Expected error containing %, got %',expected,coalesce(caught,'SUCCESS');
 end if;
end $$;

-- Even the fixture author must obey path ownership, MIME type and size constraints.
select pg_temp.media_expect_error(format(
 'insert into sat_private.exam_assets values(%L,%L,''image/png'',decode(''01'',''hex''))',
 (select a::text||'/wrong.png' from media_test_context),(select b from media_test_context)), 'check constraint');
select pg_temp.media_expect_error(format(
 'insert into sat_private.exam_assets values(%L,%L,''image/svg+xml'',decode(''01'',''hex''))',
 (select a::text||'/wrong.svg' from media_test_context),(select a from media_test_context)), 'check constraint');
select pg_temp.media_expect_error(format(
 'insert into sat_private.exam_assets values(%L,%L,''image/png'',decode('''',''hex''))',
 (select a::text||'/empty.png' from media_test_context),(select a from media_test_context)), 'check constraint');

set local role authenticated;
select set_config('request.jwt.claim.sub',(select a::text from media_test_context),true);
select pg_temp.media_assert(
 (public.sat_exam_asset(path_a)->>'contentType')='image/png'
 and decode(public.sat_exam_asset(path_a)->>'base64','base64')=decode('89504e470d0a1a0a','hex'),
 'A receives exactly its own MIME type and bytes') from media_test_context;
select pg_temp.media_expect_error(format('select public.sat_exam_asset(%L)',path_b),'Asset unavailable') from media_test_context;
select pg_temp.media_expect_error('select public.sat_exam_asset(''missing/path.png'')','Asset unavailable');
select pg_temp.media_expect_error('select public.sat_exam_asset(null)','Asset unavailable');
select pg_temp.media_expect_error(format('select public.sat_exam_asset(%L)',a::text||'/../'||b::text||'/media-test/b.png'),'Asset unavailable') from media_test_context;
select pg_temp.media_expect_error('select public.sat_exam_asset(''x'''' OR TRUE--'')','Asset unavailable');
select pg_temp.media_expect_error('select * from sat_private.exam_assets','permission denied');
select pg_temp.media_expect_error('insert into sat_private.exam_assets(path,owner_id,content_type,data) values(''x'',gen_random_uuid(),''image/png'',decode(''01'',''hex''))','permission denied');
select pg_temp.media_expect_error('update sat_private.exam_assets set content_type=''image/jpeg''','permission denied');
select pg_temp.media_expect_error('delete from sat_private.exam_assets','permission denied');

select set_config('request.jwt.claim.sub',(select b::text from media_test_context),true);
select pg_temp.media_assert(
 (public.sat_exam_asset(path_b)->>'contentType')='image/jpeg'
 and decode(public.sat_exam_asset(path_b)->>'base64','base64')=decode('ffd8ffd9','hex'),
 'B receives its own bytes') from media_test_context;
select pg_temp.media_expect_error(format('select public.sat_exam_asset(%L)',path_a),'Asset unavailable') from media_test_context;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.media_expect_error(format('select public.sat_exam_asset(%L)',path_a),'Authentication required') from media_test_context;

reset role;
set local role anon;
select pg_temp.media_expect_error(format('select public.sat_exam_asset(%L)',path_a),'permission denied') from media_test_context;
select pg_temp.media_expect_error('select * from sat_private.exam_assets','permission denied');
select pg_temp.media_expect_error('delete from sat_private.exam_assets','permission denied');
reset role;
select 'PASS: media ownership, authenticated/anonymous permissions, byte integrity and input constraints' as result;
rollback;
