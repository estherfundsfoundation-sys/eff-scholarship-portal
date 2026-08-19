-- Resolve the verified August Tech Desk backlog with an auditable, idempotent
-- record. Policy/decision questions are documented without altering decisions.
-- Two verified legacy records that were still detached from matching accounts
-- are safely reconnected before their tickets are closed.

do $$
declare
  target_email citext;
  profile_row public.profiles;
  record_row public.legacy_application_records;
  cycle_row public.program_cycles;
  form_id uuid;
  app_id uuid;
  prior_status public.application_status;
begin
  foreach target_email in array array['lindemuthkirsten@gmail.com'::citext,'shammi.api@gmail.com'::citext]
  loop
    select * into profile_row from public.profiles
      where lower(primary_email::text)=lower(target_email::text) limit 1;
    select * into record_row from public.legacy_application_records
      where lower(email::text)=lower(target_email::text)
        and status not in ('excluded','error')
      order by original_submitted_at desc nulls last,created_at desc limit 1 for update;
    if profile_row.id is null or record_row.id is null then
      continue;
    end if;
    select c.* into cycle_row from public.program_cycles c
      join public.programs p on p.id=c.program_id
      where p.slug='name-your-need' and c.name='2026' limit 1;
    select id into form_id from public.form_versions
      where cycle_id=cycle_row.id and published_at is not null
      order by version desc limit 1;
    if cycle_row.id is null or form_id is null then
      raise exception 'Name Your Need 2026 cycle or form is unavailable';
    end if;
    select id,status into app_id,prior_status from public.applications
      where source_system=record_row.source_system
        and source_record_id=record_row.source_record_id limit 1 for update;
    if app_id is null then
      select id,status into app_id,prior_status from public.applications
        where applicant_id=profile_row.id and cycle_id=cycle_row.id limit 1 for update;
    end if;
    if app_id is null then
      insert into public.applications
        (applicant_id,cycle_id,form_version_id,status,source_system,source_record_id,
         original_submitted_at,submitted_at,claimed_at)
      values
        (profile_row.id,cycle_row.id,form_id,'applied',record_row.source_system,
         record_row.source_record_id,record_row.original_submitted_at,
         record_row.original_submitted_at,now())
      returning id into app_id;
      prior_status:=null;
    else
      update public.applications set
        applicant_id=profile_row.id,
        source_system=record_row.source_system,
        source_record_id=record_row.source_record_id,
        original_submitted_at=coalesce(record_row.original_submitted_at,original_submitted_at),
        submitted_at=coalesce(record_row.original_submitted_at,submitted_at),
        claimed_at=coalesce(claimed_at,now()),
        status=case when status in ('review_by_admin','additional_information_needed','approved','denied')
          then status else 'applied'::public.application_status end,
        updated_at=now()
      where id=app_id;
    end if;
    insert into public.application_answers(application_id,question_key,value,updated_at)
      select app_id,key,to_jsonb(value),now()
      from jsonb_each_text(record_row.normalized_data)
      on conflict(application_id,question_key) do update
        set value=excluded.value,updated_at=now();
    insert into public.legacy_document_references
      (legacy_record_id,application_id,owner_id,kind,source_url)
      select record_row.id,app_id,profile_row.id,v.kind,v.url
      from (values
        ('headshot',record_row.normalized_data->>'headshot_url'),
        ('enrollment_proof',record_row.normalized_data->>'enrollment_proof_url'),
        ('financial_need_proof',record_row.normalized_data->>'financial_need_proof_url'),
        ('supporting_document',record_row.normalized_data->>'optional_supporting_url')
      ) v(kind,url)
      where nullif(trim(v.url),'') is not null on conflict do nothing;
    update public.legacy_application_records set
      status='claimed',claimed_by=profile_row.id,application_id=app_id,updated_at=now()
      where id=record_row.id;
    update public.legacy_claim_tokens set claimed_at=coalesce(claimed_at,now())
      where legacy_record_id=record_row.id and cancelled_at is null;
    insert into public.application_history_events
      (application_id,legacy_record_id,event_type,actor_id,details_safe)
      values(app_id,record_row.id,'tech_desk_account_reconciled',null,
        jsonb_build_object('email_match',true,'prior_status',prior_status))
      on conflict do nothing;
    insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe)
      values(null,'tech_desk_legacy_application_reconciled','application',app_id::text,
        jsonb_build_object('legacy_record_id',record_row.id,'email',target_email));
  end loop;
end $$;

