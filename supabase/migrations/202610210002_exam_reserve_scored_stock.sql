-- Reserve all scored domain/format quotas before assigning unscored items.
create or replace function sat_private.exam_prepare(uid uuid,seed uuid) returns jsonb language plpgsql set search_path='' as $$
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
  for di in 1..4 loop
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
  outplan:=outplan||jsonb_build_object(pool,entries);
 end loop;
 foreach pool in array array['rw1','rw2_lower','rw2_higher','math1','math2_lower','math2_higher'] loop
  sec:=case when pool like 'rw%' then 'rw' else 'math' end;
  domains:=case when sec='rw' then array['information-and-ideas','craft-and-structure','expression-of-ideas','standard-english-conventions'] else array['algebra','advanced-math','problem-solving-and-data-analysis','geometry-and-trigonometry'] end;
  entries:=outplan->pool;
  for j in 1..2 loop
   select q.*,exists(select 1 from sat_private.exam_exposures e where e.user_id=uid and e.question_id=q.id) as seen into rowq
    from sat_private.exam_questions q
    where q.reviewed and (q.owner_id=uid or q.owner_id is null) and not(q.id=any(used))
      and q.document->>'section'=sec and q.document->>'format'='multiple-choice'
      and not exists(select 1 from sat_private.exam_questions n where n.id=q.id and n.version>q.version and n.reviewed)
    order by seen,md5(q.id::text||seed::text||pool) limit 1;
   if not found then return null; end if;
   used:=array_append(used,rowq.id);
   entries:=entries||jsonb_build_array(jsonb_build_object('question',sat_private.exam_public_question(rowq.document)||jsonb_build_object('previouslySeen',rowq.seen),'key',rowq.key,'scored',false));
  end loop;
  -- Mix non-scored items into the module; Math difficulty increases, RW grouped by domain.
  select jsonb_agg(x order by case when sec='rw' then array_position(domains,x->'question'->>'domain') else 0 end,
   case x->'question'->>'difficulty' when 'easy' then 1 when 'medium' then 2 else 3 end,md5(x->'question'->>'id'||seed::text)) into entries from jsonb_array_elements(entries) x;
  outplan:=outplan||jsonb_build_object(pool,entries);
 end loop; return outplan;
end; $$;
