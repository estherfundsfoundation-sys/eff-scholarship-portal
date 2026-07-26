create table if not exists public.reach_ambassador_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  preferred_name text,
  email citext not null unique,
  phone text,
  institution text not null,
  city text,
  state text,
  major text,
  class_year text,
  expected_graduation text,
  instagram_handle text,
  why_reach text not null,
  campus_need text not null,
  service_experience text,
  availability_confirmed boolean not null default false,
  conduct_confirmed boolean not null default false,
  privacy_confirmed boolean not null default false,
  communications_consent boolean not null default false,
  status text not null default 'accepted' check (status in ('accepted','withdrawn','inactive')),
  accepted_at timestamptz not null default now(),
  welcome_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reach_ambassador_applications enable row level security;
revoke all on public.reach_ambassador_applications from anon, authenticated;

alter table public.reach_ambassadors
  add column if not exists application_id uuid unique references public.reach_ambassador_applications(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists training_started_at timestamptz,
  add column if not exists training_completed_at timestamptz,
  add column if not exists training_score integer check (training_score is null or training_score between 0 and 100),
  add column if not exists certified_at timestamptz,
  add column if not exists certificate_code text unique,
  add column if not exists welcome_sent_at timestamptz;

update public.reach_ambassadors
set accepted_at = coalesce(accepted_at, invited_at, created_at)
where accepted_at is null;

insert into public.reach_resources (title, description, category, resource_url)
select 'REACH Ambassador Group Chat',
       'Join the official GroupMe for program updates, questions, and ambassador announcements.',
       'Start here',
       'https://groupme.com/join_group/115383772/RY1wMSj8'
where not exists (
  select 1 from public.reach_resources
  where resource_url = 'https://groupme.com/join_group/115383772/RY1wMSj8'
);

insert into public.reach_resources (title, description, category, resource_url)
select 'Create Your Ambassador Introduction Graphic',
       'Use the official Canva template to introduce yourself from your personal social media account. Do not create a separate EFF or REACH account.',
       'Branding & social media',
       'https://canva.link/ylmn6n7bgocjlcp'
where not exists (
  select 1 from public.reach_resources
  where resource_url = 'https://canva.link/ylmn6n7bgocjlcp'
);

insert into public.reach_resources (title, description, category, resource_url)
select 'When Someone Is Struggling: EFF Care Protocol',
       'A practical, student-safe response guide for recognizing concern, listening, referring, and escalating urgent situations.',
       'Student care',
       'https://img1.wsimg.com/blobby/go/48c2e676-ccf9-40a0-800c-597ffdb670e2/downloads/3ba8f26c-e975-454c-b15e-928c2c0c5f6a/EFF_When_Someone_Is_Struggling_Care_Protocol.pdf?ver=1784762753677'
where not exists (
  select 1 from public.reach_resources
  where resource_url like '%EFF_When_Someone_Is_Struggling_Care_Protocol.pdf%'
);

insert into public.reach_resources (title, description, category, resource_url)
select 'Professional Communication & Email Etiquette',
       'Use this guide when contacting students, campus offices, partners, and the EFF National Office.',
       'Professionalism',
       'https://img1.wsimg.com/blobby/go/48c2e676-ccf9-40a0-800c-597ffdb670e2/downloads/4ff29f35-6027-4445-a420-a000d60395e3/Professional_Communication_Email_Etiquette.pdf?ver=1784762753677'
where not exists (
  select 1 from public.reach_resources
  where resource_url like '%Professional_Communication_Email_Etiquette.pdf%'
);

insert into public.reach_resources (title, description, category, resource_url)
select 'Community Service Ideas Toolkit',
       'Ready-to-adapt service ideas for campus outreach, student support, and community engagement.',
       'Workshop toolkit',
       'https://img1.wsimg.com/blobby/go/48c2e676-ccf9-40a0-800c-597ffdb670e2/Foundation_Branding_Design_EFF-Community-Servi.pdf'
where not exists (
  select 1 from public.reach_resources
  where resource_url like '%EFF-Community-Servi.pdf'
);

insert into public.reach_resources (title, description, category, resource_url)
select 'EFF Community Service Hour Log',
       'Document verified service hours using the official EFF Word template.',
       'Reporting form',
       'https://img1.wsimg.com/blobby/go/48c2e676-ccf9-40a0-800c-597ffdb670e2/downloads/091e1717-16af-4d6b-b43f-5b36fec6e1d9/Foundation_Branding_Design_EFF-Community-Serv.docx?ver=1784762754972'
where not exists (
  select 1 from public.reach_resources
  where resource_url like '%091e1717-16af-4d6b-b43f-5b36fec6e1d9%'
);

insert into public.reach_resources (title, description, category, resource_url)
select 'Chapter Community Service Hours Log',
       'Use this official Word template when a chapter or campus group completes a REACH service activity.',
       'Reporting form',
       'https://img1.wsimg.com/blobby/go/48c2e676-ccf9-40a0-800c-597ffdb670e2/downloads/d9775774-b2df-4660-8fa7-281cf7ebd6ce/Foundation_Branding_Design_EFF-Chapter-Commun.docx?ver=1784762754972'
where not exists (
  select 1 from public.reach_resources
  where resource_url like '%d9775774-b2df-4660-8fa7-281cf7ebd6ce%'
);

insert into public.reach_resources (title, description, category, resource_url)
select 'Conflict Resolution Center',
       'Use EFF conflict-resolution guidance and worksheets to address disagreements professionally and early.',
       'Leadership toolkit',
       'https://estherfundsfoundation.org/conflict-resolution'
where not exists (
  select 1 from public.reach_resources
  where resource_url = 'https://estherfundsfoundation.org/conflict-resolution'
);

insert into public.reach_resources (title, description, category, resource_url)
select 'Complete EFF Chapter Resource Drive',
       'Access the official shared resource folder for approved chapter and ambassador materials.',
       'Resource library',
       'https://drive.google.com/drive/folders/1T6mZClcxmPIdPL2IPxt1tLa8j7pS6bhA?usp=drive_link'
where not exists (
  select 1 from public.reach_resources
  where resource_url = 'https://drive.google.com/drive/folders/1T6mZClcxmPIdPL2IPxt1tLa8j7pS6bhA?usp=drive_link'
);

comment on table public.reach_ambassador_applications is
  'Private REACH Ambassador interest and onboarding records. Applications are automatically accepted into training; certification requires a passing assessment.';

comment on table public.reach_ambassadors is
  'Active REACH Ambassador roster. New applicants enter automatically; secure workspace access requires a verified email match and certification requires a passing assessment.';
