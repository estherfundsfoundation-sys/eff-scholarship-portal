create unique index if not exists importer_one_running_per_source_idx on public.importer_runs(source_id) where status = 'running';
create unique index if not exists scholarship_canonical_url_idx on public.external_scholarships(canonical_url);
create index if not exists scholarship_deadline_idx on public.external_scholarships(deadline, archived_at);
create table if not exists public.scholarship_field_changes (id uuid primary key default gen_random_uuid(), scholarship_id uuid not null references public.external_scholarships on delete cascade, run_id uuid references public.importer_runs on delete set null, field_name text not null, previous_value jsonb, new_value jsonb, changed_at timestamptz not null default now());
alter table public.scholarship_field_changes enable row level security;
update public.external_sources set parser_version='2.0.0' where key in ('scholarship_collective','jlv_college_counseling');
