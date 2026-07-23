-- Correct provider pages that moved and hide opportunities that are currently closed.

update public.external_scholarships
set
  original_url = 'https://www.imaging.org/IST/IST/Resources/Raymond_Davis_Scholarship.aspx?WebsiteKey=6d978a6f-475d-46cc-bcf2-7a9e3d5f8f82&hkey=c4528c4b-0bb4-4ee2-bd13-946b01c682a8',
  canonical_url = 'https://www.imaging.org/IST/IST/Resources/Raymond_Davis_Scholarship.aspx?WebsiteKey=6d978a6f-475d-46cc-bcf2-7a9e3d5f8f82&hkey=c4528c4b-0bb4-4ee2-bd13-946b01c682a8',
  updated_at = now()
where title = '$1,000 Raymond Davis Scholarship';

update public.external_scholarships
set
  original_url = 'https://www.bu.edu/admissions/tuition-aid/scholarships-financial-aid/first-year-merit/',
  canonical_url = 'https://www.bu.edu/admissions/tuition-aid/scholarships-financial-aid/first-year-merit',
  updated_at = now()
where title = 'Boston University Presidential Scholarship';

update public.external_scholarships
set
  original_url = 'https://tmcf.org/scholarships/',
  canonical_url = 'https://tmcf.org/scholarships',
  updated_at = now()
where title = 'TMCF Open Scholarships';

update public.external_scholarships
set
  archived_at = coalesce(archived_at, now()),
  updated_at = now()
where title in (
  '$5,000 Zonta Young Women In Public Affairs Scholarship',
  'Golden Door Scholars'
);
