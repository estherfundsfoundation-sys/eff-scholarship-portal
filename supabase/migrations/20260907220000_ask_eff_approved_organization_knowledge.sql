-- Curated, public EFF organizational knowledge for Ask EFF.
-- This remains isolated from the portal's existing scholarship, application,
-- membership, chapter, and program tables.

create table if not exists public.ask_eff_source_catalog (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  title text not null,
  source_kind text not null check (source_kind in ('official_page','official_document','official_social_archive','founder_directive')),
  canonical_url text,
  organization text not null default 'Esther Funds Foundation',
  authority_level text not null check (authority_level in ('controlling_policy','approved_public_fact','historical_context','pending_review')),
  coverage_status text not null check (coverage_status in ('documented','partial','missing','conflicting','needs_review')),
  first_published_on date,
  last_reviewed_on date,
  review_due_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ask_eff_source_catalog enable row level security;
revoke all on public.ask_eff_source_catalog from anon, authenticated;

insert into public.ask_eff_source_catalog
  (source_key,title,source_kind,canonical_url,authority_level,coverage_status,last_reviewed_on,review_due_on,notes)
values
  ('eff-home','EFF public website','official_page','https://estherfundsfoundation.org/','approved_public_fact','documented','2026-09-07','2026-12-07','Mission, identity, public programs, public news and organizational positioning.'),
  ('eff-founder','Meet Shayna Vincent','official_page','https://estherfundsfoundation.org/meet-our-founder-1','approved_public_fact','documented','2026-09-07','2026-12-07','Founder biography approved for public use.'),
  ('eff-team','EFF National Leadership Team','official_page','https://estherfundsfoundation.org/meet-our-national-team','approved_public_fact','documented','2026-09-07','2026-10-07','Role-based public contacts; recheck frequently because roles can change.'),
  ('eff-chapter-hub','EFF Chapter Resource Hub','official_page','https://estherfundsfoundation.org/eff-chapter-resources','controlling_policy','documented','2026-09-07','2026-10-07','Public chapter resource categories and current published founder pathway.'),
  ('eff-governance','EFF Chapter Governance Library','official_page','https://estherfundsfoundation.org/governance','controlling_policy','partial','2026-09-07','2026-10-07','Document inventory is indexed; document text requires separate approval before retrieval.'),
  ('eff-training','EFF Chapter Training Library','official_page','https://estherfundsfoundation.org/training','controlling_policy','partial','2026-09-07','2026-10-07','Public training inventory only; restricted course content is not in public chat.'),
  ('eff-new-chapters','New EFF Chapters','official_page','https://estherfundsfoundation.org/new-eff-chapters','controlling_policy','documented','2026-09-07','2026-10-07','Beginning-stage resources and onboarding materials.'),
  ('eff-community-service','EFF Chapter Community Service','official_page','https://estherfundsfoundation.org/communitty-service','controlling_policy','documented','2026-09-07','2026-10-07','Public community-service resource inventory.'),
  ('eff-conflict','EFF Conflict Resolution','official_page','https://estherfundsfoundation.org/conflict-resolution','controlling_policy','documented','2026-09-07','2026-10-07','Public conflict-resolution steps and forms.'),
  ('eff-portal-resources','EFF Student Help Center','official_page','https://portal.estherfundsfoundation.org/resources','approved_public_fact','documented','2026-09-07','2026-10-07','Student resource hub and current support pathways.'),
  ('eff-reach','REACH Action Hub','official_page','https://reach.estherfundsfoundation.org/','approved_public_fact','documented','2026-09-07','2026-10-07','Public REACH meaning, pathways, tools and limitations.'),
  ('eff-myeff','MyEFF','official_page','https://my.estherfundsfoundation.org/','approved_public_fact','documented','2026-09-07','2026-10-07','Current public membership and chapter-discovery experience.'),
  ('eff-instagram-archive','@estherfundsfoundation Instagram archive','official_social_archive','https://www.instagram.com/estherfundsfoundation/','pending_review','needs_review','2026-09-07','2026-09-21','Do not claim complete first-post-to-present coverage until Nationals supplies an account export or approves a dated archive. Public posts may inform drafts but cannot silently override policy.'),
  ('eff-history-2024','EFF 2024 impact retrospective','official_page','https://estherfundsfoundation.org/home/f/esther-funds-a-year-of-impact-and-a-bold-vision-for-2025','historical_context','documented','2026-09-07','2027-01-07','Historical milestone source; not controlling current policy.'),
  ('eff-history-2025-initiatives','EFF four initiatives announcement','official_page','https://estherfundsfoundation.org/f/preparing-for-impact-esther-funds-four-key-initiatives','historical_context','documented','2026-09-07','2027-01-07','Historical plans must not be presented as currently operating without a current record.'),
  ('eff-history-501c3','EFF 501(c)(3) announcement','official_page','https://estherfundsfoundation.org/home/f/esther-funds-foundation-is-now-a-501c3-nonprofit-organization','historical_context','documented','2026-09-07','2027-01-07','Official public announcement dated August 6, 2025.')
on conflict (source_key) do update set
  title=excluded.title,
  canonical_url=excluded.canonical_url,
  authority_level=excluded.authority_level,
  coverage_status=excluded.coverage_status,
  last_reviewed_on=excluded.last_reviewed_on,
  review_due_on=excluded.review_due_on,
  notes=excluded.notes,
  updated_at=now();

with seed(category,organization,topic,trigger_question,information_needed,applicable_policy,approved_answer,required_action,escalation_rule,canonical_url,prohibited_alternatives,source_reference,version) as (values
  ('official_fact','Esther Funds Foundation','Mission','What is EFF? What does Esther Funds Foundation do?',null,null,
   'Esther Funds Foundation is a faith-based nonprofit focused on preventing college dropouts. Its public model combines practical resources, education navigation, community, leadership, faith-centered encouragement, and direct support when an approved program is available. Its guiding promise is “Every Future Fulfilled.”',
   'Direct people to the official EFF website or the Student Help Center based on their need.',null,'https://estherfundsfoundation.org/',
   'Do not promise funding, graduation, or a specific outcome. Do not reduce EFF to scholarships alone.','EFF public website, reviewed 2026-09-07',1),
  ('official_fact','Esther Funds Foundation','Founding and early history','When was EFF founded?',null,null,
   'EFF publicly describes itself as founded in 2023. A 2024 retrospective reported development of its first collegiate chapter at Florida A&M University and expanding outreach to students at Florida State University and Tallahassee Community College.',
   'Treat this as historical context and use current records for present-day chapter status.',null,'https://estherfundsfoundation.org/home/f/esther-funds-a-year-of-impact-and-a-bold-vision-for-2025',
   'Do not call every school named in an old article a currently active chapter.','EFF 2024 impact retrospective, reviewed 2026-09-07',1),
  ('public_role','Esther Funds Foundation','Founder: Shayna Vincent','Who founded EFF? Who is Shayna Vincent?',null,null,
   'Shayna Vincent is the founder and chief executive leader of Esther Funds Foundation. She is an educator, published author, Tampa native, member of Sigma Gamma Rho Sorority, Incorporated, and a graduate of Hillsborough Community College and Florida A&M University, where she earned a Bachelor of Science in Elementary Education.',
   'Use info@estherfundsfoundation.org for the approved public organizational contact.',null,'https://estherfundsfoundation.org/meet-our-founder-1',
   'Do not provide private contact details or claim to speak as Shayna.','Founder biography, reviewed 2026-09-07',1),
  ('official_fact','Esther Funds Foundation','Why Shayna founded EFF','Why did Shayna start the foundation?',null,null,
   'Shayna’s approved public biography explains that she experienced barriers and interruptions while navigating higher education without adequate guidance. She turned that experience into a mission to help students facing financial hardship, mental-health challenges, and lack of support persist through graduation.',
   'Share this respectfully as approved public biography, not as a diagnosis or a complete personal history.',null,'https://estherfundsfoundation.org/meet-our-founder-1',
   'Do not embellish her experiences or invent dates, awards, family details, or private history.','Founder biography, reviewed 2026-09-07',1),
  ('official_fact','Esther Funds Foundation','501(c)(3) milestone','Is EFF a nonprofit?',null,null,
   'EFF publicly announced federal 501(c)(3) tax-exempt recognition on August 6, 2025. The announcement described stronger donor transparency, grant eligibility, partnerships, and infrastructure as goals of this milestone.',
   'For legal, tax, or donation-restriction questions, point to current official financial information and do not provide legal or tax advice.',null,'https://estherfundsfoundation.org/home/f/esther-funds-foundation-is-now-a-501c3-nonprofit-organization',
   'Do not infer the restriction status of a particular donation or provide a tax opinion.','Official 501(c)(3) announcement, reviewed 2026-09-07',1),
  ('official_fact','Esther Funds Foundation','EFF support model','How does EFF help students?',null,null,
   'EFF’s public model addresses college persistence through financial-assistance programs when open, campus ambassadors, REACH basic-needs and education navigation, Esther Light faith-centered encouragement, a national chapter network, mentoring, scholarship resources, and student tools.',
   'Check the approved current status of the specific program before saying it is accepting applications.',null,'https://estherfundsfoundation.org/home',
   'Do not present every historical or planned initiative as currently available.','EFF public home page, reviewed 2026-09-07',1),
  ('official_fact','Esther Funds Foundation','Belonging and community','I want community, not money. How can I belong?',null,null,
   'Belonging is central to EFF. Students can explore chapter membership, campus ambassador service, mentoring, sisterhood through Pretty Girls Who Serve, brotherhood through Men of EFF, and graduate or professional community through Beyond, using the current approved destination for each.',
   'Ask which type of community and organization the person means, then use that organization’s current process.',null,'https://my.estherfundsfoundation.org/',
   'Do not mix separate organizations’ membership, fees, chapter rules, or approvals.','MyEFF public membership experience and founder-approved Ask EFF brief',1),
  ('procedure','Esther Funds Foundation','Starting an EFF chapter','How do I start an EFF chapter?',
   'Confirm the institution and check whether an active chapter, prospective chapter, or interest group already exists.',
   'The official public chapter hub says a founding pathway begins with seven students and a faculty or staff advisor, followed by the approved interest form, a Nationals interview, board training through the EFF Leadership Academy, and a Chapter Agreement.',
   'Use only https://form.jotform.com/261806820999067 for EFF chapter interest. Do not recruit or announce approval until the current national and campus steps are confirmed.',
   'Complete the approved interest form and wait for the documented National Office and campus steps before recruiting or announcing a chapter.',
   'Escalate unknown chapter standing, legal, finance, advisor, or approval questions to the National Office.','https://estherfundsfoundation.org/eff-chapter-resources',
   'Do not promise approval, invent a timeline, create a duplicate chapter, or substitute a PGWS form.','EFF Chapter Resource Hub and founder-approved Ask EFF rule, reviewed 2026-09-07',1),
  ('official_fact','Esther Funds Foundation','Chapter Resource Hub','What is in the EFF chapter hub?',null,null,
   'The public EFF Chapter Resource Hub organizes chapter support into governance; operations and forms; programming and toolkits; branding and social media; training; compliance and reporting; membership and recruitment; new-chapter onboarding; community service; and conflict resolution.',
   'Open the hub first, then use the section that matches the chapter’s stage and role.',null,'https://estherfundsfoundation.org/eff-chapter-resources',
   'Do not treat public category summaries as permission to disclose restricted documents.','EFF Chapter Resource Hub, reviewed 2026-09-07',1),
  ('policy','Esther Funds Foundation','Chapter governance foundation','Which documents govern an EFF chapter?',null,
   'The published governance library lists the 2026 National Bylaws, chapter bylaws or constitution materials, Code of Conduct, Chapter Agreement, chapter expectations, officer role descriptions, officer agreements, EIN guidance, chapter legal-status guidance, incorporation guidance, and a chapter budget template.',
   'EFF chapter leaders should begin with the current governance library because it contains the foundation on which chapter operations, authority, conduct, and accountability are built.',
   'Leaders should read the controlling current document itself and confirm which version applies before acting.',
   'Escalate conflicts, legal-status questions, contracts, banking, EINs, or authority questions to Nationals.','https://estherfundsfoundation.org/governance',
   'Do not summarize a document as binding policy unless its approved text is available. Do not authorize accounts, contracts, or signatures.','EFF governance library inventory, reviewed 2026-09-07',1),
  ('procedure','Esther Funds Foundation','Chapter operations','How should our chapter stay organized?',null,null,
   'The chapter hub describes operations resources for meeting agendas and minutes, financial tracking, event planning, officer applications and transitions, and recurring request forms. These tools support consistent records across the semester.',
   'Use the current template from the Chapter Resource Hub and keep private student or member data out of public materials.',null,'https://estherfundsfoundation.org/eff-chapter-resources',
   'Do not invent a national reporting deadline or required template field.','EFF Chapter Resource Hub, reviewed 2026-09-07',1),
  ('procedure','Esther Funds Foundation','Chapter programming','What can our chapter do on campus?',null,null,
   'The public hub provides programming guidance for tabling, fundraising, programming best practices, icebreakers, REACH Week, and other retention-centered activities. A useful first meeting can introduce EFF’s mission, build community, explain resources, identify a service need, and assign a clear next step.',
   'Label general event ideas as suggestions and check the current approval process before public promotion, fundraising, or commitments.',
   'Escalate fundraising, sponsorship, contracts, public statements, or safety-sensitive events.','https://estherfundsfoundation.org/eff-chapter-resources',
   'Do not call a suggested event nationally approved.','EFF Chapter Resource Hub, reviewed 2026-09-07',1),
  ('policy','Esther Funds Foundation','Chapter branding and social media','Can our chapter make a flyer or social page?',null,null,
   'The public chapter hub points leaders to official EFF brand guidelines, ready-to-post and fill-in graphics, templates, and membership certificates. Chapters should use approved assets and follow the current review process before representing an announcement as national EFF communication.',
   'Use current official logos and templates from the hub. Confirm approval and account-ownership rules with Nationals.',
   'Escalate new official accounts, press statements, partnerships, fundraising campaigns, or logo changes.','https://estherfundsfoundation.org/eff-chapter-resources',
   'Do not invent or redraw the logo, speak on behalf of Nationals, or publish private member information.','EFF Chapter Resource Hub, reviewed 2026-09-07',1),
  ('policy','Esther Funds Foundation','Chapter training','What training do chapter leaders need?',null,null,
   'The public chapter hub directs chapter boards to the EFF Chapter Leadership Academy, REACH member training, and the informational-meeting presentation. Current leaders should complete the training assigned to their role before beginning membership recruitment or chapter programming.',
   'Use the current Leadership Academy and completion records supplied by Nationals.',
   'Escalate missing access, conflicting course names, or completion-record problems to the National Office.','https://estherfundsfoundation.org/eff-chapter-resources',
   'Do not invent course completion, waive training, or guess a deadline.','EFF Chapter Resource Hub and founder direction, reviewed 2026-09-07',1),
  ('policy','Esther Funds Foundation','Chapter compliance and good standing','How does a chapter stay in good standing?',null,null,
   'The public hub identifies a semester compliance report, good-standing checklist, advisor guidance, and national requirements as the place to confirm chapter standing each semester.',
   'Review the current checklist and submit required records through the approved process.',
   'Escalate uncertainty about chapter standing, missed requirements, inactive officers, or advisor changes.','https://estherfundsfoundation.org/eff-chapter-resources',
   'Do not declare a chapter in or out of good standing without an authorized current record.','EFF Chapter Resource Hub, reviewed 2026-09-07',1),
  ('procedure','Esther Funds Foundation','Membership and recruitment','How do chapters welcome members?',null,null,
   'The public hub provides membership applications, acceptance letters, induction certificates, The Esther Experience onboarding guide, and recruitment materials. MyEFF is the official national membership home and publicly states that national membership is free; separate local chapter dues or activity fees may exist and should be confirmed with chapter leadership.',
   'Use MyEFF and the current chapter materials. Distinguish national membership from local chapter costs.',null,'https://my.estherfundsfoundation.org/',
   'Do not claim every EFF-affiliated organization or local chapter has no fee.','MyEFF and EFF Chapter Resource Hub, reviewed 2026-09-07',1),
  ('procedure','Esther Funds Foundation','Chapter community service','How do we document service?',null,null,
   'The chapter community-service page provides service-idea guidance, individual and chapter service-hour logs, and individual and group certification templates.',
   'Use the current official log and obtain the required verifier or chapter approval before claiming certified hours.',null,'https://estherfundsfoundation.org/communitty-service',
   'Do not guarantee that a school, employer, scholarship provider, or court will accept EFF service hours.','EFF community-service library, reviewed 2026-09-07',1),
  ('procedure','Esther Funds Foundation','Chapter conflict resolution','How do we handle chapter conflict?',null,null,
   'EFF’s public conflict-resolution library uses a stepped process with personal reflection, executive-board mediation, and escalation to Nationals, supported by worksheets and a remediation request form.',
   'Protect privacy, document facts, use the least escalated appropriate step, and move to Nationals when the published process calls for it or safety is involved.',
   'Escalate threats, harassment, discrimination, retaliation, financial misconduct, safeguarding concerns, or issues that cannot be resolved locally.','https://estherfundsfoundation.org/conflict-resolution',
   'Do not publish another member’s concern, retaliate, promise an outcome, or conduct a public trial.','EFF Conflict Resolution library, reviewed 2026-09-07',1),
  ('official_fact','Esther Funds Foundation','REACH meaning and pathways','What is REACH?',null,null,
   'REACH is EFF’s student and family support model: Reach out, Engage your community, Access resources, Care for your mental health, and Hold on. Its public Action Hub organizes support for oneself, a friend, a campus, a community, expansion beyond campus, K–12 preparation, and mentors or professionals.',
   'Use the REACH Action Hub for tools and the Scholarship Portal for applications. In an immediate mental-health crisis in the United States, call or text 988 or contact emergency services.',null,'https://reach.estherfundsfoundation.org/',
   'Do not guarantee outside assistance or imply the public tools replace emergency, medical, legal, or institutional professionals.','REACH Action Hub, reviewed 2026-09-07',1),
  ('official_fact','Esther Funds Foundation','Student Resources','Where can I get help with college problems?',null,null,
   'The EFF Student Help Center provides paths for urgent balances, FAFSA and financial aid, scholarships, food, housing, transportation, mentoring, wellness, state resources, school advocacy, and downloadable planning tools. Public resources can be explored without an account.',
   'Start with the closest need at https://portal.estherfundsfoundation.org/resources.',null,'https://portal.estherfundsfoundation.org/resources',
   'Do not guarantee funding or an external provider’s eligibility decision.','EFF Student Help Center, reviewed 2026-09-07',1),
  ('response_example','Esther Funds Foundation','Contact Nationals','Who should I contact when Ask EFF cannot confirm something?',null,null,
   'For unresolved EFF policy, program-status, chapter-authority, or official-action questions, contact the Esther Funds Foundation National Office at nationals@estherfundsinc.org. Role-specific public contacts may be used when a current approved directory record clearly applies.',
   'Explain what is known, identify the exact missing confirmation, and provide the appropriate role-based contact.',null,'mailto:nationals@estherfundsinc.org',
   'Do not promise a response time or claim a message has been sent.','Founder-approved Ask EFF contact rule',1),
  ('official_fact','Esther Funds Foundation','Historical social and program record','What has EFF done over time?',null,null,
   'Approved public history currently documents EFF’s founding in 2023, a first collegiate chapter at Florida A&M University by 2024, national campus-ambassador development in 2025, a first national royal-court fundraising campaign in July 2025, and public announcement of 501(c)(3) recognition in August 2025. This is a verified starting timeline, not yet a complete social-media archive.',
   'Use the dated source for each milestone and treat old plans as history unless a current record confirms operation.',null,'https://estherfundsfoundation.org/home/f/esther-funds-a-year-of-impact-and-a-bold-vision-for-2025',
   'Do not claim this is the complete first-post-to-present history. Do not let an old post override current policy.','Approved public EFF articles; Instagram archive pending owner-approved export',1)
)
insert into public.ask_eff_knowledge_records
  (category,organization,topic,trigger_question,information_needed,applicable_policy,approved_answer,required_action,escalation_rule,canonical_url,prohibited_alternatives,visibility,publication_status,effective_from,source_reference,knowledge_owner,reviewed_at,review_due_at,version)
select category,organization,topic,trigger_question,information_needed,applicable_policy,approved_answer,required_action,escalation_rule,canonical_url,prohibited_alternatives,'public','published','2026-09-07T00:00:00Z',source_reference,'EFF National Office','2026-09-07T00:00:00Z','2026-12-07T00:00:00Z',version
from seed
where not exists (
  select 1 from public.ask_eff_knowledge_records existing
  where lower(existing.organization)=lower(seed.organization)
    and lower(existing.topic)=lower(seed.topic)
    and existing.version=seed.version
);

with contacts(display_name,official_role,organizational_contact,public_biography,source_reference) as (values
  ('Shayna Vincent','Founder & Chief Executive Officer','info@estherfundsfoundation.org','Founder, educator, published author, and advocate for college retention and graduation.','https://estherfundsfoundation.org/meet-our-founder-1'),
  ('Aaliyah Wilson','National Secretary','secretary@estherfundsinc.org',null,'https://estherfundsfoundation.org/meet-our-national-team'),
  ('Jasmine Glenn','Director of Chapter Engagement & Onboarding','jasmineg@estherfundsinc.org',null,'https://estherfundsfoundation.org/meet-our-national-team'),
  ('Portia Martey','Director of Chapter Expansion & Engagement','chapterexpansion@estherfundsinc.org',null,'https://estherfundsfoundation.org/meet-our-national-team'),
  ('Dominique Jackson','Director of Partnerships & Workshops','partnerships@estherfundsinc.org',null,'https://estherfundsfoundation.org/meet-our-national-team')
)
insert into public.ask_eff_public_contacts
  (display_name,official_role,organization,organizational_contact,public_biography,publication_permission,publication_status,source_reference,reviewed_at)
select display_name,official_role,'Esther Funds Foundation',organizational_contact,public_biography,true,'published',source_reference,'2026-09-07T00:00:00Z'
from contacts
where not exists (
  select 1 from public.ask_eff_public_contacts existing
  where lower(existing.official_role)=lower(contacts.official_role)
    and existing.publication_status='published'
);

insert into public.ask_eff_knowledge_gaps(topic,organization,gap_type,notes,status)
select 'Complete first-post-to-present Instagram history','Esther Funds Foundation','partial','Nationals should provide an Instagram account export or approved dated post archive. The system must extract proposed milestones for review rather than automatically turning posts into policy.','open'
where not exists (
  select 1 from public.ask_eff_knowledge_gaps
  where topic='Complete first-post-to-present Instagram history' and status in ('open','reviewing')
);
