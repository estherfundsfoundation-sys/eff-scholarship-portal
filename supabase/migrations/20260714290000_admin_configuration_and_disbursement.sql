create policy "programs_admin_manage" on public.programs for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "cycles_admin_manage" on public.program_cycles for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "forms_admin_manage" on public.form_versions for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "policies_admin_manage" on public.policy_versions for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "templates_admin_manage" on public.email_templates for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "reviews_admin_manage" on public.reviews for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));

create or replace function public.update_award_disbursement(p_award_id uuid,p_status text,p_scheduled_date date,p_actual_date date,p_payment_reference text)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); old_status text;
begin
  if actor is null or not (public.has_role('finance') or public.has_role('program_admin') or public.has_role('super_admin')) then raise exception 'Not authorized.'; end if;
  if p_status not in('pending_acceptance','accepted','verification_pending','scheduled','disbursed','failed','returned','cancelled') then raise exception 'Invalid disbursement status.'; end if;
  select disbursement_status into old_status from public.awards where id=p_award_id for update;
  if old_status is null then raise exception 'Award not found.'; end if;
  if p_status='disbursed' and (p_actual_date is null or nullif(trim(p_payment_reference),'') is null) then raise exception 'Actual date and internal payment reference are required for disbursed awards.'; end if;
  update public.awards set disbursement_status=p_status,scheduled_date=p_scheduled_date,actual_date=p_actual_date,payment_reference=nullif(trim(p_payment_reference),'') where id=p_award_id;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(actor,'disbursement_status_changed','award',p_award_id::text,jsonb_build_object('from',old_status,'to',p_status,'scheduled_date',p_scheduled_date,'actual_date',p_actual_date));
end $$;
revoke all on function public.update_award_disbursement(uuid,text,date,date,text) from public;
grant execute on function public.update_award_disbursement(uuid,text,date,date,text) to authenticated;
