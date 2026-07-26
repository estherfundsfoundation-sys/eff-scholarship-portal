update public.eff_partner_institutions
set
  status='active',
  public_profile=true,
  approved_at=coalesce(approved_at,now()),
  reviewed_at=coalesce(reviewed_at,now()),
  updated_at=now()
where status in ('draft','pending','approved');

comment on column public.eff_partner_institutions.status is
'Completed public registrations activate immediately as EFF Partner Campuses. EFF administrators may pause or remove a profile if a concern arises.';
