-- EFF Tech Desk: independent technical-support ticketing, diagnostics,
-- health monitoring, communication, and approval-controlled remediation.

create table if not exists public.tech_desk_systems (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  base_url text not null,
  health_url text not null,
  provider text not null check (provider in ('vercel','supabase','github','godaddy','ecommerce','other')),
  vercel_project text,
  github_repo text,
  supabase_project_ref text,
  active boolean not null default true,
  public_status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tech_desk_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  requester_name text not null,
  preferred_name text,
  email citext not null,
  product_slug text not null references public.tech_desk_systems(slug),
  page_url text,
  issue_category text not null check (issue_category in (
    'password_sign_in','verification_email','account_claim','scholarship_application',
    'document_upload','website_error','broken_link','session_access','data_mismatch',
    'payment','deployment_outage','other'
  )),
  urgency text not null check (urgency in ('deadline_within_72_hours','fully_blocked','partially_blocked','question')),
  deadline_at timestamptz,
  subject text not null,
  description text not null check (char_length(description) between 40 and 6000),
  steps_to_reproduce text not null check (char_length(steps_to_reproduce) between 10 and 4000),
  error_message text,
  browser_device text,
  last_working_at timestamptz,
  status text not null default 'unverified' check (status in (
    'unverified','diagnosing','waiting_on_student','action_ready','staff_review',
    'monitoring','resolved_pending_confirmation','closed_by_student',
    'auto_closed','closed_by_staff'
  )),
  priority text not null default 'P3' check (priority in ('P0','P1','P2','P3')),
  diagnosis_code text,
  diagnosis_summary text,
  recommended_steps jsonb not null default '[]'::jsonb,
  automation_confidence numeric(4,3) check (automation_confidence is null or automation_confidence between 0 and 1),
  health_snapshot jsonb not null default '{}'::jsonb,
  verification_token_hash text unique,
  verification_expires_at timestamptz,
  verified_at timestamptz,
  last_student_message_at timestamptz,
  last_team_message_at timestamptz,
  next_follow_up_at timestamptz,
  follow_up_count integer not null default 0 check (follow_up_count between 0 and 20),
  resolved_at timestamptz,
  closed_at timestamptz,
  closure_reason text,
  satisfaction_rating integer check (satisfaction_rating is null or satisfaction_rating between 1 and 5),
  authorize_diagnostics boolean not null default false,
  privacy_consent boolean not null default false,
  accuracy_certified boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tech_desk_tickets_queue_idx
  on public.tech_desk_tickets(status,priority,updated_at desc);
create index if not exists tech_desk_tickets_email_idx
  on public.tech_desk_tickets(lower(email::text),created_at desc);
create index if not exists tech_desk_tickets_followup_idx
  on public.tech_desk_tickets(next_follow_up_at)
  where next_follow_up_at is not null;

create table if not exists public.tech_desk_access_tokens (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tech_desk_tickets(id) on delete cascade,
  token_hash text not null unique,
  requested_email citext not null,
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tech_desk_access_ticket_idx
  on public.tech_desk_access_tokens(ticket_id,expires_at desc);

create table if not exists public.tech_desk_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tech_desk_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_type text not null check (author_type in ('student','automation','staff','system')),
  author_name text not null,
  body text not null check (char_length(body) between 1 and 6000),
  internal_only boolean not null default false,
  email_provider_id text,
  created_at timestamptz not null default now()
);
create index if not exists tech_desk_messages_ticket_idx
  on public.tech_desk_messages(ticket_id,created_at);

create table if not exists public.tech_desk_events (
  id bigint generated always as identity primary key,
  ticket_id uuid references public.tech_desk_tickets(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  summary_safe text not null,
  metadata_safe jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tech_desk_events_ticket_idx
  on public.tech_desk_events(ticket_id,created_at desc);

create table if not exists public.tech_desk_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tech_desk_tickets(id) on delete cascade,
  storage_path text not null unique,
  filename text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  uploaded_by_type text not null check (uploaded_by_type in ('student','staff')),
  quarantined boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tech_desk_attachments_ticket_idx
  on public.tech_desk_attachments(ticket_id,created_at);

create table if not exists public.tech_desk_health_checks (
  id bigint generated always as identity primary key,
  system_id uuid not null references public.tech_desk_systems(id) on delete cascade,
  status text not null check (status in ('operational','degraded','outage','unknown')),
  http_status integer,
  latency_ms integer,
  detail_safe text,
  source text not null default 'scheduled_probe',
  checked_at timestamptz not null default now()
);
create index if not exists tech_desk_health_latest_idx
  on public.tech_desk_health_checks(system_id,checked_at desc);

create table if not exists public.tech_desk_remediation_jobs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tech_desk_tickets(id) on delete set null,
  system_id uuid references public.tech_desk_systems(id) on delete set null,
  action_type text not null,
  risk_level text not null check (risk_level in ('read_only','safe_reversible','privileged')),
  approval_required boolean not null default true,
  status text not null default 'proposed' check (status in (
    'proposed','approved','running','succeeded','failed','cancelled'
  )),
  request_summary text not null,
  payload_safe jsonb not null default '{}'::jsonb,
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  result_safe text,
  created_at timestamptz not null default now()
);
create index if not exists tech_desk_remediation_queue_idx
  on public.tech_desk_remediation_jobs(status,risk_level,created_at);

create table if not exists public.tech_desk_staff_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('tech_desk_agent','tech_desk_lead','tech_desk_admin')),
  active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id,role)
);

