insert into public.email_templates(program_id,event_key,subject,body,version)
select null,v.event_key,v.subject,v.body,1 from (values
('legacy_claim','Your EFF Name Your Need application is ready to claim','<p>Hello {{name}},</p><p>Esther Funds Foundation securely moved the Name Your Need application you already submitted into our new portal.</p><p><a href="{{claim_url}}">Create or sign in and claim your existing application</a>.</p><p>This private single-use link expires in 14 days.</p>'),
('application_status','EFF update: {{status}}','<p>Hello {{name}},</p><p>{{message}}</p><p><a href="{{portal_url}}">Open your secure portal</a>.</p>'),
('information_request','EFF needs additional information for your application','<p>Hello {{name}},</p><p>Our team needs this item to continue reviewing your application:</p><blockquote>{{item}}</blockquote><p>{{due_message}}</p><p><a href="{{portal_url}}">Respond securely in your portal</a>.</p>'),
('award_issued','Your EFF award details are ready','<p>Hello {{name}},</p><p>Your award details are available in the secure portal. {{amount_message}}</p><p>{{due_message}}</p><p><a href="{{portal_url}}">Review and respond</a>.</p>'),
('award_accepted','Your EFF award acceptance is confirmed','<p>Hello {{name}},</p><p>We recorded your award acceptance. Thank you for completing this step.</p><p><a href="{{portal_url}}">View your application</a>.</p>'),
('scholarship_reminder','Scholarship deadline reminder: {{title}}','<p>Hello {{name}},</p><p>This is your reminder that <strong>{{title}}</strong> {{deadline_message}}.</p><p><a href="{{scholarship_url}}">Review the opportunity and verify details with the provider</a>.</p>')
) as v(event_key,subject,body)
where not exists(select 1 from public.email_templates t where t.program_id is null and t.event_key=v.event_key and t.version=1);
