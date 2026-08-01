-- Organize application review actions and make every student-facing decision explicit.
-- No eligibility rule changes and no automatic approvals/denials are introduced.

create or replace function public.staff_transition_application(
  p_application_id uuid,
  p_new_status public.application_status,
  p_reason text,
  p_applicant_note text default null
) returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=auth.uid();
  old_status public.application_status;
  allowed boolean:=false;
begin
  if actor is null or not (public.has_role('program_admin') or public.has_role('super_admin')) then
    raise exception 'Not authorized.';
  end if;

  select status into old_status
  from public.applications
  where id=p_application_id
  for update;

  allowed:=case old_status
    when 'applied' then p_new_status in('review_by_admin','withdrawn')
    when 'review_by_admin' then p_new_status in('additional_information_needed','approved','denied','withdrawn')
    when 'additional_information_needed' then p_new_status in('review_by_admin','withdrawn')
    when 'approved' then p_new_status='archived'
    when 'denied' then p_new_status='archived'
    when 'withdrawn' then p_new_status='archived'
    else false
  end;
  if not allowed then raise exception 'That status transition is not allowed.'; end if;
  if p_new_status in('approved','denied') and nullif(trim(p_reason),'') is null then
    raise exception 'A decision reason is required.';
  end if;

  -- Record the decision before updating the application so the status-email
  -- trigger can render the exact applicant-facing explanation.
  if p_new_status in('approved','denied') then
    insert into public.decisions(application_id,decision,internal_reason,applicant_explanation,decided_by,confirmed_at)
    values(p_application_id,p_new_status,trim(p_reason),nullif(trim(p_applicant_note),''),actor,now())
    on conflict(application_id) do update
      set decision=excluded.decision,
          internal_reason=excluded.internal_reason,
          applicant_explanation=excluded.applicant_explanation,
          decided_by=excluded.decided_by,
          confirmed_at=excluded.confirmed_at;
  end if;

  update public.applications
  set status=p_new_status,
      updated_at=now(),
      archived_at=case when p_new_status='archived' then now() else archived_at end
  where id=p_application_id;

  insert into public.status_history(application_id,previous_status,new_status,actor_id,reason,applicant_note)
  values(p_application_id,old_status,p_new_status,actor,trim(p_reason),nullif(trim(p_applicant_note),''));

  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe)
  values(actor,'application_status_changed','application',p_application_id::text,
    jsonb_build_object('from',old_status,'to',p_new_status,'reason',trim(p_reason)));
end
$$;
revoke all on function public.staff_transition_application(uuid,public.application_status,text,text) from public;
grant execute on function public.staff_transition_application(uuid,public.application_status,text,text) to authenticated;

create or replace function public.staff_request_application_correction(
  p_application_id uuid,
  p_item text,
  p_due_at timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=auth.uid();
  request_id uuid;
  current_status public.application_status;
begin
  if actor is null or not (public.has_role('program_admin') or public.has_role('super_admin')) then
    raise exception 'Not authorized.';
  end if;
  if nullif(trim(p_item),'') is null then
    raise exception 'Describe exactly what the applicant needs to correct or upload.';
  end if;

  select status into current_status
  from public.applications
  where id=p_application_id
  for update;

  if current_status is null then raise exception 'Application not found.'; end if;
  if current_status<>'review_by_admin' then
    raise exception 'Start review before requesting a correction.';
  end if;

  insert into public.information_requests(application_id,requested_by,item,due_at)
  values(p_application_id,actor,trim(p_item),p_due_at)
  returning id into request_id;

  perform public.staff_transition_application(
    p_application_id,
    'additional_information_needed',
    'Correction or supporting information requested',
    trim(p_item)
  );

  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe)
  values(actor,'application_correction_requested','information_request',request_id::text,
    jsonb_build_object('application_id',p_application_id,'due_at',p_due_at));

  return request_id;
end
$$;
revoke all on function public.staff_request_application_correction(uuid,text,timestamptz) from public,anon;
grant execute on function public.staff_request_application_correction(uuid,text,timestamptz) to authenticated;

