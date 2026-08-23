begin;
alter function public.submit_eff_common_application(uuid,uuid[],text) set search_path=public,extensions;
commit;
