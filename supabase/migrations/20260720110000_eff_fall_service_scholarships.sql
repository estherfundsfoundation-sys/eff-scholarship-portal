-- Opens two Fall 2026 EFF service scholarships with program-specific forms and secure evidence requirements.
do $$
declare
  eboard_program uuid;
  eboard_cycle uuid;
  ambassador_program uuid;
  ambassador_cycle uuid;
begin
  insert into public.programs(slug,name,description,program_type,active)
  values(
    'collegiate-executive-board-service-scholarship',
    'EFF Collegiate Executive Board Service Scholarship',
    'A $1,000 scholarship recognizing an EFF collegiate executive board member whose leadership, reliability, chapter climate, and documented service demonstrate excellence.',
    'scholarship',
    true
  )
  on conflict(slug) do update set name=excluded.name,description=excluded.description,program_type=excluded.program_type,active=true
  returning id into eboard_program;

  insert into public.program_cycles(program_id,name,opens_at,closes_at,award_config,status)
  values(eboard_program,'Fall Service 2026','2026-07-20 00:00:00-04','2026-12-31 23:59:59-05','{"amount":"$1,000","amount_numeric":1000,"deadline_display":"December 31, 2026 at 11:59 p.m. Eastern","selection_note":"One recipient after verification and review"}'::jsonb,'open')
  on conflict(program_id,name) do update set opens_at=excluded.opens_at,closes_at=excluded.closes_at,award_config=excluded.award_config,status='open'
  returning id into eboard_cycle;

  insert into public.form_versions(cycle_id,version,schema,published_at)
  values(eboard_cycle,1,$json${"title":"EFF Collegiate Executive Board Service Scholarship","award":"$1,000","essay_words":"400-600","sections":[{"key":"eligibility","required":["full_time_student","active_eff_member","good_standing","fafsa_completed"]},{"key":"service","required":["board_role","chapter_name","service_start_date","meeting_attendance","task_completion","service_hours_total"]},{"key":"leadership","required":["leadership_essay"]},{"key":"documents","required":["enrollment_proof","fafsa_summary","service_hours_proof","recommendation_letter"]},{"key":"certification","required":["certification","signature"]}]}$json$::jsonb,now())
  on conflict(cycle_id,version) do update set schema=excluded.schema,published_at=excluded.published_at;

  insert into public.policy_versions(cycle_id,version,body,published_at)
  values(eboard_cycle,1,$policy$By submitting, I certify that my information, EFF service record, meeting attendance, task completion, community-service hours, recommendation, enrollment information, and financial-aid documentation are true and complete. I authorize Esther Funds Foundation to verify the information with my school, chapter advisor, EFF leadership, and service organizations. I understand that submission does not guarantee an award, that one selected recipient is eligible for a $1,000 scholarship after verification and review, and that official updates will be posted in the portal. I confirm that I removed Social Security numbers, FSA IDs, passwords, tax-return details, bank information, and full financial account numbers from uploaded documents.$policy$,now())
  on conflict(cycle_id,version) do update set body=excluded.body,published_at=excluded.published_at;

  insert into public.programs(slug,name,description,program_type,active)
  values(
    'eff-ambassador-service-scholarship',
    'EFF Ambassador Service Scholarship',
    'A $1,000 scholarship recognizing an EFF ambassador whose documented fall work, community service, and student-centered impact advance Every Future Fulfilled.',
    'scholarship',
    true
  )
  on conflict(slug) do update set name=excluded.name,description=excluded.description,program_type=excluded.program_type,active=true
  returning id into ambassador_program;

  insert into public.program_cycles(program_id,name,opens_at,closes_at,award_config,status)
  values(ambassador_program,'Fall Service 2026','2026-07-20 00:00:00-04','2026-12-31 23:59:59-05','{"amount":"$1,000","amount_numeric":1000,"deadline_display":"December 31, 2026 at 11:59 p.m. Eastern","minimum_gpa":"None","selection_note":"One recipient after verification and review"}'::jsonb,'open')
  on conflict(program_id,name) do update set opens_at=excluded.opens_at,closes_at=excluded.closes_at,award_config=excluded.award_config,status='open'
  returning id into ambassador_cycle;

  insert into public.form_versions(cycle_id,version,schema,published_at)
  values(ambassador_cycle,1,$json${"title":"EFF Ambassador Service Scholarship","award":"$1,000","minimum_gpa":"None","essay_words":"400-600","sections":[{"key":"eligibility","required":["full_time_student","active_eff_member","good_standing","fafsa_completed"]},{"key":"service","required":["ambassador_service_start_date","ambassador_work_summary","service_hours_total"]},{"key":"impact","required":["ambassador_essay"]},{"key":"documents","required":["enrollment_proof","fafsa_summary","service_hours_proof","ambassador_work_proof"]},{"key":"certification","required":["certification","signature"]}]}$json$::jsonb,now())
  on conflict(cycle_id,version) do update set schema=excluded.schema,published_at=excluded.published_at;

  insert into public.policy_versions(cycle_id,version,body,published_at)
  values(ambassador_cycle,1,$policy$By submitting, I certify that my information, EFF ambassador work, community-service hours, enrollment information, and financial-aid documentation are true and complete. I authorize Esther Funds Foundation to verify the information with my school, EFF leadership, and service organizations. I understand that there is no minimum GPA requirement, that submission does not guarantee an award, that one selected recipient is eligible for a $1,000 scholarship after verification and review, and that official updates will be posted in the portal. I confirm that I removed Social Security numbers, FSA IDs, passwords, tax-return details, bank information, and full financial account numbers from uploaded documents.$policy$,now())
  on conflict(cycle_id,version) do update set body=excluded.body,published_at=excluded.published_at;
