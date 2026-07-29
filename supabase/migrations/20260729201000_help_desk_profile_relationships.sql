alter table public.help_desk_conversations
  drop constraint if exists help_desk_conversations_assigned_profile_fkey,
  add constraint help_desk_conversations_assigned_profile_fkey
    foreign key (assigned_volunteer_id)
    references public.help_desk_volunteer_profiles(user_id)
    on delete set null;

alter table public.help_desk_service_logs
  drop constraint if exists help_desk_service_logs_volunteer_profile_fkey,
  add constraint help_desk_service_logs_volunteer_profile_fkey
    foreign key (volunteer_id)
    references public.help_desk_volunteer_profiles(user_id)
    on delete cascade;
