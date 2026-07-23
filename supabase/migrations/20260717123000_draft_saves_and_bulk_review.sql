-- Make draft persistence atomic and independent of client-side upsert behavior.
create or replace function public.save_application_draft(p_application_id uuid,p_answers jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare caller uuid:=auth.uid(); current_status public.application_status;
begin
  if caller is null then raise exception 'Please sign in again before saving.'; end if;
  select status into current_status from public.applications
    where id=p_application_id and applicant_id=caller for update;
  if current_status is null then raise exception 'This application could not be found in your account.'; end if;
  if current_status not in ('draft','additional_information_needed') then
    raise exception 'This application is no longer editable.';
  end if;

  insert into public.application_answers(application_id,question_key,value,updated_at)
  select p_application_id,key,to_jsonb(value),now()
  from jsonb_each_text(coalesce(p_answers,'{}'::jsonb))
  where nullif(trim(value),'') is not null
  on conflict(application_id,question_key) do update
    set value=excluded.value,updated_at=excluded.updated_at;

  update public.applications set updated_at=now() where id=p_application_id;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe)
  values(caller,'application_draft_saved','application',p_application_id::text,
    jsonb_build_object('field_count',(select count(*) from jsonb_each_text(coalesce(p_answers,'{}'::jsonb)) where nullif(trim(value),'') is not null)));
end $$;
revoke all on function public.save_application_draft(uuid,jsonb) from public,anon;
grant execute on function public.save_application_draft(uuid,jsonb) to authenticated;

-- Keep bulk review audited by routing every selected application through the
-- existing transition function. Its status trigger queues one applicant email.
create or replace function public.bulk_transition_applications(
  p_application_ids uuid[],p_new_status public.application_status,p_reason text,p_applicant_note text default null
) returns table(application_id uuid,changed boolean,error_message text)
language plpgsql security definer set search_path=public as $$
declare app_id uuid;
begin
  if auth.uid() is null or not (public.has_role('program_admin') or public.has_role('super_admin')) then
    raise exception 'Not authorized.';
  end if;
  if coalesce(array_length(p_application_ids,1),0)=0 then raise exception 'Select at least one application.'; end if;
  if array_length(p_application_ids,1)>250 then raise exception 'Bulk updates are limited to 250 applications.'; end if;
  foreach app_id in array p_application_ids loop
    begin
      perform public.staff_transition_application(app_id,p_new_status,p_reason,p_applicant_note);
      application_id:=app_id; changed:=true; error_message:=null; return next;
    exception when others then
      application_id:=app_id; changed:=false; error_message:=sqlerrm; return next;
    end;
  end loop;
end $$;
revoke all on function public.bulk_transition_applications(uuid[],public.application_status,text,text) from public,anon;
grant execute on function public.bulk_transition_applications(uuid[],public.application_status,text,text) to authenticated;