end $$;

create or replace function public.submit_application(p_application_id uuid,p_policy_version_id uuid,p_answers jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare
  caller uuid:=auth.uid();
  prior public.application_status;
  program_slug text;
  required_docs int;
  required_keys text[];
  eligibility_keys text[];
  required_doc_keys text[];
  missing text;
begin
  if caller is null then raise exception 'Please sign in again.'; end if;

  select a.status,p.slug into prior,program_slug
  from public.applications a
  join public.program_cycles c on c.id=a.cycle_id
  join public.programs p on p.id=c.program_id
  where a.id=p_application_id and a.applicant_id=caller
  for update of a;

  if prior is null or prior not in('draft','additional_information_needed') then raise exception 'This application cannot be submitted.'; end if;

  if program_slug='collegiate-executive-board-service-scholarship' then
    required_keys:=array['full_time_student','active_eff_member','good_standing','fafsa_completed','legal_name','personal_email','phone','institution','student_id','expected_graduation','board_role','chapter_name','service_start_date','meeting_attendance','task_completion','service_hours_total','recommender_name','recommender_role','recommender_email','leadership_essay','certification','signature'];
    eligibility_keys:=array['full_time_student','active_eff_member','good_standing','fafsa_completed'];
    required_doc_keys:=array['enrollment_proof','fafsa_summary','service_hours_proof','recommendation_letter'];
  elsif program_slug='eff-ambassador-service-scholarship' then
    required_keys:=array['full_time_student','active_eff_member','good_standing','fafsa_completed','legal_name','personal_email','phone','institution','student_id','expected_graduation','ambassador_service_start_date','ambassador_work_summary','service_hours_total','ambassador_essay','certification','signature'];
    eligibility_keys:=array['full_time_student','active_eff_member','good_standing','fafsa_completed'];
    required_doc_keys:=array['enrollment_proof','fafsa_summary','service_hours_proof','ambassador_work_proof'];
  else
    required_keys:=array['residency_status','fafsa_completed','unmet_need_verified','undergraduate_no_bachelors','accredited_us_institution','legal_name','date_of_birth','personal_email','phone','address','institution','student_id','class_standing','major','expected_graduation','enrollment_status','amount_requested','need_category','financial_need_description','story','faith_reflection','certification','signature'];
    eligibility_keys:=array['residency_status','fafsa_completed','unmet_need_verified','undergraduate_no_bachelors','accredited_us_institution'];
    required_doc_keys:=array['headshot','enrollment_proof','financial_need_proof'];
  end if;

  select key into missing from unnest(required_keys) key where nullif(trim(p_answers->>key),'') is null limit 1;
  if missing is not null then raise exception 'A required answer is missing: %',missing; end if;
  if exists(select 1 from unnest(eligibility_keys) key where p_answers->>key<>'yes') then raise exception 'All eligibility requirements must be met.'; end if;

  if program_slug='collegiate-executive-board-service-scholarship' and char_length(p_answers->>'leadership_essay')<1800 then raise exception 'Please complete the 400–600 word leadership essay.'; end if;
  if program_slug='eff-ambassador-service-scholarship' and char_length(p_answers->>'ambassador_essay')<1800 then raise exception 'Please complete the 400–600 word ambassador essay.'; end if;
  if program_slug not in('collegiate-executive-board-service-scholarship','eff-ambassador-service-scholarship') and (char_length(p_answers->>'story')<300 or char_length(p_answers->>'faith_reflection')<80) then raise exception 'Please complete both written responses.'; end if;

  select count(distinct kind) into required_docs from public.documents where application_id=p_application_id and replaced_by is null and kind=any(required_doc_keys);
  if required_docs<>cardinality(required_doc_keys) then raise exception 'Upload all required documents.'; end if;

  insert into public.application_answers(application_id,question_key,value)
  select p_application_id,key,to_jsonb(value) from jsonb_each_text(p_answers)
  on conflict(application_id,question_key) do update set value=excluded.value,updated_at=now();
  insert into public.policy_acceptances(application_id,policy_version_id,accepted_by) values(p_application_id,p_policy_version_id,caller) on conflict(application_id,policy_version_id) do nothing;
  update public.applications set status='applied',submitted_at=coalesce(submitted_at,now()),updated_at=now() where id=p_application_id;
  insert into public.status_history(application_id,previous_status,new_status,actor_id,applicant_note) values(p_application_id,prior,'applied',caller,'Your application was submitted successfully.');
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(caller,'application_submitted','application',p_application_id::text,jsonb_build_object('policy_version_id',p_policy_version_id,'program_slug',program_slug));
end $$;

revoke all on function public.submit_application(uuid,uuid,jsonb) from public;
grant execute on function public.submit_application(uuid,uuid,jsonb) to authenticated;