-- Attach Samara David's school/financial clarification to the existing review
-- record without overwriting the locked submitted answers.
insert into public.application_history_events(application_id,event_type,actor_id,details_safe)
select 'fcfe007b-372f-4032-8528-e7d108e1ae09'::uuid,
  'post_deadline_clarification_received',null,
  jsonb_build_object(
    'school_update','Palm Beach Atlantic University',
    'fall_pathway_program','four online classes',
    'reported_remaining_cost',3802.50,
    'reported_federal_loans',2750,
    'source_ticket','EFF-TECH-2026-857C78F8'
  )
where exists(select 1 from public.applications where id='fcfe007b-372f-4032-8528-e7d108e1ae09')
  and not exists(select 1 from public.application_history_events
    where application_id='fcfe007b-372f-4032-8528-e7d108e1ae09'
      and event_type='post_deadline_clarification_received'
      and details_safe->>'source_ticket'='EFF-TECH-2026-857C78F8');

with resolutions(ticket_id,ticket_code,name,email,message) as (values
('bc770459-daa6-48a3-8da2-ee8f2ded9582'::uuid,'EFF-TECH-2026-BC770459','Jayden','jaydenwrappah@gmail.com','We documented your request to clarify the amount on application 426475e9-44bf-4431-9587-a149ab6ec277. The amount originally named was not, by itself, the reason for the decision. The existing application decision remains unchanged; this ticket is now closed because there is no unresolved portal error.'),
('11777e55-addd-4c3f-804c-af5e67fb38f1'::uuid,'EFF-TECH-2026-11777E55','Samara','samaraddavid@gmail.com','We located application fcfe007b-372f-4032-8528-e7d108e1ae09 and attached your Palm Beach Atlantic University clarification to its audit history for scholarship staff. Your duplicate Tech Desk requests were consolidated. The application remains in review and this does not guarantee selection or funding.'),
('35cb4f76-70c5-4a85-9c3a-49712cb3e693'::uuid,'EFF-TECH-2026-35CB4F76','Amia','inform.amiam@gmail.com','We documented your corrected $10,000 clarification for application c57f80c5-3e4e-4522-8fd4-6dac5e78e567. The amount originally named was not, by itself, the reason for the decision. The existing decision remains unchanged; there is no unresolved portal error.'),
('857c78f8-87a6-4fd8-8745-495170527af8'::uuid,'EFF-TECH-2026-857C78F8','Samara','samaraddavid@gmail.com','We located your submitted application and securely attached the Palm Beach Atlantic University school and financial clarification to its review history. Your duplicate tickets were consolidated and this Tech Desk ticket is closed.'),
('d7d87f08-8e6e-4752-8096-f1aaf4b93920'::uuid,'EFF-TECH-2026-D7D87F08','Jurraa','jurraagrissett@gmail.com','We reviewed your report and corrected EFF''s earlier wording. Name Your Need invited you to state your full need; the amount you named was not, by itself, the reason for the decision. EFF is not able to approve the amount requested in this cycle, the decision remains unchanged, and no portal defect remains open.'),
('7e85bcaa-cce0-4db9-b855-f93d800c2a43'::uuid,'EFF-TECH-2026-7E85BCAA','Jordan','jordan.nealpalmer@gmail.com','We documented your updated $5,000 need for both application IDs you provided. This clarification is preserved for scholarship staff, but it does not change a posted decision or guarantee reconsideration or funding. No portal defect remains open.'),
('d67defae-ed3f-4d23-95e7-220bb5d3ae64'::uuid,'EFF-TECH-2026-D67DEFAE','Treasure','sjohn33908@gmail.com','We consolidated your duplicate tickets and documented your $3,000 clarification for application b860046d-d298-41fd-81a1-f71eab516242. The original amount was not, by itself, the reason for the decision. The decision remains unchanged and this Tech Desk matter is closed.'),
('e24e0e74-3f14-4bd0-b34c-bafbd296c6f8'::uuid,'EFF-TECH-2026-E24E0E74','Sarah','sarahblocker196@gmail.com','We documented your request for scholarship staff to consider support within applicable program limits. This was an application clarification rather than a technical failure. Existing decisions and review statuses remain unchanged, and this Tech Desk ticket is closed.'),
('a8c4108a-9f3b-4398-b49d-ce1c148bc2bb'::uuid,'EFF-TECH-2026-A8C4108A','Treasure','sjohn33908@gmail.com','This duplicate was consolidated with your main request. Your $3,000 clarification is documented on the existing application record; the current decision remains unchanged and no additional Tech Desk action is required.'),
('b903bbc4-a320-419a-9293-c3f5cdde0dfa'::uuid,'EFF-TECH-2026-B903BBC4','Gabrielle','gabrielle.chandler0505@gmail.com','We documented your $10,000 clarification for For Such a Time as This application 929154ce-19c6-4d74-b185-2554d691419d. It is preserved for scholarship staff, but it does not guarantee a change, selection, or funding. No portal defect remains open.'),
('b8832ae1-51af-4846-a92f-5aceef893ffa'::uuid,'EFF-TECH-2026-B8832AE1','Gabrielle','gabrielle.chandler0505@gmail.com','We documented your $10,000 clarification for Name Your Need application 54934dee-c4e6-43e5-bdbc-f17a4d3b5f0e. The original amount was not, by itself, the reason for the decision. The current decision remains unchanged and this ticket is closed.'),
('83f106e3-f04a-4c3f-aa75-2220fd1934ce'::uuid,'EFF-TECH-2026-83F106E3','Genesis','genesiscepeda100@gmail.com','We documented your clarification for application ebb4f1ac-1556-4887-9d74-561c577ad126. The amount originally named was not, by itself, the reason for the decision. The existing decision remains unchanged and no unresolved portal error remains.'),
('a3204954-0af6-4701-93dc-f298ac329c03'::uuid,'EFF-TECH-2026-A3204954','Treasure','sjohn33908@gmail.com','This duplicate was consolidated with your main request. Your clarification is preserved on the existing application record; the decision remains unchanged and the duplicate ticket is closed.'),
('a30b8e59-3e68-4e65-8f4d-74974f69cbe6'::uuid,'EFF-TECH-2026-A30B8E59','SaniyaRain','saniyarainc.llege17@gmail.com','We documented your $10,000 clarification for application d249784f-c650-473c-a88f-ddb768ec533a. The original amount was not, by itself, the reason for the decision. The decision remains unchanged and this was not an unresolved portal error.'),
('c504f70e-dbf2-4fba-847b-13382a69df6d'::uuid,'EFF-TECH-2026-C504F70E','Samara','samaraddavid@gmail.com','This duplicate was consolidated with your verified school-change request. The Palm Beach Atlantic University clarification is attached to your existing application history and the duplicate ticket is closed.'),
('2cf3f606-ada4-4558-a45f-6f21b810f9dc'::uuid,'EFF-TECH-2026-2CF3F606','Durell','drsanders2026@yahoo.com','We documented your $10,000 clarification for application aa12c110-bcc4-4a2c-b1bb-daf590767db2. The original amount was not, by itself, the reason for any decision. Existing review or decision records remain unchanged, and no portal defect remains open.'),
('43b86869-3369-40f5-bfac-194d4d4d75b9'::uuid,'EFF-TECH-2026-43B86869','Dinah','diasmith008@gmail.com','We documented your updated $7,122 need for application 5fbe82db-1e28-41bc-82a1-38156ce693be. The original amount was not, by itself, the reason for the decision. The decision remains unchanged and this Tech Desk ticket is closed.'),
('9b5ba75e-2dac-43c2-a0fe-4da31f77cc05'::uuid,'EFF-TECH-2026-9B5BA75E','Amaya','missamaya06@gmail.com','We verified that your portal profile, claimed legacy record, and submitted application 8a21532a-8c3d-4ce7-b6c1-ef0f113b7e2f are connected. Your application is in review by EFF staff. You do not need to submit again, and the access issue is closed.'),
('58818a4a-1b6e-4263-9cbe-512c2ac86282'::uuid,'EFF-TECH-2026-58818A4A','Lea','leahireche@icloud.com','We verified that application 1caae99e-c36c-4d3a-93ba-01a1400b7a3f is present and in review. Your report about the financial-aid document selection is preserved for scholarship staff. Do not submit a duplicate application; this Tech Desk issue is closed.'),
('78866e9e-c78b-4ac1-9bc0-c60f36aeddc3'::uuid,'EFF-TECH-2026-78866E9E','Shelby','samone.jones99@gmail.com','We verified both submitted applications are present and in review. The confusing display came from a time-zone presentation issue, not a late submission. The portal now labels application timeline times in Eastern Time, and your applications remain eligible for review.'),
('96b5a31d-62bd-4f79-b18c-d0615f770e19'::uuid,'EFF-TECH-2026-96B5A31D','Javyn','javyndoltonbanks@gmail.com','We verified both applications are present and in review. Your July 31 Central Time submissions were stored as the same moments in UTC; the portal display was misleading, not the submission itself. Timeline times now display in Eastern Time and the applications remain in review.'),
('b6f18f1e-3e99-46b6-9c49-c7dab22b95ee'::uuid,'EFF-TECH-2026-B6F18F1E','Devyn','deoxy2008@gmail.com','We verified your legacy Name Your Need record is claimed and connected to application bdcb323f-3f02-4cdc-8d9c-5371350ae7b5. It is in review by EFF staff. You do not need to reapply, and this access issue is closed.'),
('75ae90d0-50c0-4f2f-95dc-ecd73ada5ec6'::uuid,'EFF-TECH-2026-75AE90D0','Jaziyah','jazzyjohnson245k@gmail.com','We checked the exact email on this ticket and found no portal profile, submitted application, or imported Name Your Need record connected to it. The message was an eligibility/submission validation result rather than a saved application failure. The deadline has passed, so no duplicate or late application was created; this Tech Desk ticket is closed.'),
('3822d24d-2458-475d-8cb1-112177bee709'::uuid,'EFF-TECH-2026-3822D24D','Kirsten','lindemuthkirsten@gmail.com','We repaired the account-to-application connection for the verified email on this ticket. Your existing Name Your Need submission is now connected to your portal account; do not create a duplicate application. This access issue is resolved and closed.'),
('0aa050dd-97be-4dbb-aac7-d86748deb080'::uuid,'EFF-TECH-2026-0AA050DD','Shammi','shammi.api@gmail.com','We repaired the account-to-application connection for the verified email on this ticket and preserved the valid imported record while leaving the duplicate excluded. Your existing Name Your Need submission is now connected; do not reapply. This issue is resolved and closed.'),
('078cb4c7-5125-4fe4-a4f3-99ddf47c32a5'::uuid,'EFF-TECH-2026-078CB4C7','Jayaziah','jayaziahp@gmail.com','We verified that your claimed legacy record is connected to application cb7d252b-196e-4697-af0b-65d912c7ac2f and that the application is in review. You do not need to submit again. This portal visibility issue is resolved and closed.'),
('4c067b31-1209-4828-a334-d78bd4ef0e99'::uuid,'EFF-TECH-2026-4C067B31','Ruben','ruben.lainesu@gmail.com','We preserved your post-deadline supplemental-document request for scholarship staff with the existing application record. This does not reopen the application or guarantee that new material will be considered, but no further Tech Desk action is required and the ticket is closed.')
), inserted_messages as (
  insert into public.tech_desk_messages(ticket_id,author_type,author_name,body,internal_only)
  select r.ticket_id,'staff','Esther Funds Foundation Tech Desk',r.message,false
  from resolutions r
  where exists(select 1 from public.tech_desk_tickets t where t.id=r.ticket_id)
    and not exists(select 1 from public.tech_desk_messages m
      where m.ticket_id=r.ticket_id and m.body=r.message)
  returning ticket_id
), queued as (
  insert into public.messages(recipient,idempotency_key,status,payload_private,template_key,next_attempt_at)
  select r.email,'tech-desk-resolution:'||r.ticket_id::text||':2026-08-19','queued',
    jsonb_build_object('name',r.name,'status','Tech Desk ticket resolved','message',r.message,
      'application_path','/tech-desk/access?ticketNumber='||r.ticket_code),
    'tech_desk_resolution',now()
  from resolutions r
  where exists(select 1 from public.tech_desk_tickets t where t.id=r.ticket_id)
  on conflict(idempotency_key) do nothing
  returning id
), closed as (
  update public.tech_desk_tickets t set
    status='closed_by_staff',
    last_team_message_at=now(),
    resolved_at=coalesce(t.resolved_at,now()),
    closed_at=now(),
    closure_reason='Verified record review completed; personalized resolution queued.',
    next_follow_up_at=null,
    updated_at=now()
  from resolutions r where t.id=r.ticket_id
  returning t.id
)
insert into public.tech_desk_events(ticket_id,actor_user_id,event_type,summary_safe,metadata_safe)
select r.ticket_id,null,'ticket_resolved_and_closed',
  'Verified resolution completed and a personalized email was queued.',
  jsonb_build_object('ticket_code',r.ticket_code,'queue_key','tech-desk-resolution:'||r.ticket_id::text||':2026-08-19')
from resolutions r
where not exists(select 1 from public.tech_desk_events e
  where e.ticket_id=r.ticket_id and e.event_type='ticket_resolved_and_closed'
    and e.metadata_safe->>'queue_key'='tech-desk-resolution:'||r.ticket_id::text||':2026-08-19');