insert into public.email_templates(program_id,event_key,subject,body,version)
select null,'application_acceptance','Your EFF application has been approved',
  '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#2b0a63"><p style="text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:#42127f">Esther Funds Foundation</p><h1 style="color:#42127f">Application approval</h1><p>Hello {{name}},</p><p>Congratulations. Esther Funds Foundation has approved your application.</p><p>{{message}}</p><p><strong>Important:</strong> Application approval does not by itself confirm a payment amount or disbursement. If an award is issued, its amount, conditions, acceptance deadline, and payment status will appear separately in your secure portal.</p><p><a href="{{acceptance_url}}" style="display:inline-block;background:#42127f;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">View your secure acceptance letter</a></p><p>With care,<br><strong>Esther Funds Foundation</strong><br>Every Future Fulfilled.</p></div>',1
where not exists(
  select 1 from public.email_templates
  where program_id is null and event_key='application_acceptance' and version=1
);

insert into public.email_templates(program_id,event_key,subject,body,version)
select null,'application_decision','An EFF application decision is available',
  '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#2b0a63"><p style="text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:#42127f">Esther Funds Foundation</p><h1 style="color:#42127f">Application decision</h1><p>Hello {{name}},</p><p>Thank you for trusting Esther Funds Foundation with your application. A decision is now available.</p><p>{{message}}</p><p><a href="{{portal_url}}" style="display:inline-block;background:#42127f;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">Review the decision securely</a></p><p>With care,<br><strong>Esther Funds Foundation</strong></p></div>',1
where not exists(
  select 1 from public.email_templates
  where program_id is null and event_key='application_decision' and version=1
);

create or replace function public.enqueue_application_status_message()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  recipient_email citext;
  recipient_name text;
  friendly_status text;
  message_body text;
  event_key text;
begin
  if old.status=new.status or new.status='draft' or new.status='additional_information_needed' then return new; end if;

  select primary_email,coalesce(nullif(preferred_name,''),nullif(legal_name,''),'Applicant')
  into recipient_email,recipient_name
  from public.profiles
  where id=new.applicant_id;

  if recipient_email is null then return new; end if;

  friendly_status:=case new.status
    when 'applied' then 'Application received'
    when 'review_by_admin' then 'Application under review'
    when 'approved' then 'Application approved'
    when 'denied' then 'Application decision available'
    when 'withdrawn' then 'Application withdrawn'
    when 'archived' then 'Application archived'
    else initcap(replace(new.status::text,'_',' '))
  end;
  message_body:=case new.status
    when 'applied' then 'Your application was submitted successfully. You can sign in anytime to track it.'
    when 'review_by_admin' then 'Your application is now under review by the Esther Funds Foundation team.'
    when 'approved' then coalesce(
      (select nullif(trim(applicant_explanation),'') from public.decisions where application_id=new.id),
      'Your application has been approved. Review your secure acceptance letter and next steps in the portal.'
    )
    when 'denied' then coalesce(
      (select nullif(trim(applicant_explanation),'') from public.decisions where application_id=new.id),
      'A decision is available in your secure portal. Please sign in to review the complete message.'
    )
    else 'The status of your application has changed. Sign in to your secure portal for details.'
  end;
  event_key:=case new.status
    when 'approved' then 'application_acceptance'
    when 'denied' then 'application_decision'
    else 'application_status'
  end;

  insert into public.messages(application_id,recipient,idempotency_key,status,payload_private,template_key)
  values(
    new.id,
    recipient_email,
    'application-status:'||new.id::text||':'||new.status::text||':'||extract(epoch from new.updated_at)::text,
    'queued',
    jsonb_build_object(
      'name',recipient_name,
      'status',friendly_status,
      'message',message_body,
      'application_path','/applications/'||new.id::text,
      'acceptance_path','/applications/'||new.id::text||'/acceptance-letter'
    ),
    event_key
  )
  on conflict(idempotency_key) do nothing;

  insert into public.notifications(user_id,application_id,title,body,href)
  values(new.applicant_id,new.id,friendly_status,message_body,
    case when new.status='approved' then '/applications/'||new.id::text||'/acceptance-letter' else '/applications/'||new.id::text end);

  return new;
end
$$;

drop trigger if exists enqueue_application_status_message on public.applications;
create trigger enqueue_application_status_message
after update of status on public.applications
for each row execute procedure public.enqueue_application_status_message();
