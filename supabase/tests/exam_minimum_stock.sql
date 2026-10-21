-- Exactly the 147 reserved items, including scarce domain/format quotas.
-- Unscored selection must not steal scored stock from a later module.
begin;
set local statement_timeout='120s';
create temporary table exam_stock_owner(id uuid);
insert into exam_stock_owner values(gen_random_uuid());
insert into auth.users(id,aud,role,email) select id,'authenticated','authenticated',id||'@example.invalid' from exam_stock_owner;
insert into sat_private.exam_questions(id,version,owner_id,document,key,reviewed,source_hash)
select id,1,owner,jsonb_build_object('id',id,'version',1,'section',sec,'domain',dom,'format',fmt,
 'difficulty','medium','skillId','synthetic-stock','passage','[]'::jsonb,
 'content','[{"id":"prompt","type":"text","text":"Synthetic stock fixture."}]'::jsonb,
 'options',case when fmt='numeric' then '[]'::jsonb else '[{"id":"a","label":"A","content":[{"id":"a","type":"text","text":"One"}]}]'::jsonb end,
 'provenance','{"kind":"original","label":"Synthetic stock fixture"}'::jsonb),
 jsonb_build_object('accepted',jsonb_build_array(case when fmt='numeric' then '1' else 'a' end),'explanation','Synthetic solution.'),true,'synthetic-stock'
from (select gen_random_uuid() id,o.id owner,d.*,n from exam_stock_owner o cross join (values
 ('rw','information-and-ideas','multiple-choice',20),('rw','craft-and-structure','multiple-choice',27),
 ('rw','expression-of-ideas','multiple-choice',15),('rw','standard-english-conventions','multiple-choice',19),
 ('math','algebra','multiple-choice',21),('math','algebra','numeric',6),
 ('math','advanced-math','multiple-choice',15),('math','advanced-math','numeric',6),
 ('math','problem-solving-and-data-analysis','multiple-choice',6),('math','problem-solving-and-data-analysis','numeric',3),
 ('math','geometry-and-trigonometry','multiple-choice',9)
) d(sec,dom,fmt,stock) cross join lateral generate_series(1,d.stock) n) fixtures;
do $$ declare p jsonb; i integer; n integer; begin
 for i in 1..12 loop
  p:=sat_private.exam_prepare((select id from exam_stock_owner),('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid);
  if p is null then raise exception 'Exact valid stock rejected for seed %',i; end if;
  select count(distinct q->'question'->>'id') into n from jsonb_each(p) pool cross join lateral jsonb_array_elements(pool.value) q;
  if n<>147 then raise exception 'Expected 147 unique reserved items, got %',n; end if;
 end loop;
end $$;
rollback;
select 'PASS: exact stock supports every module and both branches for twelve seeds; all fixtures rolled back.' as verification;
