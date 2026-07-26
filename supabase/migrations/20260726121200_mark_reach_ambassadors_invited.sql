update public.reach_ambassadors
set
  invited_at = coalesce(invited_at, now()),
  updated_at = now()
where active = true;
