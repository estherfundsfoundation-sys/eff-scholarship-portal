create policy "decisions_applicant_read" on public.decisions for select to authenticated
using(exists(select 1 from public.applications a where a.id=application_id and a.applicant_id=auth.uid()));
create policy "awards_applicant_read" on public.awards for select to authenticated
using(exists(select 1 from public.applications a where a.id=application_id and a.applicant_id=auth.uid()));

create or replace function public.staff_transition_application(p_application_id uuid,p_new_status public.application_status,p_reason text,p_applicant_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); old_status public.application_status; allowed boolean:=false;
begin
  if actor is null or not (public.has_role('program_admin') or public.has_role('super_admin')) then raise exception 'Not authorized.'; end if;
  select status into old_status from public.applications where id=p_application_id for update;
  allowed:=case old_status when 'applied' then p_new_status in('review_by_admin','withdrawn') when 'review_by_admin' then p_new_status in('additional_information_needed','approved','denied','withdrawn') when 'additional_information_needed' then p_new_status in('review_by_admin','withdrawn') when 'approved' then p_new_status='archived' when 'denied' then p_new_status='archived' when 'withdrawn' then p_new_status='archived' else false end;
  if not allowed then raise exception 'That status transition is not allowed.'; end if;
  if p_new_status in('approved','denied') and nullif(trim(p_reason),'') is null then raise exception 'A decision reason is required.'; end if;
  update public.applications set status=p_new_status,updated_at=now(),archived_at=case when p_new_status='archived' then now() else archived_at end where id=p_application_id;
  if p_new_status in('approved','denied') then
    insert into public.decisions(application_id,decision,internal_reason,applicant_explanation,decided_by,confirmed_at)
    values(p_application_id,p_new_status,p_reason,nullif(trim(p_applicant_note),''),actor,now())
    on conflict(application_id) do update set decision=excluded.decision,internal_reason=excluded.internal_reason,applicant_explanation=excluded.applicant_explanation,decided_by=excluded.decided_by,confirmed_at=excluded.confirmed_at;
  end if;
  insert into public.status_history(application_id,previous_status,new_status,actor_id,reason,applicant_note) values(p_application_id,old_status,p_new_status,actor,p_reason,nullif(trim(p_applicant_note),''));
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(actor,'application_status_changed','application',p_application_id::text,jsonb_build_object('from',old_status,'to',p_new_status,'reason',p_reason));
end $$;
revoke all on function public.staff_transition_application(uuid,public.application_status,text,text) from public;
grant execute on function public.staff_transition_application(uuid,public.application_status,text,text) to authenticated;

create or replace function public.accept_award(p_application_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare caller uuid:=auth.uid(); award_row public.awards;
begin
  if caller is null then raise exception 'Please sign in again.'; end if;
  if not exists(select 1 from public.applications where id=p_application_id and applicant_id=caller and status='approved') then raise exception 'This award is not available for acceptance.'; end if;
  select * into award_row from public.awards where application_id=p_application_id for update;
  if award_row.id is null then raise exception 'Award details have not been issued yet.'; end if;
  if award_row.acceptance_deadline is not null and award_row.acceptance_deadline<current_date then raise exception 'The acceptance deadline has passed. Contact EFF for help.'; end if;
  update public.awards set accepted_at=coalesce(accepted_at,now()) where id=award_row.id;
  insert into public.audit_events(actor_id,action,target_type,target_id) values(caller,'award_accepted','award',award_row.id::text);
end $$;
revoke all on function public.accept_award(uuid) from public;
grant execute on function public.accept_award(uuid) to authenticated;