create table if not exists public.tech_desk_knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  summary text not null,
  public_steps jsonb not null default '[]'::jsonb,
  escalation_rule text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tech_desk_email_events (
  id bigint generated always as identity primary key,
  ticket_id uuid references public.tech_desk_tickets(id) on delete cascade,
  event_key text not null,
  recipient_hash text not null,
  status text not null check (status in ('sent','failed','skipped')),
  provider_id text,
  error_safe text,
  created_at timestamptz not null default now()
);
create index if not exists tech_desk_email_ticket_idx
  on public.tech_desk_email_events(ticket_id,created_at desc);

create table if not exists public.tech_desk_settings (
  id boolean primary key default true check (id),
  first_follow_up_days integer not null default 3 check (first_follow_up_days between 1 and 30),
  auto_close_days integer not null default 7 check (auto_close_days between 2 and 60),
  max_student_follow_ups integer not null default 2 check (max_student_follow_ups between 1 and 5),
  updated_at timestamptz not null default now()
);
insert into public.tech_desk_settings(id) values (true) on conflict (id) do nothing;

alter table public.tech_desk_systems enable row level security;
alter table public.tech_desk_tickets enable row level security;
alter table public.tech_desk_access_tokens enable row level security;
alter table public.tech_desk_messages enable row level security;
alter table public.tech_desk_events enable row level security;
alter table public.tech_desk_attachments enable row level security;
alter table public.tech_desk_health_checks enable row level security;
alter table public.tech_desk_remediation_jobs enable row level security;
alter table public.tech_desk_staff_roles enable row level security;
alter table public.tech_desk_knowledge_articles enable row level security;
alter table public.tech_desk_email_events enable row level security;
alter table public.tech_desk_settings enable row level security;

revoke all on public.tech_desk_systems from anon,authenticated;
revoke all on public.tech_desk_tickets from anon,authenticated;
revoke all on public.tech_desk_access_tokens from anon,authenticated;
revoke all on public.tech_desk_messages from anon,authenticated;
revoke all on public.tech_desk_events from anon,authenticated;
revoke all on public.tech_desk_attachments from anon,authenticated;
revoke all on public.tech_desk_health_checks from anon,authenticated;
revoke all on public.tech_desk_remediation_jobs from anon,authenticated;
revoke all on public.tech_desk_staff_roles from anon,authenticated;
revoke all on public.tech_desk_knowledge_articles from anon,authenticated;
revoke all on public.tech_desk_email_events from anon,authenticated;
revoke all on public.tech_desk_settings from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'tech-desk-attachments',
  'tech-desk-attachments',
  false,
  5242880,
  array['image/png','image/jpeg','image/webp','application/pdf','text/plain']
)
on conflict (id) do update set
  public=false,
  file_size_limit=5242880,
  allowed_mime_types=excluded.allowed_mime_types;

