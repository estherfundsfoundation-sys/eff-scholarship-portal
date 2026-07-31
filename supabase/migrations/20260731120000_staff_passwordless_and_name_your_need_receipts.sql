-- Passwordless Scholarship Administration access, a previewable and
-- idempotent Name Your Need receipt campaign, and review-workflow hardening.

alter table public.user_roles
  add column if not exists active boolean not null default true,
  add column if not exists revoked_at timestamptz;

create index if not exists user_roles_active_staff_idx
  on public.user_roles(user_id,role)
  where active=true;

create or replace function public.has_role(
  wanted public.app_role,
  wanted_program uuid default null
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.user_roles
    where user_id=auth.uid()
      and role=wanted
      and active=true
      and (wanted_program is null or program_id is null or program_id=wanted_program)
  )
$$;

-- Rate-limit passwordless staff code requests without retaining raw email
-- addresses, IP addresses, codes, or provider secrets.
create table if not exists public.staff_login_code_requests(
  id bigint generated always as identity primary key,
  email_hash text not null check(char_length(email_hash)=64),
  ip_hash text not null check(char_length(ip_hash)=64),
  allowed boolean not null,
  requested_at timestamptz not null default now()
);
alter table public.staff_login_code_requests enable row level security;
revoke all on public.staff_login_code_requests from public,anon,authenticated;
create index if not exists staff_login_code_email_window_idx
  on public.staff_login_code_requests(email_hash,requested_at desc);
create index if not exists staff_login_code_ip_window_idx
  on public.staff_login_code_requests(ip_hash,requested_at desc);

create or replace function public.request_staff_login_code(
  p_email_hash text,
  p_ip_hash text
)
returns table(allowed boolean,retry_after_seconds int)
language plpgsql
security definer
set search_path=public
as $$
declare
  email_attempts int;
  ip_attempts int;
  newest_attempt timestamptz;
begin
  if p_email_hash !~ '^[0-9a-f]{64}$' or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid staff login request fingerprint.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_email_hash||':'||p_ip_hash,0));
  delete from public.staff_login_code_requests
  where requested_at<now()-interval '30 days';

  select
    count(*) filter(where email_hash=p_email_hash),
    count(*) filter(where ip_hash=p_ip_hash),
    max(requested_at) filter(where email_hash=p_email_hash)
  into email_attempts,ip_attempts,newest_attempt
  from public.staff_login_code_requests
  where requested_at>=now()-interval '15 minutes';

  if newest_attempt is not null and newest_attempt>now()-interval '60 seconds' then
    allowed:=false;
    retry_after_seconds:=greatest(
      1,
      ceil(extract(epoch from newest_attempt+interval '60 seconds'-now()))::int
    );
  elsif email_attempts>=5 or ip_attempts>=20 then
    allowed:=false;
    retry_after_seconds:=900;
  else
    allowed:=true;
    retry_after_seconds:=0;
  end if;

  insert into public.staff_login_code_requests(email_hash,ip_hash,allowed)
  values(p_email_hash,p_ip_hash,allowed);
  insert into public.audit_events(
    actor_id,action,target_type,target_id,metadata_safe
  )
  values(
    null,
    case when allowed
      then 'staff_login_code_requested'
      else 'staff_login_code_rate_limited'
    end,
    'staff_login',
    p_email_hash,
    jsonb_build_object(
      'allowed',allowed,
      'retry_after_seconds',retry_after_seconds,
      'ip_hash',p_ip_hash
    )
  );
  return next;
end
$$;
revoke all on function public.request_staff_login_code(text,text)
  from public,anon,authenticated;
grant execute on function public.request_staff_login_code(text,text)
  to service_role;

-- The exact 2026 receipt template. The versioned event key and per-recipient
-- idempotency key prevent a student from receiving this receipt twice.
insert into public.email_templates(program_id,event_key,subject,body,version)
select
  null,
  'name_your_need_application_receipt_2026',
  'We received your EFF Name Your Need application',
  '<p>Hello {{name}},</p><p><strong>We received your Name Your Need application.</strong></p><p>It is now under review.</p><p>Because of high application volume, please allow 6–8 weeks after the July 31, 2026 deadline for review.</p><p>Submission does not guarantee funding or an award.</p><p><a href="{{portal_url}}">View your submitted application in the secure Esther Funds Foundation Portal</a>.</p>',
  1
where not exists(
  select 1
  from public.email_templates
  where program_id is null
    and event_key='name_your_need_application_receipt_2026'
    and version=1
);

