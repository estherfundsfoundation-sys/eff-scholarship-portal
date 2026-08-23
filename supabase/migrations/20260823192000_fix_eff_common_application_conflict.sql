begin;
drop function if exists public.submit_eff_common_application(uuid,uuid[],text);
create function public.submit_eff_common_application(p_application_id uuid,p_institution_ids uuid[],p_certification_version text)
returns table(submission_id uuid,delivered_institution_id uuid,delivery_status text)
language plpgsql security invoker set search_path=public,extensions as $$
declare
  v_app public.applyall_common_applications;
  v_payload jsonb; v_hash text; v_institution uuid; v_submission uuid;
begin
  select a.* into v_app from public.applyall_common_applications a
  join public.applyall_profiles p on p.id=a.profile_id
  where a.id=p_application_id and p.user_id=auth.uid() for update;
  if v_app.id is null then raise exception 'Application not found'; end if;
  if v_app.legal_name is null or v_app.date_of_birth is null or v_app.essay is null then raise exception 'Complete all required application fields'; end if;
  if coalesce(array_length(p_institution_ids,1),0)=0 then raise exception 'Select at least one participating college'; end if;
  v_payload=to_jsonb(v_app)-'created_at'-'updated_at';
  v_hash=encode(digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');
  foreach v_institution in array p_institution_ids loop
    if not exists(select 1 from public.applyall_institutions i where i.id=v_institution and i.active and i.eff_member_status='ACTIVE' and i.eff_receiver_enabled) then raise exception 'One or more schools are not verified EFF participating institutions'; end if;
    insert into public.applyall_common_submissions(common_application_id,institution_id,profile_id,snapshot,snapshot_hash,certification_version,authorized_at)
    values(v_app.id,v_institution,v_app.profile_id,v_payload,v_hash,p_certification_version,now())
    on conflict on constraint applyall_common_submissions_common_application_id_institution_id_key do nothing returning id into v_submission;
    if v_submission is null then select s.id into v_submission from public.applyall_common_submissions s where s.common_application_id=v_app.id and s.institution_id=v_institution; end if;
    submission_id:=v_submission; delivered_institution_id:=v_institution; delivery_status:='DELIVERED'; return next;
  end loop;
  update public.applyall_common_applications set status='SUBMITTED',certification_version=p_certification_version,certified_at=now(),submitted_at=now(),updated_at=now() where id=v_app.id;
end $$;
commit;
