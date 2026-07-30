-- Expand the EFF Tech Desk into a credit-independent support system:
-- complete public platform registry plus product-specific known-answer articles.

insert into public.tech_desk_systems
  (slug,name,base_url,health_url,provider,vercel_project,github_repo,active,public_status)
values
  ('pretty-girls-who-serve','Pretty Girls Who Serve','https://pretty-girls-who-serve.vercel.app','https://pretty-girls-who-serve.vercel.app','vercel','pretty-girls-who-serve','estherfundsfoundation-sys/pretty-girls-who-serve',true,true),
  ('portal','EFF Student Portal','https://portal.estherfundsfoundation.org','https://portal.estherfundsfoundation.org/api/health','vercel','he','estherfundsfoundation-sys/eff-scholarship-portal',true,true),
  ('miss-pgws-2027','Miss PGWS 2027','https://miss-pgws-2027.vercel.app','https://miss-pgws-2027.vercel.app','vercel','miss-pgws-2027','estherfundsfoundation-sys/miss-pgws-2027',true,true),
  ('myeff','MyEFF Membership Portal','https://my.estherfundsfoundation.org','https://my.estherfundsfoundation.org','vercel','my-eff','estherfundsfoundation-sys/my-eff',true,true),
  ('policy','Every Future Fulfilled Policy Platform','https://policy.estherfundsfoundation.org','https://policy.estherfundsfoundation.org','vercel','every-future-fulfilled-policy',null,true,true),
  ('eff-essentials','EFF Essentials','https://eff-essentials.vercel.app','https://eff-essentials.vercel.app','vercel','eff-essentials',null,true,true),
  ('back-to-school','EFF Back to School','https://backtoschool.estherfundsfoundation.org','https://backtoschool.estherfundsfoundation.org','vercel','eff-back-to-school-2026',null,true,true),
  ('classroom-points','EFF Classroom Points','https://classroom-points-peach.vercel.app','https://classroom-points-peach.vercel.app','vercel','classroom-points',null,true,true),
  ('reach-action-hub','EFF REACH Action Hub','https://eff-reach-action-hub.vercel.app','https://eff-reach-action-hub.vercel.app','vercel','eff-reach-action-hub','estherfundsfoundation-sys/eff-reach-action-hub',true,true),
  ('academy','EFF Leadership Academy','https://academy.estherfundsfoundation.org','https://academy.estherfundsfoundation.org','vercel','eff-leadership-academy','estherfundsfoundation-sys/eff-leadership-academy',true,true),
  ('chapter-network','EFF Chapter Network','https://eff-chapter-networ.vercel.app','https://eff-chapter-networ.vercel.app','vercel','eff-chapter-networ',null,true,true),
  ('miss-bgr-autumn-2026','Miss BGR Autumn 2026','https://miss-bgr-autumn-2026.vercel.app','https://miss-bgr-autumn-2026.vercel.app','vercel','miss-bgr-autumn-2026',null,true,true),
  ('eff-connect','EFF Connect','https://eff-connect-three.vercel.app','https://eff-connect-three.vercel.app','vercel','eff-connect',null,true,true),
  ('rooted-in-soul','Rooted in Soul','https://rooted-in-soul-site.vercel.app','https://rooted-in-soul-site.vercel.app','vercel','rooted-in-soul-site',null,true,true),
  ('vote-to-reach-liveboard','Vote to REACH Liveboard','https://vote-to-reach-liveboard.vercel.app','https://vote-to-reach-liveboard.vercel.app','vercel','vote-to-reach-liveboard',null,true,true),
  ('success-navigator','EFF Success Navigator','https://eff-success-navigator.vercel.app','https://eff-success-navigator.vercel.app','vercel','eff-success-navigator','estherfundsfoundation-sys/eff-success-navigator',true,true),
  ('aniya-night-time','Aniya Night Time','https://aniya-night-time.vercel.app','https://aniya-night-time.vercel.app','vercel','aniya-night-time',null,true,true),
  ('membership-hub','EFF Membership Hub','https://eff-membership-hub.vercel.app','https://eff-membership-hub.vercel.app','vercel','eff-membership-hub',null,true,true),
  ('funded-academy','Every Future Funded Academy','https://every-future-funded-academy.vercel.app','https://every-future-funded-academy.vercel.app','vercel','every-future-funded-academy',null,true,true),
  ('scholarship-directory','EFF Scholarship Directory','https://eff-scholarship-directory-one.vercel.app','https://eff-scholarship-directory-one.vercel.app','vercel','eff-scholarship-directory',null,true,true),
  ('boogie-bobbys-bayou-bash','Boogie Bobby''s Bayou Bash','https://boogie-bobbys-bayou-bash.vercel.app','https://boogie-bobbys-bayou-bash.vercel.app','vercel','boogie-bobbys-bayou-bash',null,true,true),
  ('reach-universe','REACH Universe','https://reach-universe.vercel.app','https://reach-universe.vercel.app','vercel','reach-universe','estherfundsfoundation-sys/reach-universe',true,true),
  ('black-girls-read-rise','Black Girls Read & Rise','https://black-girls-read-rise.vercel.app','https://black-girls-read-rise.vercel.app','vercel','black-girls-read-rise',null,true,true),
  ('esthers-light','Esther''s Light','https://esthers-light.vercel.app','https://esthers-light.vercel.app','vercel','esthers-light','estherfundsfoundation-sys/esthers-light',true,true),
  ('main-site','Esther Funds Foundation Website','https://estherfundsfoundation.org','https://estherfundsfoundation.org','godaddy',null,null,true,true),
  ('shop','EFF Shop','https://estherfundsfoundation.online','https://estherfundsfoundation.online','ecommerce',null,null,true,true),
  ('other','Another EFF Platform','https://estherfundsfoundation.org','https://estherfundsfoundation.org','other',null,null,true,false)