create or replace view public.name_your_need_receipt_candidates_v1
with (security_invoker=true)
as
with submitted as (
  select
    a.id as application_id,
    a.status,
    coalesce(a.submitted_at,a.original_submitted_at) as effective_submitted_at,
    lower(trim(p.primary_email::text)) as recipient,
    coalesce(nullif(trim(p.preferred_name),''),nullif(trim(p.legal_name),''),'Applicant') as recipient_name
  from public.applications a
  join public.profiles p on p.id=a.applicant_id
  join public.program_cycles c on c.id=a.cycle_id
  join public.programs program on program.id=c.program_id
  where program.slug='name-your-need'
    and c.name='2026'
    and a.status in('applied','review_by_admin','additional_information_needed')
    and (
      a.status='applied'
      or (
        coalesce(a.submitted_at,a.original_submitted_at) is not null
        and coalesce(a.submitted_at,a.original_submitted_at)<=now()
      )
    )
),
ranked as (
  select
    submitted.*,
    row_number() over(
      partition by recipient
      order by
        case status
          when 'review_by_admin' then 1
          when 'additional_information_needed' then 2
          else 3
        end,
        effective_submitted_at desc nulls last,
        application_id
    ) as duplicate_rank
  from submitted
)
select
  ranked.*,
  (
    recipient ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    and split_part(recipient,'@',1)
      !~* '(^|[._+-])(no-?reply|do-?not-?reply|test|testing)([._+-]|$)'
    and split_part(recipient,'@',2)
      not in('example.com','example.org','example.net')
    and split_part(recipient,'@',2) !~* '\.test$'
  ) as valid_recipient,
  exists(
    select 1
    from public.email_suppressions suppression
    where lower(suppression.email::text)=ranked.recipient
  ) as suppressed,
  'name-your-need-receipt-2026:'||
    encode(digest(ranked.recipient,'sha256'),'hex') as idempotency_key
from ranked;

revoke all on public.name_your_need_receipt_candidates_v1
  from public,anon,authenticated;

create or replace function public.name_your_need_receipt_metrics()
returns table(
  recipient_count bigint,
  eligible_count bigint,
  queued_count bigint,
  processing_count bigint,
  failed_count bigint,
  sent_count bigint,
  suppressed_count bigint,
  invalid_count bigint,
  duplicate_count bigint
)
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null or not (
    public.has_role('program_admin') or public.has_role('super_admin')
  ) then
    raise exception 'Not authorized.';
  end if;

  return query
  select
    count(*) filter(
      where candidate.duplicate_rank=1
        and candidate.valid_recipient
        and not candidate.suppressed
    ),
    count(*) filter(
      where candidate.duplicate_rank=1
        and candidate.valid_recipient
        and not candidate.suppressed
        and not exists(
          select 1
          from public.messages message
          where message.idempotency_key=candidate.idempotency_key
        )
    ),
    (
      select count(*)
      from public.messages
      where template_key='name_your_need_application_receipt_2026'
        and status='queued'
    ),
    (
      select count(*)
      from public.messages
      where template_key='name_your_need_application_receipt_2026'
        and status='processing'
    ),
    (
      select count(*)
      from public.messages
      where template_key='name_your_need_application_receipt_2026'
        and status='failed'
    ),
    (
      select count(*)
      from public.messages
      where template_key='name_your_need_application_receipt_2026'
        and status='sent'
    ),
    count(*) filter(
      where candidate.duplicate_rank=1 and candidate.suppressed
    ),
    count(*) filter(
      where candidate.duplicate_rank=1 and not candidate.valid_recipient
    ),
    count(*) filter(where candidate.duplicate_rank>1)
  from public.name_your_need_receipt_candidates_v1 candidate;
end
$$;
revoke all on function public.name_your_need_receipt_metrics()
  from public,anon;
grant execute on function public.name_your_need_receipt_metrics()
  to authenticated;

create or replace function public.queue_name_your_need_receipts(
  p_confirmation text
)
returns int
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=auth.uid();
  template uuid;
  queued int:=0;
