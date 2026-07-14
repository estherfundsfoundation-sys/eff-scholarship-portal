-- Name Your Need 2026 public cycle, versioned application, secure uploads, and retry-safe submission.
do $$ declare p uuid; c uuid; begin
  update public.programs set description='A need-based award where students name what they need most to stay enrolled.', active=true where slug='name-your-need' returning id into p;
  insert into public.program_cycles(program_id,name,opens_at,closes_at,award_config,status)
  values(p,'2026','2026-07-14 00:00:00-04','2026-07-31 23:59:59-04','{"amount":"Applicant-requested; final award determined by EFF","deadline_display":"July 31, 2026"}','open')
  on conflict(program_id,name) do update set opens_at=excluded.opens_at,closes_at=excluded.closes_at,award_config=excluded.award_config,status='open'
  returning id into c;
  insert into public.form_versions(cycle_id,version,schema,published_at) values(c,1,$json${"title":"Name Your Need Scholarship","sections":[{"key":"eligibility","title":"Eligibility","required":["residency_status","fafsa_completed","unmet_need_verified","undergraduate_no_bachelors","accredited_us_institution"]},{"key":"applicant","title":"About you","required":["legal_name","date_of_birth","personal_email","phone","address"]},{"key":"education","title":"Education","required":["institution","student_id","class_standing","major","expected_graduation","enrollment_status"]},{"key":"need","title":"Name your need","required":["amount_requested","need_category","financial_need_description"]},{"key":"essays","title":"Your story and faith reflection","required":["story","faith_reflection"]},{"key":"documents","title":"Documents","required":["headshot","enrollment_proof","financial_need_proof"]},{"key":"certification","title":"Certification","required":["certification","signature"]}]}$json$::jsonb,now()) on conflict(cycle_id,version) do update set schema=excluded.schema,published_at=excluded.published_at;
  insert into public.policy_versions(cycle_id,version,body,published_at) values(c,1,$policy$By submitting, I certify that the information is true and complete; I meet every published eligibility requirement; I authorize Esther Funds Foundation to verify enrollment and financial need; I understand an application does not guarantee an award; and I consent to electronic records and communications about this application. EFF may correct, deny, withdraw, or revoke an award based on inaccurate information or unmet requirements. My sensitive information will be used only for scholarship administration, verification, reporting, and legal compliance.$policy$,now()) on conflict(cycle_id,version) do update set body=excluded.body,published_at=excluded.published_at;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('application-documents','application-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "application documents own insert" on storage.objects;
create policy "application documents own insert" on storage.objects for insert to authenticated with check(bucket_id='application-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "application documents own read" on storage.objects;
create policy "application documents own read" on storage.objects for select to authenticated using(bucket_id='application-documents' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_role('program_admin') or public.has_role('super_admin')));
drop policy if exists "application documents own update" on storage.objects;
create policy "application documents own update" on storage.objects for update to authenticated using(bucket_id='application-documents' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='application-documents' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "applications_owner_insert" on public.applications for insert to authenticated with check(applicant_id=auth.uid() and status='draft');
create policy "documents_owner_insert" on public.documents for insert to authenticated with check(owner_id=auth.uid() and exists(select 1 from public.applications a where a.id=application_id and a.applicant_id=auth.uid() and a.status in('draft','additional_information_needed')));
alter table public.policy_acceptances enable row level security;
create policy "acceptances_owner_read" on public.policy_acceptances for select to authenticated using(accepted_by=auth.uid());

create or replace function public.submit_application(p_application_id uuid,p_policy_version_id uuid,p_answers jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare caller uuid:=auth.uid(); prior public.application_status; required_docs int; required_keys text[]:=array['residency_status','fafsa_completed','unmet_need_verified','undergraduate_no_bachelors','accredited_us_institution','legal_name','date_of_birth','personal_email','phone','address','institution','student_id','class_standing','major','expected_graduation','enrollment_status','amount_requested','need_category','financial_need_description','story','faith_reflection','certification','signature']; missing text;
begin
  if caller is null then raise exception 'Please sign in again.'; end if;
  select status into prior from public.applications where id=p_application_id and applicant_id=caller for update;
  if prior is null or prior not in('draft','additional_information_needed') then raise exception 'This application cannot be submitted.'; end if;
  select key into missing from unnest(required_keys) key where nullif(trim(p_answers->>key),'') is null limit 1;
  if missing is not null then raise exception 'A required answer is missing: %',missing; end if;
  if exists(select 1 from unnest(array['residency_status','fafsa_completed','unmet_need_verified','undergraduate_no_bachelors','accredited_us_institution']) key where p_answers->>key<>'yes') then raise exception 'All eligibility requirements must be met.'; end if;
  if char_length(p_answers->>'story')<300 or char_length(p_answers->>'faith_reflection')<80 then raise exception 'Please complete both written responses.'; end if;
  select count(distinct kind) into required_docs from public.documents where application_id=p_application_id and replaced_by is null and kind in('headshot','enrollment_proof','financial_need_proof');
  if required_docs<>3 then raise exception 'Upload all three required documents.'; end if;
  insert into public.application_answers(application_id,question_key,value) select p_application_id,key,to_jsonb(value) from jsonb_each_text(p_answers) on conflict(application_id,question_key) do update set value=excluded.value,updated_at=now();
  insert into public.policy_acceptances(application_id,policy_version_id,accepted_by) values(p_application_id,p_policy_version_id,caller) on conflict(application_id,policy_version_id) do nothing;
  update public.applications set status='applied',submitted_at=coalesce(submitted_at,now()),updated_at=now() where id=p_application_id;
  insert into public.status_history(application_id,previous_status,new_status,actor_id,applicant_note) values(p_application_id,prior,'applied',caller,'Your application was submitted successfully.');
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(caller,'application_submitted','application',p_application_id::text,jsonb_build_object('policy_version_id',p_policy_version_id));
end $$;
revoke all on function public.submit_application(uuid,uuid,jsonb) from public;
grant execute on function public.submit_application(uuid,uuid,jsonb) to authenticated;