insert into public.tech_desk_systems
  (slug,name,base_url,health_url,provider,vercel_project,github_repo)
values
  ('portal','EFF Student Portal','https://portal.estherfundsfoundation.org','https://portal.estherfundsfoundation.org/api/health','vercel','he','estherfundsfoundation-sys/eff-scholarship-portal'),
  ('myeff','MyEFF Membership Portal','https://my.estherfundsfoundation.org','https://my.estherfundsfoundation.org','vercel','my-eff','estherfundsfoundation-sys/my-eff'),
  ('policy','EFF Policy Platform','https://policy.estherfundsfoundation.org','https://policy.estherfundsfoundation.org','vercel','every-future-fulfilled-policy',null),
  ('fundraise','EFF Fundraising Platform','https://fundraise.estherfundsfoundation.org','https://fundraise.estherfundsfoundation.org','vercel',null,null),
  ('partner','EFF Partnership Platform','https://partner.estherfundsfoundation.org','https://partner.estherfundsfoundation.org','vercel',null,null),
  ('back-to-school','EFF Back to School Platform','https://backtoschool.estherfundsfoundation.org','https://backtoschool.estherfundsfoundation.org','vercel','eff-back-to-school-2026',null),
  ('academy','EFF Leadership Academy','https://academy.estherfundsfoundation.org','https://academy.estherfundsfoundation.org','vercel','eff-leadership-academy',null),
  ('main-site','Esther Funds Foundation Website','https://estherfundsfoundation.org','https://estherfundsfoundation.org','godaddy',null,null),
  ('shop','EFF Shop','https://estherfundsfoundation.online','https://estherfundsfoundation.online','ecommerce',null,null),
  ('other','Another EFF Platform','https://estherfundsfoundation.org','https://estherfundsfoundation.org','other',null,null)
on conflict (slug) do update set
  name=excluded.name,
  base_url=excluded.base_url,
  health_url=excluded.health_url,
  provider=excluded.provider,
  vercel_project=excluded.vercel_project,
  github_repo=excluded.github_repo,
  active=true,
  updated_at=now();

insert into public.tech_desk_knowledge_articles
  (code,title,summary,public_steps,escalation_rule)
