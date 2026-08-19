-- Resolve Tech Desk tickets received while the August backlog repair was being
-- deployed. These are application-policy clarifications, not portal defects.
-- The response corrects earlier wording without changing a scholarship decision.

with resolutions(ticket_code,name,email,message) as (values
  ('EFF-TECH-2026-9AB23713','Peter','peternguyen8543@gmail.com',
   'We reviewed your clarification for application 4c571eb6-37f7-460b-a498-f6b52f676d8c and documented that you would be grateful for consideration up to $9,500 or any available amount. Name Your Need invited students to state their full need; the amount you originally named was not, by itself, the reason for the decision. EFF is not able to approve the amount requested in this cycle, the current decision remains unchanged, and no unresolved portal error remains.'),
  ('EFF-TECH-2026-FB7EAC4A','Josephine','josephineamedu28@gmail.com',
   'We reviewed your clarification for application 69bc4bc6-25a4-44c4-ad43-a649d06f1f8c and documented that you would be grateful for consideration within the program''s available range. Name Your Need invited students to state their full need; the amount you originally named was not, by itself, the reason for the decision. EFF is not able to approve the amount requested in this cycle, the current decision remains unchanged, and no unresolved portal error remains.'),
  ('EFF-TECH-2026-02653D69','Jurraa','jurraag@gmail.com',
   'We reviewed your report and corrected EFF''s earlier wording. Name Your Need invited you to state your full need, and the amount you named was not, by itself, the reason for the decision. EFF is not able to approve the amount requested in this cycle. The current decision remains unchanged, your feedback about making program guidance clearer is documented, and no unresolved portal error remains.')
), targets as (
  select t.id,t.ticket_code,r.name,r.email,r.message
  from public.tech_desk_tickets t join resolutions r on r.ticket_code=t.ticket_code
), inserted_messages as (
  insert into public.tech_desk_messages(ticket_id,author_type,author_name,body,internal_only)
  select x.id,'staff','Esther Funds Foundation Tech Desk',x.message,false
  from targets x
  where not exists(select 1 from public.tech_desk_messages m where m.ticket_id=x.id and m.body=x.message)
  returning ticket_id
), queued as (
  insert into public.messages(recipient,idempotency_key,status,payload_private,template_key,next_attempt_at,created_at)
  select x.email,'tech-desk-resolution:'||x.id::text||':2026-08-19','queued',
    jsonb_build_object('name',x.name,'status','Tech Desk ticket resolved','message',x.message,
      'application_path','/tech-desk/access?ticketNumber='||x.ticket_code),
    'tech_desk_resolution',now(),'2000-01-01 00:00:00+00'::timestamptz
  from targets x
  on conflict(idempotency_key) do nothing
  returning id
), closed as (
  update public.tech_desk_tickets t set
    status='closed_by_staff',last_team_message_at=now(),resolved_at=coalesce(t.resolved_at,now()),
    closed_at=now(),closure_reason='Verified record review completed; personalized resolution queued.',
    next_follow_up_at=null,updated_at=now()
  from targets x where t.id=x.id returning t.id
)
insert into public.tech_desk_events(ticket_id,actor_user_id,event_type,summary_safe,metadata_safe)
select x.id,null,'ticket_resolved_and_closed',
  'Verified resolution completed and a personalized email was queued.',
  jsonb_build_object('ticket_code',x.ticket_code,'queue_key','tech-desk-resolution:'||x.id::text||':2026-08-19')
from targets x
where not exists(select 1 from public.tech_desk_events e where e.ticket_id=x.id
  and e.event_type='ticket_resolved_and_closed'
  and e.metadata_safe->>'queue_key'='tech-desk-resolution:'||x.id::text||':2026-08-19');

-- Move every still-pending Tech Desk resolution ahead of older bulk campaigns.
-- Already processing, sent, failed, or suppressed messages are untouched.
update public.messages
set created_at='2000-01-01 00:00:00+00'::timestamptz,
    next_attempt_at=least(coalesce(next_attempt_at,now()),now())
where template_key='tech_desk_resolution'
  and idempotency_key like 'tech-desk-resolution:%:2026-08-19'
  and status in ('queued','retry');
