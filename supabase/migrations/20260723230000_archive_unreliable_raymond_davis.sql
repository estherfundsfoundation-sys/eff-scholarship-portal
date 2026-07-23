-- IS&T's current scholarship and PDF routes intermittently redirect
-- unauthenticated visitors into a broken member-login loop. Keep the record for
-- audit history, but do not expose an unreliable application route to students.

update public.external_scholarships
set
  archived_at = coalesce(archived_at, now()),
  updated_at = now()
where title = '$500 Raymond Davis Scholarship';
