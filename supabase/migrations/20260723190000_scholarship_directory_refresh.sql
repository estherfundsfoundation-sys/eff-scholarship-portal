-- Refresh the three high-value scholarship sources requested by EFF and
-- publish a verified starter set so students are not waiting on the next
-- scheduled importer run.

update public.external_sources
set directory_url = case key
  when 'scholarship_collective' then 'https://www.thescholarshipcollective.com/scholarships'
  when 'jlv_college_counseling' then 'https://jlvcollegecounseling.com/category/scholarships/'
  when 'uncf' then 'https://uncf.org/the-latest/scholarships-for-july-at-uncf'
  else directory_url
end,
parser_version = '2.1.0',
active = true,
health = 'healthy',
failure_count = 0,
last_error = null
where key in ('scholarship_collective', 'jlv_college_counseling', 'uncf');

with verified_seed(
  source_key,
  source_page_url,
  slug,
  title,
  sponsor,
  summary,
  amount_text,
  amount_numeric,
  deadline,
  original_url,
  eligibility
) as (
  values
  (
    'uncf',
    'https://uncf.org/the-latest/scholarships-for-july-at-uncf',
    'intellia-therapeutics-uncf-scholarship-2026',
    '2026-2027 Intellia Therapeutics UNCF Scholarship Program',
    'UNCF',
    'For eligible full-time students at UNCF member institutions or four-year HBCUs who are pursuing life-science fields. Confirm every requirement in the UNCF application.',
    'Up to $5,102',
    5102,
    date '2026-07-31',
    'https://opportunities.uncf.org/s/program-landing-page?id=a2iVJ00000j0MmbYAE',
    '{"academic_levels":["undergraduate","graduate"],"categories":["black-hbcu","stem-health-trades"]}'::jsonb
  ),
  (
    'uncf',
    'https://uncf.org/the-latest/scholarships-for-july-at-uncf',
    'metlife-foundation-legacy-endowed-scholarship-2026',
    '2026-2027 MetLife Foundation Legacy Endowed Scholarship',
    'UNCF',
    'A UNCF opportunity supporting eligible students pursuing clinical professional careers. Confirm the participating institutions, academic requirements, and renewable-award terms in the official application.',
    'Up to $5,000 per year',
    5000,
    date '2026-07-31',
    'https://opportunities.uncf.org/s/program-landing-page?id=a2iVJ00000hj2zNYAQ',
    '{"academic_levels":["undergraduate","graduate"],"categories":["black-hbcu","stem-health-trades"]}'::jsonb
  ),
  (
    'jlv_college_counseling',
    'https://jlvcollegecounseling.com/2026/07/18/scholarship-saturday-july-18-2026/',
    'niche-no-essay-scholarship-july-2026',
    '$2,000 No Essay Scholarship',
    'Niche',
    'Open to eligible high school and college students and people planning to attend college or graduate school within the next year. Review Niche''s official rules before applying.',
    '$2,000',
    2000,
    date '2026-07-31',
    'https://www.niche.com/colleges/scholarships/no-essay-scholarship',
    '{"academic_levels":["high school","undergraduate","graduate"],"categories":["general"]}'::jsonb
  ),
  (
    'jlv_college_counseling',
    'https://jlvcollegecounseling.com/2026/07/18/scholarship-saturday-july-18-2026/',
    'better-financial-future-scholarship-july-2026',
    'A Better Financial Future Scholarship',
    'Smarter College',
    'A current monthly scholarship for eligible students or parents of students. The provider form includes eligibility and communication-consent terms that applicants should review before submitting.',
    '$2,000',
    2000,
    date '2026-07-31',
    'https://smartercollege.org/scholarship-application/v5',
    '{"academic_levels":["high school","undergraduate","graduate"],"categories":["general"]}'::jsonb
  ),
  (
    'jlv_college_counseling',
    'https://jlvcollegecounseling.com/2026/07/18/scholarship-saturday-july-18-2026/',
    'scholarship-for-special-educators-2026',
    'Scholarship for Special Educators',
    'HIE Help Center',
    'For eligible incoming or current undergraduate and graduate students pursuing higher education in special education in the United States.',
    '$1,000',
    1000,
    date '2026-07-31',
    'https://hiehelpcenter.org/scholarship-for-special-educators',
    '{"academic_levels":["undergraduate","graduate"],"categories":["education"]}'::jsonb
  ),
  (
    'jlv_college_counseling',
    'https://jlvcollegecounseling.com/2026/07/18/scholarship-saturday-july-18-2026/',
    'supercollege-scholarship-july-2026',
    'The $1,000 SuperCollege Scholarship',
    'SuperCollege.com',
    'For eligible high school seniors, college students, graduate students, and returning adult students who plan to enroll in college or university.',
    '$1,000',
    1000,
    date '2026-07-31',
    'https://www.supercollege.com/scholarship',
    '{"academic_levels":["high school","undergraduate","graduate"],"categories":["general","adult-returning"]}'::jsonb
  ),
  (
    'jlv_college_counseling',
    'https://jlvcollegecounseling.com/2026/07/18/scholarship-saturday-july-18-2026/',
    'calvin-carrithers-aviation-scholarship-2026',
    'Calvin L. Carrithers Aviation Scholarship',
    'GlobalAir.com',
    'For eligible students currently enrolled in an aviation program at an accredited university. Applicants should review the provider''s writing and participation requirements.',
    '$1,000',
    1000,
    date '2026-08-15',
    'https://www.globalair.com/scholarships',
    '{"academic_levels":["undergraduate"],"categories":["aviation","stem-health-trades"]}'::jsonb
  ),
  (
    'scholarship_collective',
    'https://www.thescholarshipcollective.com/scholarships',
    'dc-tuition-assistance-grant-2026',
    'DC Tuition Assistance Grant (DCTAG)',
    'DC Office of the State Superintendent of Education',
    'For eligible District of Columbia residents pursuing a first undergraduate degree. The 2026-27 application closes at 3:00 p.m. on the listed deadline.',
    'Up to $10,000',
    10000,
    date '2026-08-21',
    'https://osse.dc.gov/service/dc-tuition-assistance-grant-dctag',
    '{"academic_levels":["high school","undergraduate"],"categories":["government","dc-residents"]}'::jsonb
  ),
  (
    'scholarship_collective',
    'https://www.thescholarshipcollective.com/scholarships',
    'usra-distinguished-undergraduate-awards-2026',
    'USRA Distinguished Undergraduate Awards',
    'Universities Space Research Association',
    'Up to five awards for eligible full-time undergraduates pursuing science or engineering with an emphasis on space research, space-science education, or aeronautics-related sciences.',
    '$5,000',
    5000,
    date '2026-08-12',
    'https://www.usra.edu/educational-activities-and-opportunities/usra-distinguished-undergraduate-awards',
    '{"academic_levels":["undergraduate"],"categories":["stem-health-trades","space-science"]}'::jsonb
  ),
  (
    'scholarship_collective',
    'https://www.thescholarshipcollective.com/scholarships',
    'global-perspectives-scholarship-2026',
    'Global Perspectives Scholarship',
    'Rustic Pathways',
    'A 2026 essay scholarship. Applicants should review the official prompt, eligibility rules, and submission instructions before applying.',
    '$1,000',
    1000,
    date '2026-08-27',
    'https://rusticpathways.com/students/scholarships/global-perspectives-scholarship',
    '{"academic_levels":["high school","undergraduate"],"categories":["essay","global"]}'::jsonb
  ),
  (
    'scholarship_collective',
    'https://www.thescholarshipcollective.com/scholarships',
    'sbb-research-group-stem-scholarship-2026',
    'SBB Research Group Foundation STEM Scholarship',
    'SBB Research Group Foundation',
    'For eligible full-time college students pursuing a STEM degree with the required cumulative GPA. The provider reviews applications on a quarterly schedule.',
    '$2,500',
    2500,
    date '2026-08-31',
    'https://www.sbbscholarship.com',
    '{"academic_levels":["undergraduate"],"categories":["stem-health-trades"]}'::jsonb
  ),
  (
    'scholarship_collective',
    'https://www.thescholarshipcollective.com/scholarships',
    'pizza-hut-foundation-scholarship-2026',
    'Pizza Hut Foundation 2026 Scholarship Program',
    'Pizza Hut Foundation',
    'For eligible U.S. residents ages 17-26 with at least a 2.5 cumulative GPA who can participate in the associated mentorship program. Awards vary.',
    '$500 to $5,000',
    5000,
    date '2026-08-31',
    'https://www.pizzahutfoundation.org/programs',
    '{"academic_levels":["high school","undergraduate"],"categories":["general","mentorship"]}'::jsonb
  ),
  (
    'scholarship_collective',
    'https://www.thescholarshipcollective.com/scholarships',
    'leaders-save-lives-scholarship-2026',
    'Leaders Save Lives Scholarship Program',
    'American Red Cross',
    'Students who register and successfully host an eligible blood drive during the program period may qualify for gift cards and scholarship drawings based on the number of pints collected.',
    '$1,000 to $2,500',
    2500,
    date '2026-09-01',
    'https://www.redcrossblood.org/hosting-a-blood-drive/learn-about-hosting/why-host-a-blood-drive/leaders-save-lives.html',
    '{"academic_levels":["high school","undergraduate"],"categories":["community-service","leadership"]}'::jsonb
  )
),
upserted as (
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
  select
    seed.slug,
    seed.title,
    lower(regexp_replace(seed.title, '[^a-zA-Z0-9]+', ' ', 'g')),
    seed.sponsor,
    seed.summary,
    seed.amount_text,
    seed.amount_numeric,
    'fixed'::public.deadline_kind,
    seed.deadline,
    seed.original_url,
    rtrim(seed.original_url, '/'),
    seed.eligibility,
    now(),
    null,
    now()
  from verified_seed seed
  on conflict(canonical_url) do update set
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
  seed.source_page_url,
  jsonb_build_object(
    'title', seed.title,
    'sponsor', seed.sponsor,
    'amountText', seed.amount_text,
    'deadlineText', to_char(seed.deadline, 'Month DD, YYYY'),
    'originalUrl', seed.original_url,
    'sourceUrl', seed.source_page_url,
    'academicLevels', seed.eligibility->'academic_levels',
    'categoryTags', seed.eligibility->'categories'
  ),
  now()
from verified_seed seed
join upserted scholarship on scholarship.canonical_url = rtrim(seed.original_url, '/')
join public.external_sources source on source.key = seed.source_key
on conflict(source_id, source_record_key) do update set
  scholarship_id = excluded.scholarship_id,
  source_page_url = excluded.source_page_url,
  observed_data = excluded.observed_data,
  last_seen_at = now();