begin
  if actor is null or not public.has_role('super_admin') then
    raise exception 'Not authorized.';
  end if;
  if p_confirmation<>'QUEUE NAME YOUR NEED RECEIPTS' then
    raise exception 'Type the exact queue confirmation.';
  end if;

  select id into template
  from public.email_templates
  where program_id is null
    and event_key='name_your_need_application_receipt_2026'
  order by version desc
  limit 1;
  if template is null then
    raise exception 'The receipt email template is unavailable.';
  end if;

  insert into public.messages(
    application_id,
    template_id,
    recipient,
    idempotency_key,
    status,
    payload_private,
    template_key,
    next_attempt_at
  )
  select
    candidate.application_id,
    template,
    candidate.recipient,
    candidate.idempotency_key,
    'queued',
    jsonb_build_object(
      'name',candidate.recipient_name,
      'application_path','/applications/'||candidate.application_id::text
    ),
    'name_your_need_application_receipt_2026',
    now()
  from public.name_your_need_receipt_candidates_v1 candidate
  where candidate.duplicate_rank=1
    and candidate.valid_recipient
    and not candidate.suppressed
    and not exists(
      select 1
      from public.messages message
      where message.idempotency_key=candidate.idempotency_key
    )
  on conflict(idempotency_key) do nothing;
  get diagnostics queued=row_count;

  insert into public.audit_events(
    actor_id,action,target_type,target_id,metadata_safe
  )
  values(
    actor,
    'name_your_need_receipts_queued',
    'email_campaign',
    'name_your_need_application_receipt_2026',
    jsonb_build_object('queued',queued)
  );
  return queued;
end
$$;
revoke all on function public.queue_name_your_need_receipts(text)
  from public,anon;
grant execute on function public.queue_name_your_need_receipts(text)
  to authenticated;

create or replace function public.retry_name_your_need_receipt_failures(
  p_confirmation text
)
returns int
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=auth.uid();
  retried int:=0;
begin
  if actor is null or not public.has_role('super_admin') then
    raise exception 'Not authorized.';
  end if;
  if p_confirmation<>'RETRY FAILED RECEIPTS' then
    raise exception 'Type the exact retry confirmation.';
  end if;

  update public.messages message
  set
    status='queued',
    attempts=0,
    next_attempt_at=now(),
    last_error_safe=null
  where message.template_key='name_your_need_application_receipt_2026'
    and message.status='failed'
    and message.payload_private is not null
    and not exists(
      select 1
      from public.email_suppressions suppression
      where lower(suppression.email::text)=lower(message.recipient::text)
    );
  get diagnostics retried=row_count;

  insert into public.audit_events(
    actor_id,action,target_type,target_id,metadata_safe
  )
  values(
    actor,
    'name_your_need_receipt_failures_retried',
    'email_campaign',
    'name_your_need_application_receipt_2026',
    jsonb_build_object('retried',retried)
  );
  return retried;
end
$$;
revoke all on function public.retry_name_your_need_receipt_failures(text)
  from public,anon;
grant execute on function public.retry_name_your_need_receipt_failures(text)
  to authenticated;

-- Reviewers can inspect documents only for review work; the bucket remains
-- private and every signed URL expires after five minutes in the application.
drop policy if exists "application documents own read" on storage.objects;
create policy "application documents own read"
on storage.objects
for select
to authenticated
using(
  bucket_id='application-documents'
  and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.has_role('reviewer')
    or public.has_role('program_admin')
    or public.has_role('super_admin')
  )
);

