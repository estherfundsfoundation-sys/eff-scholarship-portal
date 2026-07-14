-- Permission-scoped administration and append-only workflow actions.
alter table public.import_jobs alter column created_by drop not null;

create policy "applications_staff_update" on public.applications for update to authenticated
using(public.has_role('program_admin') or public.has_role('super_admin'))
with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "answers_staff_read" on public.application_answers for select to authenticated
using(public.has_role('reviewer') or public.has_role('program_admin') or public.has_role('super_admin'));
create policy "documents_staff_read" on public.documents for select to authenticated
using(public.has_role('reviewer') or public.has_role('program_admin') or public.has_role('super_admin'));
create policy "requests_staff_manage" on public.information_requests for all to authenticated
using(public.has_role('program_admin') or public.has_role('super_admin'))
with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "assignments_staff_manage" on public.review_assignments for all to authenticated
using(public.has_role('program_admin') or public.has_role('super_admin'))
with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "decisions_staff_read" on public.decisions for select to authenticated
using(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "awards_staff_manage" on public.awards for all to authenticated
using(public.has_role('finance') or public.has_role('program_admin') or public.has_role('super_admin'))
with check(public.has_role('finance') or public.has_role('program_admin') or public.has_role('super_admin'));
alter table public.audit_events enable row level security;
create policy "audit_super_admin_read" on public.audit_events for select to authenticated using(public.has_role('super_admin'));

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
  insert into public.status_history(application_id,previous_status,new_status,actor_id,reason,applicant_note) values(p_application_id,old_status,p_new_status,actor,p_reason,nullif(trim(p_applicant_note),''));
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(actor,'application_status_changed','application',p_application_id::text,jsonb_build_object('from',old_status,'to',p_new_status,'reason',p_reason));
end $$;
revoke all on function public.staff_transition_application(uuid,public.application_status,text,text) from public;
grant execute on function public.staff_transition_application(uuid,public.application_status,text,text) to authenticated;
