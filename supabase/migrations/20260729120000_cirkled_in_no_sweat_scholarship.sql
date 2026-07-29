-- Publish Cirkled In's quarterly No Sweat Scholarship after the provider
-- directly requested inclusion in EFF's directory on July 28, 2026.

insert into public.external_sources (
  key,
  name,
  directory_url,
  permission_status,
  permission_notes,
  active,
  frequency_minutes,
  parser_version,
  health,
  last_success_at,
  last_error,
  failure_count
)
values (
  'cirkled_in',
  'Cirkled In',
  'https://www.cirkledin.com/scholarships/',
  'written_permission',
  'Cirkled In Scholarship Committee requested that EFF list this scholarship by email on July 28, 2026.',
  true,
  21600,
  '1.0.0',
  'healthy',
  now(),
  null,
  0
)
on conflict (key) do update set
  name = excluded.name,
  directory_url = excluded.directory_url,
  permission_status = excluded.permission_status,
  permission_notes = excluded.permission_notes,
  active = true,
  parser_version = excluded.parser_version,
  health = 'healthy',
  last_success_at = now(),
  last_error = null,
  failure_count = 0;

with upserted as (
  insert into public.external_scholarships (
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
    'cirkled-in-no-sweat-scholarship-2026',
    'Cirkled In''s No Sweat Scholarship',
    'cirkled in s no sweat scholarship',
    'Cirkled In',
    'A free, no-essay scholarship open to students in grades 9–12, including homeschool students. There is no GPA or income requirement. One $2,500 award is offered each quarter; confirm the current terms on the provider''s website.',
    '$2,500',
    2500,
    'date'::public.deadline_kind,
    date '2026-09-30',
    'https://www.cirkledin.com/scholarships/',
    'https://www.cirkledin.com/scholarships',
    '{"academic_levels":["high school"],"categories":["general","no-essay","homeschool"]}'::jsonb,
    now(),
    null,
    now()
  )
  on conflict (canonical_url) do update set
    slug = excluded.slug,
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
insert into public.source_observations (
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
  'https://www.cirkledin.com/scholarships/',
  jsonb_build_object(
    'title', 'Cirkled In''s No Sweat Scholarship',
    'sponsor', 'Cirkled In',
    'amountText', '$2,500',
    'numberOfAwards', '1 per quarter',
    'applicationPeriod', 'July 1–September 30, 2026',
    'deadlineText', 'September 30, 2026',
    'originalUrl', 'https://www.cirkledin.com/scholarships/',
    'sourceUrl', 'https://www.cirkledin.com/scholarships/',
    'academicLevels', jsonb_build_array('high school'),
    'categoryTags', jsonb_build_array('general', 'no-essay', 'homeschool'),
    'eligibilityNotes', jsonb_build_array(
      'Open to students in grades 9–12, including homeschool students',
      'No GPA requirement',
      'No income restriction',
      'No essay required',
      'Free to apply'
    )
  ),
  now()
from upserted scholarship
join public.external_sources source on source.key = 'cirkled_in'
on conflict (source_id, source_record_key) do update set
  scholarship_id = excluded.scholarship_id,
  source_page_url = excluded.source_page_url,
  observed_data = excluded.observed_data,
  last_seen_at = now();