create or replace function public.assign_application_reviewer(
  p_application_id uuid,
  p_reviewer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=auth.uid();
  assignment_id uuid;
begin
  if actor is null or not (
    public.has_role('program_admin') or public.has_role('super_admin')
  ) then
    raise exception 'Not authorized.';
  end if;
  if not exists(
    select 1
    from public.user_roles
    where user_id=p_reviewer_id
      and active=true
      and role in('reviewer','program_admin','super_admin')
  ) then
    raise exception 'That person does not have active reviewer access.';
  end if;
  if not exists(
    select 1
    from public.applications
    where id=p_application_id
      and status in(
        'applied',
        'review_by_admin',
        'additional_information_needed'
      )
  ) then
    raise exception 'Only a submitted application can be assigned.';
  end if;

  insert into public.review_assignments(application_id,reviewer_id)
  values(p_application_id,p_reviewer_id)
  on conflict(application_id,reviewer_id)
  do update set reviewer_id=excluded.reviewer_id
  returning id into assignment_id;
  insert into public.audit_events(
    actor_id,action,target_type,target_id,metadata_safe
  )
  values(
    actor,
    'reviewer_assigned',
    'review_assignment',
    assignment_id::text,
    jsonb_build_object(
      'application_id',p_application_id,
      'reviewer_id',p_reviewer_id
    )
  );
  return assignment_id;
end
$$;
revoke all on function public.assign_application_reviewer(uuid,uuid)
  from public;
grant execute on function public.assign_application_reviewer(uuid,uuid)
  to authenticated;

create or replace function public.submit_application_review(
  p_assignment_id uuid,
  p_scores jsonb,
  p_notes text,
  p_has_conflict boolean,
  p_conflict_details text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=auth.uid();
  rubric_id uuid;
  rubric_criteria jsonb;
  expected_keys text[];
  score_count int;
  invalid_count int;
  missing_count int;
  unexpected_count int;
begin
  if actor is null
    or not (
      public.has_role('reviewer')
      or public.has_role('program_admin')
      or public.has_role('super_admin')
    )
    or not exists(
      select 1
      from public.review_assignments
      where id=p_assignment_id and reviewer_id=actor
    )
  then
    raise exception 'That review is not assigned to an active reviewer.';
  end if;

  update public.review_assignments
  set
    conflict_disclosed=true,
    has_conflict=p_has_conflict,
    conflict_details=nullif(trim(p_conflict_details),'')
  where id=p_assignment_id;
  if p_has_conflict then
    insert into public.audit_events(
      actor_id,action,target_type,target_id,metadata_safe
    )
    values(
      actor,
      'review_conflict_disclosed',
      'review_assignment',
      p_assignment_id::text,
      jsonb_build_object('has_conflict',true)
    );
    return;
  end if;
  if exists(
    select 1
    from public.reviews
    where assignment_id=p_assignment_id and locked_at is not null
  ) then
    raise exception 'This review is locked.';
  end if;

  select rubric.id,rubric.criteria
  into rubric_id,rubric_criteria
  from public.rubrics rubric
  join public.review_assignments assignment on assignment.id=p_assignment_id
  join public.applications application
    on application.id=assignment.application_id
  where rubric.cycle_id=application.cycle_id
  order by rubric.version desc
  limit 1;
  if rubric_id is null or jsonb_typeof(rubric_criteria)<>'array' then
    raise exception 'No valid rubric is configured for this cycle.';
  end if;

  select array_agg(element->>'key' order by ordinal)
  into expected_keys
  from jsonb_array_elements(rubric_criteria)
    with ordinality as criteria(element,ordinal);
  if expected_keys is null or array_length(expected_keys,1)<1 then
    raise exception 'The rubric has no criteria.';
  end if;

  select
    count(*),
    count(*) filter(where value::text !~ '^([1-5])(\.0+)?$')
  into score_count,invalid_count
  from jsonb_each(p_scores);
  select count(*)
  into missing_count
  from unnest(expected_keys) expected
  where not p_scores ? expected;
  select count(*)
  into unexpected_count
  from jsonb_object_keys(p_scores) supplied
  where not supplied=any(expected_keys);
  if score_count<>array_length(expected_keys,1)
    or invalid_count>0
    or missing_count>0
    or unexpected_count>0
  then
    raise exception 'Complete every rubric criterion with a whole-number score from 1 to 5.';
  end if;

  insert into public.reviews(
    assignment_id,rubric_id,scores,notes,locked_at,updated_at
  )
  values(
    p_assignment_id,
    rubric_id,
    p_scores,
    nullif(trim(p_notes),''),
    now(),
    now()
  )
  on conflict(assignment_id)
  do update set
    rubric_id=excluded.rubric_id,
    scores=excluded.scores,
    notes=excluded.notes,
    locked_at=excluded.locked_at,
    updated_at=excluded.updated_at,
    reopened_by=null;
  insert into public.audit_events(
    actor_id,action,target_type,target_id,metadata_safe
  )
  values(
    actor,
    'review_submitted',
    'review_assignment',
    p_assignment_id::text,
    jsonb_build_object('criteria_count',score_count)
  );
end
$$;
revoke all on function public.submit_application_review(
  uuid,jsonb,text,boolean,text
) from public;
grant execute on function public.submit_application_review(
  uuid,jsonb,text,boolean,text
) to authenticated;

insert into public.audit_events(
  actor_id,action,target_type,target_id,metadata_safe
)
values(
  null,
  'staff_passwordless_and_receipt_controls_configured',
  'system',
  'scholarship_administration_2026',
  jsonb_build_object(
    'receipt_template','name_your_need_application_receipt_2026',
    'batch_sent',false
  )
);
