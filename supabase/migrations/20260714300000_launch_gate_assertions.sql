do $$
declare missing_rls text; legacy_total int; legacy_committed int; legacy_excluded int;
begin
  select string_agg(c.relname,', ') into missing_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname=any(array['profiles','user_roles','applications','application_answers','documents','policy_acceptances','status_history','internal_notes','information_requests','review_assignments','reviews','decisions','awards','import_jobs','import_rows','legacy_application_records','legacy_claim_tokens','messages','notifications','external_sources','source_observations','external_scholarships','scholarship_exceptions','bookmarks','scholarship_reminders','scholarship_reports','audit_events']) and not c.relrowsecurity;
  if missing_rls is not null then raise exception 'Launch gate: RLS disabled on %',missing_rls;end if;
  if not exists(select 1 from public.program_cycles c join public.programs p on p.id=c.program_id where p.slug='name-your-need' and c.name='2026' and c.status='open' and c.closes_at='2026-08-01 03:59:59+00'::timestamptz) then raise exception 'Launch gate: Name Your Need 2026 cycle is not configured correctly.';end if;
  if not exists(select 1 from public.profiles p join public.user_roles r on r.user_id=p.id where lower(p.primary_email::text)='nationals@estherfundsinc.org' and r.role='super_admin') then raise exception 'Launch gate: designated foundation administrator is missing.';end if;
  select count(*) into legacy_total from public.legacy_application_records;select count(*) into legacy_committed from public.legacy_application_records where status='committed';select count(*) into legacy_excluded from public.legacy_application_records where status='excluded';
  if legacy_total<>2314 or legacy_committed<>2214 or legacy_excluded<>100 then raise exception 'Launch gate: legacy reconciliation mismatch total %, committed %, excluded %.',legacy_total,legacy_committed,legacy_excluded;end if;
  if not exists(select 1 from storage.buckets where id='application-documents' and public=false) then raise exception 'Launch gate: private application document bucket is missing.';end if;
  if (select count(*) from public.external_sources where permission_status='written_permission')<2 then raise exception 'Launch gate: trusted source records are missing.';end if;
  if not exists(select 1 from cron.job where jobname='portal-email-queue' and active) then raise exception 'Launch gate: email scheduler is not active.';end if;
  if exists(select 1 from public.messages where status='processing' and next_attempt_at<now()-interval '30 minutes') then raise exception 'Launch gate: stale email queue claims exist.';end if;
  if to_regprocedure('public.submit_application(uuid,uuid,jsonb)') is null or to_regprocedure('public.claim_legacy_application(text)') is null or to_regprocedure('public.staff_transition_application(uuid,application_status,text,text)') is null or to_regprocedure('public.accept_award(uuid)') is null or to_regprocedure('public.respond_to_information_request(uuid,text)') is null then raise exception 'Launch gate: a critical workflow function is missing.';end if;
end $$;

insert into public.messages(recipient,idempotency_key,status,payload_private,template_key)
values('nationals@estherfundsinc.org','launch-email-test:2026-07-14','queued',jsonb_build_object('name','Esther Funds Foundation team','status','Portal email delivery test','message','This staff-only message confirms that the production EFF Scholarship Portal can deliver transactional email through the paced, retry-safe queue.','application_path','/admin/communications'),'application_status')
on conflict(idempotency_key) do nothing;