values
  ('PASSWORD_SIGN_IN','Password or sign-in trouble','Use the correct product sign-in, request one reset link, and open the newest email.',
   '["Confirm you are signing in on the exact EFF platform named in your ticket.","Request one password-reset email and wait up to 10 minutes.","Open only the newest reset email; older links may be invalid.","Use a private browser window if an old session keeps returning.","Never send EFF your password or verification code."]'::jsonb,
   'Escalate after the requester confirms the email address and the newest reset link still fails.'),
  ('VERIFICATION_EMAIL','Verification email did not arrive','Check delivery folders and request one fresh link before staff review.',
   '["Wait up to 10 minutes and search all mail for Esther Funds Foundation.","Check Spam, Promotions, Updates, and institutional quarantine folders.","Confirm the submitted email address is spelled correctly.","Request only one fresh verification link so older links are not confused.","Add notifications@estherfundsinc.org to safe senders."]'::jsonb,
   'Escalate if delivery remains missing after one fresh request.'),
  ('SESSION_EXPIRED','Session expired or loading loop','Clear the stale session and start from the correct product login.',
   '["Close duplicate portal tabs.","Open the platform in a private browser window.","Sign in from the platform home page rather than an old email link.","Allow cookies for the EFF domain.","If the loop continues, capture the page URL and exact time."]'::jsonb,
   'Escalate when the same loop occurs in a private window.'),
  ('PERMISSION_DENIED','Signed in but access is denied','Confirm the account email and product role before any permission change.',
   '["Confirm the email shown in the account menu is the expected email.","Sign out and sign back in from the correct EFF product.","Do not create a second account.","Record the exact page URL and denied message.","Wait for EFF to verify the account-to-record relationship."]'::jsonb,
   'Always require staff review before changing roles, permissions, or record ownership.'),
  ('UPLOAD_FAILED','A document or photo would not upload','Validate the file type, size, name, and connection.',
   '["Use PDF, PNG, JPG, WEBP, or plain text where accepted.","Keep the file under the size shown on the page.","Rename the file using letters, numbers, dashes, and one file extension.","Try again on a stable connection without refreshing mid-upload.","Do not upload passwords, Social Security numbers, bank details, or unredacted IDs."]'::jsonb,
   'Escalate after a known-safe small file fails twice.'),
  ('INVALID_CONFIGURATION','The site reports an API key or configuration error','This is a system configuration issue, not a student mistake.',
   '["Do not repeatedly submit the form.","Record the page URL and exact time.","Capture a screenshot that excludes private information.","EFF Tech Desk will compare the live deployment and service configuration.","Use another official EFF resource only if the page provides one."]'::jsonb,
   'Immediate staff review; environment and provider settings must never be exposed to the requester.'),
  ('DEPLOYMENT_OUTAGE','An EFF website is unavailable','The Tech Desk will compare public site health and deployment status.',
   '["Confirm the address ends in an official EFF domain.","Try once on mobile data or another network.","Record the error page and exact time.","Do not keep submitting forms during an outage.","Check the EFF Tech Desk status page for updates."]'::jsonb,
   'Open a privileged remediation proposal when public health checks confirm an outage.'),
  ('BROKEN_LINK','A page or button leads to the wrong place','Capture the source page and expected destination.',
   '["Copy the page URL where the link appears.","Name the button or link you selected.","Describe what you expected to open.","Record the incorrect destination or error.","Use the Tech Desk knowledge base for a safe alternate route."]'::jsonb,
   'Escalate when the link is on a live EFF production page.'),
  ('APPLICATION_BLOCKED','A scholarship or support application cannot continue','Preserve the existing application and avoid duplicate accounts or submissions.',
   '["Do not create a second account or application.","Save the scholarship name and deadline.","Record the last completed step and exact blocking message.","Use the same email associated with the existing application.","EFF will verify the application record before changing it."]'::jsonb,
   'Prioritize within 72 hours of a verified deadline.'),
  ('GENERAL_TECH','General technical support','Collect reproducible facts and route the issue to the correct EFF system.',
   '["Record the EFF platform, page URL, and exact time.","Copy the full error message without private information.","List the steps that led to the issue.","Try one private-browser test.","Wait for the secure Tech Desk diagnosis."]'::jsonb,
   'Escalate when deterministic guidance does not resolve the issue.')
on conflict (code) do update set
  title=excluded.title,
  summary=excluded.summary,
  public_steps=excluded.public_steps,
  escalation_rule=excluded.escalation_rule,
  active=true,
  updated_at=now();

insert into public.tech_desk_staff_roles(user_id,role,active)
select id,'tech_desk_admin',true
from auth.users
where lower(email)='nationals@estherfundsinc.org'
on conflict (user_id,role) do update set active=true,revoked_at=null;

comment on table public.tech_desk_tickets is
  'Independent EFF technical-support tickets. Never store passwords, verification codes, private API keys, full financial data, or unredacted identity documents.';
comment on table public.tech_desk_remediation_jobs is
  'Production-changing Vercel, GitHub, Supabase, DNS, data, and permission changes require an authorized approval record.';
