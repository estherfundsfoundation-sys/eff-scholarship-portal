create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, legal_name, preferred_name, primary_email)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'legal_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'preferred_name', '')), ''),
    new.email
  )
  on conflict (id) do update set primary_email = excluded.primary_email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.user_roles enable row level security;
alter table public.programs enable row level security;
alter table public.program_cycles enable row level security;
alter table public.form_versions enable row level security;
alter table public.policy_versions enable row level security;
alter table public.status_history enable row level security;
alter table public.information_requests enable row level security;
alter table public.review_assignments enable row level security;
alter table public.decisions enable row level security;
alter table public.awards enable row level security;
alter table public.external_scholarships enable row level security;

create policy "profiles_staff_read" on public.profiles for select
using (has_role('program_admin') or has_role('super_admin'));
create policy "roles_self_read" on public.user_roles for select using(user_id=auth.uid());
create policy "roles_super_admin_manage" on public.user_roles for all
using(has_role('super_admin')) with check(has_role('super_admin'));
create policy "programs_public_read" on public.programs for select using(active=true);
create policy "cycles_public_read" on public.program_cycles for select using(status='open');
create policy "forms_applicant_read" on public.form_versions for select
using(published_at is not null and exists(select 1 from program_cycles c where c.id=cycle_id and c.status='open'));
create policy "policies_applicant_read" on public.policy_versions for select
using(published_at is not null and exists(select 1 from program_cycles c where c.id=cycle_id and c.status='open'));
create policy "applications_staff_read" on public.applications for select
using(has_role('reviewer') or has_role('program_admin') or has_role('super_admin'));
create policy "status_owner_read" on public.status_history for select
using(exists(select 1 from applications a where a.id=application_id and a.applicant_id=auth.uid()));
create policy "status_staff_read" on public.status_history for select
using(has_role('reviewer') or has_role('program_admin') or has_role('super_admin'));
create policy "requests_owner_read" on public.information_requests for select
using(exists(select 1 from applications a where a.id=application_id and a.applicant_id=auth.uid()));
create policy "external_public_read" on public.external_scholarships for select
using(published_at is not null and archived_at is null);
