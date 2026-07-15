-- Launch hardening: safe staff retries, lifecycle reminders, and operational health records.
create table if not exists public.system_health_events(
  id uuid primary key default gen_random_uuid(),
  service text not null,
  status text not null check(status in('healthy','degraded','failed')),
  detail_safe text,
  observed_at timestamptz not null default now()
);
alter table public.system_health_events enable row level security;
create policy "health_events_staff_read" on public.system_health_events for select to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'));
create index if not exists system_health_events_recent_idx on public.system_health_events(service,observed_at desc);

create or replace function public.retry_failed_message(p_message_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or not (public.has_role('program_admin') or public.has_role('super_admin')) then raise exception 'Not authorized.'; end if;
  update public.messages set status='queued',attempts=0,next_attempt_at=now(),last_error_safe=null
  where id=p_message_id and status='failed' and payload_private is not null;
  if not found then raise exception 'This message cannot be retried safely.'; end if;
  insert into public.audit_events(actor_id,action,target_type,target_id) values(actor,'failed_email_retried','message',p_message_id::text);
end $$;
revoke all on function public.retry_failed_message(uuid) from public,anon;
grant execute on function public.retry_failed_message(uuid) to authenticated;

create or replace function public.queue_student_lifecycle_reminders(p_limit int default 200)
returns int language plpgsql security definer set search_path=public as $$
declare item record; queued_count int:=0;
begin
  for item in
    select a.id,p.primary_email,coalesce(nullif(p.preferred_name,''),nullif(p.legal_name,''),'Applicant') name,pc.name cycle_name
    from public.applications a join public.profiles p on p.id=a.applicant_id join public.program_cycles pc on pc.id=a.cycle_id
    where a.status='draft' and a.updated_at between now()-interval '14 days' and now()-interval '3 days'
      and not exists(select 1 from public.email_suppressions s where lower(s.email::text)=lower(p.primary_email::text))
    order by a.updated_at limit least(greatest(p_limit,1),500)
  loop
    insert into public.messages(application_id,recipient,idempotency_key,status,payload_private,template_key)
    values(item.id,item.primary_email,'draft-reminder:'||item.id::text||':'||to_char(now(),'IYYY-IW'),'queued',jsonb_build_object('name',item.name,'application_path','/applications/'||item.id::text||'/edit','cycle_name',item.cycle_name),'draft_reminder') on conflict(idempotency_key) do nothing;
    if found then queued_count:=queued_count+1; end if;
  end loop;
  for item in
    select r.id,a.id application_id,p.primary_email,coalesce(nullif(p.preferred_name,''),nullif(p.legal_name,''),'Applicant') name,r.item,r.due_at
    from public.information_requests r join public.applications a on a.id=r.application_id join public.profiles p on p.id=a.applicant_id
    where r.resolved_at is null and r.due_at is not null and r.due_at between now() and now()+interval '3 days'
      and not exists(select 1 from public.email_suppressions s where lower(s.email::text)=lower(p.primary_email::text))
    order by r.due_at limit least(greatest(p_limit,1),500)
  loop
    insert into public.messages(application_id,recipient,idempotency_key,status,payload_private,template_key)
    values(item.application_id,item.primary_email,'request-reminder:'||item.id::text,'queued',jsonb_build_object('name',item.name,'item',item.item,'due_at',item.due_at,'application_path','/applications/'||item.application_id::text),'information_request_reminder') on conflict(idempotency_key) do nothing;
    if found then queued_count:=queued_count+1; end if;
  end loop;
  return queued_count;
end $$;
revoke all on function public.queue_student_lifecycle_reminders(int) from public,anon,authenticated;
grant execute on function public.queue_student_lifecycle_reminders(int) to service_role;

insert into public.email_templates(program_id,event_key,subject,body,version)
values
(null,'draft_reminder','A gentle reminder: your EFF application is waiting','<p>Hello {{name}},</p><p>We know scholarship applications can feel heavy. Your EFF application is still saved, and you can return when you are ready.</p><p><a href="{{portal_url}}">Continue your secure application</a>.</p>',1),
(null,'information_request_reminder','Reminder: information is needed for your EFF application','<p>Hello {{name}},</p><p>This is a gentle reminder that EFF needs the following item:</p><blockquote>{{item}}</blockquote><p>{{due_message}}</p><p><a href="{{portal_url}}">Respond securely in your portal</a>.</p>',1)
on conflict(program_id,event_key,version) do nothing;
