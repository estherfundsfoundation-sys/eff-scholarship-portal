-- Transactional production smoke test. This creates two isolated test users,
-- exercises matching/meeting/session/email records, asserts results, and removes
-- every test row before the migration commits.
do $$
declare
  mentee uuid:=gen_random_uuid(); mentor uuid:=gen_random_uuid(); matched uuid;
  mentee_email text:='futurelink-smoke-mentee-'||replace(mentee::text,'-','')||'@example.invalid';
  mentor_email text:='futurelink-smoke-mentor-'||replace(mentor::text,'-','')||'@example.invalid';
begin
  insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    (mentee,'authenticated','authenticated',mentee_email,now(),'{}','{"legal_name":"FutureLink Smoke Mentee","preferred_name":"Smoke Mentee"}',now(),now()),
    (mentor,'authenticated','authenticated',mentor_email,now(),'{}','{"legal_name":"FutureLink Smoke Mentor","preferred_name":"Smoke Mentor"}',now(),now());

  insert into public.futurelink_profiles(user_id,participant_type,status,verification_status,legal_name,display_name,date_of_birth,school,degree_level,academic_field,career_fields,industries,support_needed,support_offered,experience_tags,timezone,meeting_format,communication_styles,meeting_cadence,availability,mentor_capacity,approved_contact_methods,code_version,code_accepted_at,accuracy_confirmed,adult_confirmed,privacy_confirmed,submitted_at,verified_at,orientation_completed_at,readiness_acknowledged_at)
  values
    (mentee,'student_mentee','searching_for_match','approved','FutureLink Smoke Mentee','Smoke Mentee','2000-01-01','EFF Test University','Undergraduate','Education',array['Education & Student Affairs'],array['Education & Student Affairs'],array['Career exploration','Leadership development'],'{}',array['First-generation student'],'Eastern','Virtual',array['Video call','Email'],'Every other week',array['Weekday evenings'],1,array['Email'],'2026.09',now(),true,true,true,now(),now(),now(),now()),
    (mentor,'professional_mentor','searching_for_match','approved','FutureLink Smoke Mentor','Smoke Mentor','1990-01-01',null,null,'Education',array['Education & Student Affairs'],array['Education & Student Affairs'],'{}',array['Career exploration','Leadership development'],array['First-generation student'],'Eastern','Virtual',array['Video call','Email'],'Every other week',array['Weekday evenings'],1,array['Email'],'2026.09',now(),true,true,true,now(),now(),now(),now());

  matched:=public.futurelink_create_match(mentee,mentor,88,array['Support fit','Career alignment','Compatible availability']);
  if matched is null then raise exception 'FutureLink smoke test: match creation failed'; end if;
  insert into public.messages(recipient,idempotency_key,status,template_key,payload_private,next_attempt_at)
  values(mentee_email,'futurelink-smoke:'||matched||':mentee','queued','futurelink_match_proposed',jsonb_build_object('name','Smoke Mentee','application_path','/future-link/dashboard'),now()),
        (mentor_email,'futurelink-smoke:'||matched||':mentor','queued','futurelink_match_proposed',jsonb_build_object('name','Smoke Mentor','application_path','/future-link/dashboard'),now());
  if (select count(*) from public.messages where idempotency_key like 'futurelink-smoke:'||matched||':%')<>2 then raise exception 'FutureLink smoke test: notification queue failed'; end if;

  update public.futurelink_matches set status='active',contact_released_at=now() where id=matched;
  insert into public.futurelink_meeting_plans(match_id,cadence,weekday,local_time,timezone,zoom_url_private,next_meeting_at,updated_by)
  values(matched,'Every other week','Thursday','18:30','Eastern','https://zoom.us/j/123456789',now()+interval '1 day',mentor);
  insert into public.futurelink_sessions(match_id,mentor_id,mentee_id,session_date,duration_minutes,format,category)
  values(matched,mentor,mentee,current_date,45,'Virtual','Career planning');
  if not exists(select 1 from public.futurelink_meeting_plans where match_id=matched) or not exists(select 1 from public.futurelink_sessions where match_id=matched and status='pending_mentee_confirmation') then raise exception 'FutureLink smoke test: operations records failed'; end if;

  delete from public.messages where recipient in(mentee_email,mentor_email);
  delete from public.audit_events where target_id=matched::text;
  delete from public.futurelink_matches where id=matched;
  delete from auth.users where id in(mentee,mentor);
end $$;
