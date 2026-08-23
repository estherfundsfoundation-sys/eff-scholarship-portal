begin;
do $$
declare v_constraint text;
begin
  select c.conname into v_constraint from pg_constraint c
  where c.conrelid='public.applyall_common_submissions'::regclass and c.contype='u'
  and pg_get_constraintdef(c.oid) like '%common_application_id%institution_id%' limit 1;
  if v_constraint is null then raise exception 'Common application delivery uniqueness constraint not found'; end if;
  if v_constraint <> 'applyall_common_submissions_common_application_id_institution_i' then
    execute format('alter table public.applyall_common_submissions rename constraint %I to %I',v_constraint,'applyall_common_submissions_common_application_id_institution_i');
  end if;
end $$;
commit;