on conflict (slug) do update set
  name=excluded.name,
  base_url=excluded.base_url,
  health_url=excluded.health_url,
  provider=excluded.provider,
  vercel_project=excluded.vercel_project,
  github_repo=coalesce(excluded.github_repo,public.tech_desk_systems.github_repo),
  active=excluded.active,
  public_status=excluded.public_status,
  updated_at=now();

insert into public.tech_desk_knowledge_articles
  (code,title,summary,public_steps,escalation_rule)
values
  ('REACH_CLAIM_404','REACH invitation opens a 404','Use the secure REACH claim route in the EFF Student Portal.',
   '["Open portal.estherfundsfoundation.org/reach/claim.","Use the email that received the ambassador invitation.","Do not create a second account.","Open one Tech Desk ticket if the invitation is not recognized."]'::jsonb,
   'Escalate if /reach/claim is unavailable or the verified email has no matching ambassador record.'),
  ('REACH_WORKSPACE_MISSING','REACH workspace is missing after sign-in','The verified account may not yet be connected to the ambassador record.',
   '["Confirm the account email matches the invitation email.","Open the REACH claim route once.","Do not create another EFF account.","Request an exact-email relationship review if the workspace remains missing."]'::jsonb,
   'Always require staff review before changing an ambassador-to-user relationship.'),
  ('APPLICATION_ALREADY_EXISTS','The portal says an application already exists','Preserve the existing application and reconnect it instead of creating a duplicate.',
   '["Use the original submission email.","Record the scholarship or program name.","Do not start another application.","Open one verified ticket for an account-to-record review."]'::jsonb,
   'Escalate when an imported or submitted record has no matching verified owner.'),
  ('APPLICATION_MISSING_DASHBOARD','An application is missing from the dashboard','Compare the verified profile, imported record, and current application owner.',
   '["Do not create a duplicate application.","Confirm the original submission email.","Name the missing program in one ticket.","Wait for the exact-email record review."]'::jsonb,
   'Always require authorized review before changing application ownership.'),
  ('MYEFF_PROFILE_PERMISSION','MyEFF profile permission or loading problem','The account may be authenticated without access to its matching membership profile.',
   '["Sign out of MyEFF.","Open the site in a private window.","Use Claim an existing membership for an imported record.","Open one ticket if permission denied or loading continues."]'::jsonb,
   'Escalate when member-profile RLS, ownership, or role data must change.'),
  ('MYEFF_UPLOAD','MyEFF photo or document would not save','Validate the file before reviewing membership storage permission.',
   '["Use JPG, PNG, WEBP, or PDF where accepted.","Use a simple filename and stay under the displayed limit.","Try one smaller known-safe file.","Record the exact page and time if it still fails."]'::jsonb,
   'Escalate when a known-safe file fails and storage policy or quota needs review.'),
  ('PROTECTED_VERCEL_PAGE','An EFF link opens a Vercel login screen','The destination is using a protected deployment hostname instead of a stable public address.',
   '["Return to the source EFF page.","Record the button text and protected address.","Use the stable official EFF domain when one is listed.","Open one ticket so the source link and deployment protection can be reviewed."]'::jsonb,
   'Administrator review is required to change production aliases or deployment protection.'),
  ('DEAD_DOWNLOAD','A public resource download returns 404','The resource moved or the website points to an outdated file.',
   '["Record the page containing the download.","Copy the resource title and destination.","Do not use an unofficial replacement file.","Open one ticket so the source and replacement can be verified."]'::jsonb,
   'Escalate when the official provider removed or replaced the resource.'),
  ('EMAIL_DELIVERY_PROVIDER','A transactional email was not accepted','Compare the application event, recipient, domain, and provider delivery record without exposing credentials.',
   '["Confirm the email spelling.","Check Spam and school quarantine.","Request only one newest message.","Open one verified ticket after 10 minutes if no message arrives."]'::jsonb,
   'Administrator review is required for domain, API, SMTP, suppression, or environment changes.'),
  ('VOLUNTEER_ESCALATION','When a Tech Desk volunteer must escalate','Volunteers use read-only evidence and approved communications; privileged changes require an authorized administrator.',
   '["Document the exact system, page, time, and reproducible steps.","Attach only sanitized evidence.","Record the proposed action and risk level.","Do not change production data, code, keys, roles, domains, or permissions without authorization."]'::jsonb,
   'Escalate every production mutation, ownership change, permission change, or secret-related issue.')
on conflict (code) do update set
  title=excluded.title,
  summary=excluded.summary,
  public_steps=excluded.public_steps,
  escalation_rule=excluded.escalation_rule,
  active=true,
  updated_at=now();
