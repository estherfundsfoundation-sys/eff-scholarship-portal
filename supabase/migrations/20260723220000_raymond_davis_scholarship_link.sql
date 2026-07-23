-- The IS&T webpage currently loops through its member-login route.
-- Use the provider-hosted scholarship application PDF and align the award amount
-- with the current official program description.

update public.external_scholarships
set
  title = '$500 Raymond Davis Scholarship',
  normalized_title = '500 raymond davis scholarship',
  summary = 'For eligible advanced undergraduate and graduate students pursuing imaging science or related fields. The award is tied to participation in an eligible IS&T conference; confirm the applicable conference submission deadline with IS&T.',
  amount_text = '$500 plus conference registration support',
  amount_numeric = 500,
  original_url = 'https://www.imaging.org/common/uploaded%20files/pdfs/RaymondDavisScholarshipAppl.pdf',
  canonical_url = 'https://www.imaging.org/common/uploaded%20files/pdfs/RaymondDavisScholarshipAppl.pdf',
  updated_at = now()
where title = '$1,000 Raymond Davis Scholarship';
