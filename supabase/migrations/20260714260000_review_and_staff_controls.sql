alter table public.review_assignments add column if not exists has_conflict boolean not null default false;
alter table public.review_assignments add column if not exists conflict_details text;

create policy "assignments_reviewer_read" on public.review_assignments for select to authenticated using(reviewer_id=auth.uid());
create policy "reviews_assigned_insert" on public.reviews for insert to authenticated with check(exists(select 1 from public.review_assignments a where a.id=assignment_id and a.reviewer_id=auth.uid() and not a.has_conflict));
create policy "reviews_assigned_update" on public.reviews for update to authenticated using(exists(select 1 from public.review_assignments a where a.id=assignment_id and a.reviewer_id=auth.uid() and not a.has_conflict) and locked_at is null) with check(exists(select 1 from public.review_assignments a where a.id=assignment_id and a.reviewer_id=auth.uid() and not a.has_conflict));

insert into public.rubrics(cycle_id,version,criteria)
select c.id,1,'[{"key":"demonstrated_need","label":"Demonstrated unmet need","description":"How clearly does the application establish an unmet need that affects continued enrollment?","min":1,"max":5},{"key":"enrollment_impact","label":"Impact on staying enrolled","description":"How directly would assistance help the student remain enrolled?","min":1,"max":5},{"key":"story_and_context","label":"Student story and context","description":"How clearly and authentically does the applicant explain their circumstances?","min":1,"max":5}]'::jsonb
from public.program_cycles c join public.programs p on p.id=c.program_id where p.slug='name-your-need' and c.name='2026'
on conflict(cycle_id,version) do nothing;

create or replace function public.assign_application_reviewer(p_application_id uuid,p_reviewer_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); assignment_id uuid;
begin
  if actor is null or not (public.has_role('program_admin') or public.has_role('super_admin')) then raise exception 'Not authorized.'; end if;
  if not exists(select 1 from public.user_roles where user_id=p_reviewer_id and role in('reviewer','program_admin','super_admin')) then raise exception 'That person does not have reviewer access.'; end if;
  insert into public.review_assignments(application_id,reviewer_id) values(p_application_id,p_reviewer_id) on conflict(application_id,reviewer_id) do update set reviewer_id=excluded.reviewer_id returning id into assignment_id;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(actor,'reviewer_assigned','review_assignment',assignment_id::text,jsonb_build_object('application_id',p_application_id,'reviewer_id',p_reviewer_id));
  return assignment_id;
end $$;
revoke all on function public.assign_application_reviewer(uuid,uuid) from public;
grant execute on function public.assign_application_reviewer(uuid,uuid) to authenticated;

create or replace function public.submit_application_review(p_assignment_id uuid,p_scores jsonb,p_notes text,p_has_conflict boolean,p_conflict_details text default null)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); rubric_id uuid; score_count int; invalid_count int;
begin
  if actor is null or not exists(select 1 from public.review_assignments where id=p_assignment_id and reviewer_id=actor) then raise exception 'That review is not assigned to you.'; end if;
  update public.review_assignments set conflict_disclosed=true,has_conflict=p_has_conflict,conflict_details=nullif(trim(p_conflict_details),'') where id=p_assignment_id;
  if p_has_conflict then
    insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(actor,'review_conflict_disclosed','review_assignment',p_assignment_id::text,jsonb_build_object('has_conflict',true));
    return;
  end if;
  if exists(select 1 from public.reviews where assignment_id=p_assignment_id and locked_at is not null) then raise exception 'This review is locked.'; end if;
  select r.id into rubric_id from public.rubrics r join public.review_assignments a on a.id=p_assignment_id join public.applications app on app.id=a.application_id where r.cycle_id=app.cycle_id order by r.version desc limit 1;
  if rubric_id is null then raise exception 'No rubric is configured for this cycle.'; end if;
  select count(*),count(*) filter(where value::text !~ '^([1-5])(\.0+)?$') into score_count,invalid_count from jsonb_each(p_scores);
  if score_count<1 or invalid_count>0 then raise exception 'Every score must be between 1 and 5.'; end if;
  insert into public.reviews(assignment_id,rubric_id,scores,notes,locked_at,updated_at) values(p_assignment_id,rubric_id,p_scores,nullif(trim(p_notes),''),now(),now()) on conflict(assignment_id) do update set rubric_id=excluded.rubric_id,scores=excluded.scores,notes=excluded.notes,locked_at=excluded.locked_at,updated_at=excluded.updated_at,reopened_by=null;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(actor,'review_submitted','review_assignment',p_assignment_id::text,jsonb_build_object('criteria_count',score_count));
end $$;
revoke all on function public.submit_application_review(uuid,jsonb,text,boolean,text) from public;
grant execute on function public.submit_application_review(uuid,jsonb,text,boolean,text) to authenticated;

create or replace function public.reopen_application_review(p_assignment_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or not (public.has_role('program_admin') or public.has_role('super_admin')) or nullif(trim(p_reason),'') is null then raise exception 'An authorized administrator and reason are required.'; end if;
  update public.reviews set locked_at=null,reopened_by=actor,updated_at=now() where assignment_id=p_assignment_id;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(actor,'review_reopened','review_assignment',p_assignment_id::text,jsonb_build_object('reason',trim(p_reason)));
end $$;
revoke all on function public.reopen_application_review(uuid,text) from public;
grant execute on function public.reopen_application_review(uuid,text) to authenticated;
