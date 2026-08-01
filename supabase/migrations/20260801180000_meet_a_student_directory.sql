-- EFF Meet a Student directory. Student-directed contributions are completed
-- on approved external pages and are never processed or held by EFF here.
create table if not exists public.student_support_profiles(
 id uuid primary key default gen_random_uuid(),student_id uuid not null unique references public.profiles(id) on delete cascade,slug text not null unique,
 display_name text not null default '',headline text,institution text,location_text text,major text,class_year text,story text,need_summary text,
 amount_needed numeric(12,2) check(amount_needed is null or(amount_needed>0 and amount_needed<=100000)),fundraiser_url text,fundraiser_platform text,
 private_photo_path text,public_photo_path text,verification_document_path text,verification_document_name text,verification_document_type text,
 status text not null default 'draft' check(status in('draft','pending','changes_requested','approved','declined','paused','withdrawn')),
 consent_confirmed boolean not null default false,accuracy_confirmed boolean not null default false,age_or_guardian_confirmed boolean not null default false,sensitive_information_warning_confirmed boolean not null default false,
 review_note text,verification_checklist jsonb not null default '{}'::jsonb,submitted_at timestamptz,reviewed_at timestamptz,reviewed_by uuid references public.profiles,
 link_verified_at timestamptz,published_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint student_support_submitted_fields check(status in('draft','withdrawn') or(length(trim(display_name)) between 2 and 80 and length(trim(coalesce(headline,''))) between 10 and 140 and length(trim(coalesce(institution,''))) between 2 and 160 and length(trim(coalesce(story,''))) between 150 and 2500 and length(trim(coalesce(need_summary,''))) between 40 and 500 and amount_needed is not null and fundraiser_url~'^https://' and verification_document_path is not null and consent_confirmed and accuracy_confirmed and age_or_guardian_confirmed and sensitive_information_warning_confirmed))
);
create index if not exists student_support_public_idx on public.student_support_profiles(status,published_at desc);
create index if not exists student_support_review_idx on public.student_support_profiles(status,submitted_at asc);
create index if not exists student_support_institution_idx on public.student_support_profiles(lower(institution));
alter table public.student_support_profiles enable row level security;
drop policy if exists "student_support_public_read" on public.student_support_profiles;
create policy "student_support_public_read" on public.student_support_profiles for select to anon,authenticated using(status='approved' and published_at is not null);
drop policy if exists "student_support_owner_read" on public.student_support_profiles;
create policy "student_support_owner_read" on public.student_support_profiles for select to authenticated using(student_id=auth.uid());
drop policy if exists "student_support_owner_insert" on public.student_support_profiles;
create policy "student_support_owner_insert" on public.student_support_profiles for insert to authenticated with check(student_id=auth.uid() and status='draft');
drop policy if exists "student_support_owner_update" on public.student_support_profiles;
create policy "student_support_owner_update" on public.student_support_profiles for update to authenticated using(student_id=auth.uid()) with check(student_id=auth.uid() and status in('draft','pending','changes_requested','withdrawn'));
drop policy if exists "student_support_admin_manage" on public.student_support_profiles;
create policy "student_support_admin_manage" on public.student_support_profiles for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
grant select on public.student_support_profiles to anon,authenticated;grant insert,update on public.student_support_profiles to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('student-support-private','student-support-private',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf']),
 ('student-support-public','student-support-public',true,6291456,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "student_support_public_media_read" on storage.objects;
create policy "student_support_public_media_read" on storage.objects for select to public using(bucket_id='student-support-public');

insert into public.email_templates(program_id,event_key,subject,body,version)
select null,'student_support_received','EFF received your Meet a Student profile','<p>Hello {{name}},</p><h1>Your profile is in review</h1><p>{{message}}</p><p>Your profile is private while EFF verifies the public story, external link, consent, and documentation. Submission does not guarantee publication or financial support.</p><p><a href="{{portal_url}}">Track your profile</a></p>',1 where not exists(select 1 from public.email_templates where program_id is null and event_key='student_support_received' and version=1);
insert into public.email_templates(program_id,event_key,subject,body,version)
select null,'student_support_approved','Your EFF Meet a Student profile is live','<p>Hello {{name}},</p><h1>Your profile is live</h1><p>{{message}}</p><p>Donors can read your profile and continue to your approved external support link. EFF does not promise donations or control transactions on that platform.</p><p><a href="{{portal_url}}">View your public profile</a></p>',1 where not exists(select 1 from public.email_templates where program_id is null and event_key='student_support_approved' and version=1);
insert into public.email_templates(program_id,event_key,subject,body,version)
select null,'student_support_changes','Updates are needed for your Meet a Student profile','<p>Hello {{name}},</p><h1>Please update your profile</h1><p>{{message}}</p><p>Your profile is not public. Make the correction and submit again.</p><p><a href="{{portal_url}}">Update your profile</a></p>',1 where not exists(select 1 from public.email_templates where program_id is null and event_key='student_support_changes' and version=1);
insert into public.email_templates(program_id,event_key,subject,body,version)
select null,'student_support_declined','Update on your EFF Meet a Student submission','<p>Hello {{name}},</p><h1>Profile review update</h1><p>{{message}}</p><p>Your submission was not published. This applies only to the directory and is not a decision about an EFF scholarship or program.</p><p><a href="{{portal_url}}">Review your status</a></p>',1 where not exists(select 1 from public.email_templates where program_id is null and event_key='student_support_declined' and version=1);
insert into public.email_templates(program_id,event_key,subject,body,version)
select null,'student_support_admin_alert','A Meet a Student profile is ready for review','<p>Hello {{name}},</p><h1>National-office review needed</h1><p>{{message}}</p><p><a href="{{portal_url}}">Open the protected review</a></p>',1 where not exists(select 1 from public.email_templates where program_id is null and event_key='student_support_admin_alert' and version=1);
insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(null,'student_support_directory_configured','system','meet_a_student',jsonb_build_object('approval_required',true,'payment_custody','external_platform'));
