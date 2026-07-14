insert into public.external_sources(key,name,directory_url,permission_status,permission_notes,parser_version)
values
('uncf','UNCF','https://uncf.org/scholarships','written_permission','Written permission represented by EFF; retain permission record in private files.','2.0.0'),
('tmcf','Thurgood Marshall College Fund','https://tmcf.org/scholarships/','written_permission','Written permission represented by EFF; portal may require student sign-in for matched opportunities.','2.0.0'),
('swe','Society of Women Engineers','https://swe.org/scholarships/','written_permission','Written permission represented by EFF; source status is monitored even while applications are closed.','2.0.0'),
('jack_kent_cooke','Jack Kent Cooke Foundation','https://www.jkcf.org/our-scholarships/','written_permission','Written permission represented by EFF; public application periods imported.','2.0.0'),
('hsf','Hispanic Scholarship Fund','https://www.hsf.net/','written_permission','Written permission represented by EFF; provider program page imported when individual matches require account access.','2.0.0')
on conflict (key) do update set name=excluded.name,directory_url=excluded.directory_url,permission_status=excluded.permission_status,permission_notes=excluded.permission_notes,parser_version=excluded.parser_version,active=true;
