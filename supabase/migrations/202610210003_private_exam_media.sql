-- Developer-imported media stays private without requiring an administrative web key.
create table sat_private.exam_assets (
 path text primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 content_type text not null check(content_type in ('image/png','image/jpeg')),
 data bytea not null check(octet_length(data) between 1 and 2097152),
 check(split_part(path,'/',1)=owner_id::text),
 check(path !~ '\.\.' and path ~ '^[a-zA-Z0-9/_\-.]+$')
);
alter table sat_private.exam_assets enable row level security;
revoke all on sat_private.exam_assets from public,anon,authenticated;
create function public.sat_exam_asset(p_path text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select jsonb_build_object('contentType',a.content_type,'base64',encode(a.data,'base64')) into result
 from sat_private.exam_assets a where a.path=p_path and a.owner_id=uid;
 if result is null then raise exception 'Asset unavailable'; end if;
 return result;
end; $$;
revoke all on function public.sat_exam_asset(text) from public,anon;
grant execute on function public.sat_exam_asset(text) to authenticated;
