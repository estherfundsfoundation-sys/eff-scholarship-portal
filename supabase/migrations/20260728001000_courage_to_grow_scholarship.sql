-- Publish the Courage to Grow Scholarship after the provider directly asked
-- Esther Funds Foundation to share the opportunity with students.

insert into public.external_sources(
  key,
  name,
  directory_url,
  permission_status,
  permission_notes,
  parser_version,
  active,
  health,
  failure_count,
  last_error
)
values (
  'courage_to_grow',
  'Courage to Grow',
  'https://couragetogrowscholarship.com/',
  'written_permission',
  'The scholarship provider directly requested directory publication by email on July 27, 2026.',
  '1.0.0',
  true,
  'healthy',
  0,
  null
)
on conflict (key) do update set
  name = excluded.name,
  directory_url = excluded.directory_url,
  permission_status = excluded.permission_status,
  permission_notes = excluded.permission_notes,
  parser_version = excluded.parser_version,
  active = true,
  health = 'healthy',
  failure_count = 0,
  last_error = null;
with upserted as (
  insert into public.external_scholarships(
    slug,
    title,
    normalized_title,
    sponsor,
    summary,
    amount_text,
    amount_numeric,
    deadline_kind,
    deadline,
    original_url,
    canonical_url,
    eligibility,
    published_at,
    archived_at,
    updated_at
  )
  values (
    'courage-to-grow-scholarship-2026',
    'Courage to Grow Scholarship',
    'courage to grow scholarship',
    'Courage to Grow',
    'A quarterly essay scholarship for eligible U.S. high-school juniors and seniors and college students with a minimum 2.5 GPA. Applicants submit an essay of 250 words or fewer explaining why they should receive the scholarship. Confirm all requirements on the provider website before applying.',
    '$1,000',
    1000,
    'date'::public.deadline_kind,
    date '2026-09-30',
    'https://couragetogrowscholarship.com/',
    'https://couragetogrowscholarship.com',
    '{"academic_levels":["high school","undergraduate","graduate"],"categories":["general","essay"],"citizenship":["U.S. citizens"],"minimum_gpa":2.5}'::jsonb,
    now(),
    null,
    now()
  )
  on conflict (canonical_url) do update set
    title = excluded.title,
    normalized_title = excluded.normalized_title,
    sponsor = excluded.sponsor,
    summary = excluded.summary,
    amount_text = excluded.amount_text,
    amount_numeric = excluded.amount_numeric,
    deadline_kind = excluded.deadline_kind,
    deadline = excluded.deadline,
    original_url = excluded.original_url,
    eligibility = excluded.eligibility,
    published_at = coalesce(public.external_scholarships.published_at, now()),
    archived_at = null,
    updated_at = now()
  returning id, canonical_url
)
insert into public.source_observations(
  source_id,
  scholarship_id,
  source_record_key,
  source_page_url,
  observed_data,
  last_seen_at
)
select
  source.id,
  scholarship.id,
  md5(scholarship.canonical_url),
  'https://couragetogrowscholarship.com/',
  jsonb_build_object(
    'title', 'Courage to Grow Scholarship',
    'sponsor', 'Courage to Grow',
    'amountText', '$1,000',
    'deadlineText', 'September 30, 2026',
    'originalUrl', 'https://couragetogrowscholarship.com/',
    'sourceUrl', 'https://couragetogrowscholarship.com/',
    'academicLevels', jsonb_build_array('high school', 'undergraduate', 'graduate'),
    'categoryTags', jsonb_build_array('general', 'essay'),
    'minimumGpa', 2.5,
    'citizenship', 'U.S. citizens'
  ),
  now()
from upserted scholarship
join public.external_sources source on source.key = 'courage_to_grow'
on conflict (source_id, source_record_key) do update set
  scholarship_id = excluded.scholarship_id,
  source_page_url = excluded.source_page_url,
  observed_data = excluded.observed_data,
  last_seen_at = now();
