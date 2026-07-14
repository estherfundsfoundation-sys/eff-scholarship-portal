alter table public.messages add column if not exists template_key text not null default 'legacy_claim';

drop function if exists public.dequeue_email_messages(int);
create function public.dequeue_email_messages(p_limit int default 25)
returns table(message_id uuid,recipient citext,payload_private jsonb,attempts int,legacy_token_id uuid,template_key text)
language plpgsql security definer set search_path=public as $$
begin
  return query
  with picked as (
    select m.id from public.messages m where m.status='queued' and m.next_attempt_at<=now()
    order by m.created_at for update skip locked limit least(greatest(p_limit,1),25)
  )
  update public.messages m set status='processing' from picked where m.id=picked.id
  returning m.id,m.recipient,m.payload_private,m.attempts,m.legacy_token_id,m.template_key;
end $$;
revoke all on function public.dequeue_email_messages(int) from public,anon,authenticated;
grant execute on function public.dequeue_email_messages(int) to service_role;

create table if not exists public.notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  application_id uuid references public.applications on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications_owner_read" on public.notifications for select to authenticated using(user_id=auth.uid());
create index if not exists notifications_owner_created_idx on public.notifications(user_id,created_at desc);

create or replace function public.enqueue_application_status_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare recipient_email citext; recipient_name text; friendly_status text; message_body text;
begin
  if old.status=new.status or new.status='draft' or new.status='additional_information_needed' then return new; end if;
  select primary_email,coalesce(nullif(preferred_name,''),nullif(legal_name,''),'Applicant')
    into recipient_email,recipient_name from public.profiles where id=new.applicant_id;
  if recipient_email is null then return new; end if;
  friendly_status:=case new.status when 'applied' then 'Application received' when 'review_by_admin' then 'Application in review' when 'approved' then 'Application approved' when 'denied' then 'Application decision available' when 'withdrawn' then 'Application withdrawn' when 'archived' then 'Application archived' else initcap(replace(new.status::text,'_',' ')) end;
  message_body:=case new.status when 'applied' then 'Your application was submitted successfully. You can sign in anytime to track it.' when 'review_by_admin' then 'Your application is being reviewed by the Esther Funds Foundation team.' when 'approved' then 'A decision is available in your secure portal. Sign in to review the details and any next steps.' when 'denied' then 'A decision is available in your secure portal. Please sign in to read the complete message from our team.' else 'The status of your application has changed. Sign in to your secure portal for details.' end;
  insert into public.messages(application_id,recipient,idempotency_key,status,payload_private,template_key)
  values(new.id,recipient_email,'application-status:'||new.id::text||':'||new.status::text||':'||extract(epoch from new.updated_at)::text,'queued',jsonb_build_object('name',recipient_name,'status',friendly_status,'message',message_body,'application_path','/applications/'||new.id::text),'application_status') on conflict(idempotency_key) do nothing;
  insert into public.notifications(user_id,application_id,title,body,href) values(new.applicant_id,new.id,friendly_status,message_body,'/applications/'||new.id::text);
  return new;
end $$;
drop trigger if exists enqueue_application_status_message on public.applications;
create trigger enqueue_application_status_message after update of status on public.applications for each row execute procedure public.enqueue_application_status_message();

create or replace function public.enqueue_information_request_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare recipient_id uuid; recipient_email citext; recipient_name text;
begin
  select a.applicant_id,p.primary_email,coalesce(nullif(p.preferred_name,''),nullif(p.legal_name,''),'Applicant') into recipient_id,recipient_email,recipient_name from public.applications a join public.profiles p on p.id=a.applicant_id where a.id=new.application_id;
  if recipient_email is not null then
    insert into public.messages(application_id,recipient,idempotency_key,status,payload_private,template_key)
    values(new.application_id,recipient_email,'information-request:'||new.id::text,'queued',jsonb_build_object('name',recipient_name,'item',new.item,'due_at',new.due_at,'application_path','/applications/'||new.application_id::text),'information_request') on conflict(idempotency_key) do nothing;
    insert into public.notifications(user_id,application_id,title,body,href) values(recipient_id,new.application_id,'Information requested',new.item,'/applications/'||new.application_id::text);
  end if;
  return new;
end $$;
drop trigger if exists enqueue_information_request_message on public.information_requests;
create trigger enqueue_information_request_message after insert on public.information_requests for each row execute procedure public.enqueue_information_request_message();

create or replace function public.enqueue_award_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare recipient_id uuid; recipient_email citext; recipient_name text; event_key text;
begin
  if tg_op='UPDATE' and old.accepted_at is not null then return new; end if;
  if tg_op='UPDATE' and old.accepted_at is null and new.accepted_at is not null then event_key:='award_accepted';
  elsif tg_op='INSERT' then event_key:='award_issued'; else return new; end if;
  select a.applicant_id,p.primary_email,coalesce(nullif(p.preferred_name,''),nullif(p.legal_name,''),'Applicant') into recipient_id,recipient_email,recipient_name from public.applications a join public.profiles p on p.id=a.applicant_id where a.id=new.application_id;
  if recipient_email is not null then
    insert into public.messages(application_id,recipient,idempotency_key,status,payload_private,template_key)
    values(new.application_id,recipient_email,event_key||':'||new.id::text,'queued',jsonb_build_object('name',recipient_name,'amount',new.amount,'acceptance_deadline',new.acceptance_deadline,'application_path','/applications/'||new.application_id::text),event_key) on conflict(idempotency_key) do nothing;
    insert into public.notifications(user_id,application_id,title,body,href) values(recipient_id,new.application_id,case when event_key='award_issued' then 'Award details available' else 'Award accepted' end,case when event_key='award_issued' then 'Sign in to review and accept your award.' else 'Your award acceptance has been recorded.' end,'/applications/'||new.application_id::text);
  end if;
  return new;
end $$;
drop trigger if exists enqueue_award_message on public.awards;
create trigger enqueue_award_message after insert or update of accepted_at on public.awards for each row execute procedure public.enqueue_award_message();

create or replace function public.respond_to_information_request(p_request_id uuid,p_response text)
returns void language plpgsql security definer set search_path=public as $$
declare caller uuid:=auth.uid(); app_id uuid; prior_status public.application_status;
begin
  if caller is null or nullif(trim(p_response),'') is null then raise exception 'A response is required.'; end if;
  select r.application_id,a.status into app_id,prior_status from public.information_requests r join public.applications a on a.id=r.application_id where r.id=p_request_id and a.applicant_id=caller and r.resolved_at is null for update of r;
  if app_id is null then raise exception 'That request is unavailable.'; end if;
  update public.information_requests set response=trim(p_response),resolved_at=now() where id=p_request_id;
  if prior_status='additional_information_needed' then
    update public.applications set status='review_by_admin',updated_at=now() where id=app_id;
    insert into public.status_history(application_id,previous_status,new_status,actor_id,reason,applicant_note) values(app_id,prior_status,'review_by_admin',caller,'Applicant responded to information request','Your response was received and returned to review.');
  end if;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(caller,'information_request_responded','information_request',p_request_id::text,jsonb_build_object('application_id',app_id));
end $$;
revoke all on function public.respond_to_information_request(uuid,text) from public;
grant execute on function public.respond_to_information_request(uuid,text) to authenticated;
