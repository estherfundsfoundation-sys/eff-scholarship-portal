-- Launch the free Every Future Fulfilled Partner Campus invitation campaign.
-- One verified, relevant institutional contact is selected per college. The
-- existing paced queue handles delivery, retries, quotas, and suppressions.

insert into public.email_templates(program_id,event_key,subject,body,version)
select
  null,
  'partner_invitation',
  'Invitation for {{name}}: Become a Free Every Future Fulfilled Partner Campus',
  '<p>Hello {{name}} Student Success Team,</p>
<p>Esther Funds Foundation invites your institution to become an <strong>Every Future Fulfilled Partner Campus</strong>—a national college-continuity partnership designed around one promise: before a student stops out because of a solvable barrier, we step in together.</p>
<p><strong>Participation is 100% free.</strong> There is no membership fee, setup fee, or student referral fee.</p>
<p>Partner campuses receive:</p>
<ul>
<li>A free institutional account and immediate public recognition, including the school logo and partnership profile in the EFF national directory.</li>
<li>A direct referral pathway to the EFF National Student Help Desk for students facing enrollment, financial-aid, billing, housing, document, or basic-needs barriers.</li>
<li>Private student case numbers, document-gathering guidance, routing to the correct department, and follow-up support.</li>
<li>Consent-based EFF advocacy and communication with the appropriate campus office when a student needs help navigating a barrier.</li>
<li>Resource matching and review for limited emergency essentials support, including school supplies or groceries, subject to eligibility and available funding.</li>
<li>National recognition for pledging to intervene before preventable withdrawal, plus a pathway toward the earned EFF Institute for Student Continuity designation.</li>
</ul>
<p>The partnership does not require a college to reverse a decision, guarantee aid, share protected records without student consent, or promise a particular outcome.</p>
<p><strong>Learn about the partnership:</strong> <a href="https://portal.estherfundsfoundation.org/partners">portal.estherfundsfoundation.org/partners</a><br>
<strong>Create the free institution account:</strong> <a href="https://portal.estherfundsfoundation.org/partners/join">portal.estherfundsfoundation.org/partners/join</a></p>
<p>If another office leads student success, retention, basic needs, enrollment management, or student affairs at your institution, please forward this invitation to that team.</p>
<p>With purpose,<br>
<strong>Shayna Vincent</strong><br>
Founder &amp; Executive Director<br>
Esther Funds Foundation<br>
Every Future Fulfilled</p>
<p style="font-size:12px;color:#6b6174">If your institution does not wish to receive partnership updates, reply “remove” and EFF will add this address to its suppression list.</p>',
  1
where not exists(
  select 1 from public.email_templates
  where program_id is null and event_key='partner_invitation' and version=1
);

with ranked_contacts as (
  select
    c.unitid,
    d.name as institution_name,
    c.email,
    row_number() over(
      partition by c.unitid
      order by
        case c.department_key
          when 'student_advocacy' then 1
          when 'basic_needs' then 2
          when 'financial_aid' then 3
          when 'registrar' then 4
          when 'student_accounts' then 5
          else 99
        end,
        c.last_checked_at desc nulls last,
        c.email
    ) as contact_rank
  from public.college_contact_directory c
  join public.college_directory d on d.unitid=c.unitid and d.active=true
  where c.verification_status='verified'
    and c.department_key in ('student_advocacy','basic_needs','financial_aid','registrar','student_accounts')
    and c.email is not null
    and c.email::text ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    and c.email::text !~* '(^|[._-])(no-?reply|do-?not-?reply|test|testing)([._@-]|$)'
    and not exists(
      select 1 from public.email_suppressions s
      where lower(s.email::text)=lower(c.email::text)
    )
)
insert into public.messages(recipient,idempotency_key,status,payload_private,template_key,next_attempt_at)
select
  email,
  'partner-invitation-2026:'||unitid::text,
  'queued',
  jsonb_build_object('name',institution_name,'application_path','/partners/join'),
  'partner_invitation',
  now()
from ranked_contacts
where contact_rank=1
on conflict(idempotency_key) do nothing;

insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe)
select
  null,
  'national_partner_outreach_queued',
  'partner_campaign',
  'every_future_fulfilled_2026',
  jsonb_build_object(
    'queued',
    count(*),
    'audience_policy',
    'one verified student-support contact per active U.S. institution'
  )
from public.messages
where idempotency_key like 'partner-invitation-2026:%';
