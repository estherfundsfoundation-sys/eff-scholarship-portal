export type CareerQuestion = {
  name: string;
  label: string;
  help?: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
  required?: boolean;
};

export type CareerRole = {
  slug: string;
  title: string;
  category: "Paid Fall Council" | "Professional Service" | "Volunteer" | "Future Council Interest";
  compensation: string;
  commitment: string;
  postingTerm?: string;
  summary: string;
  responsibilities: string[];
  qualifications: string[];
  resumeRequired: boolean;
  questions: CareerQuestion[];
};

export const careerRoles: CareerRole[] = [
  {
    slug: "general-council-member",
    title: "General Council Member",
    category: "Paid Fall Council",
    compensation: "Paid role; final compensation and term provided in writing before acceptance",
    commitment: "Remote, limited part-time, fixed-term appointment; start date TBA",
    postingTerm: "Start date TBA",
    summary: "Help a small national team move priority work forward while strengthening chapter support, member experience, and EFF culture.",
    responsibilities: [
      "Own clearly assigned national projects, deadlines, and follow-through.",
      "Support chapter leaders with timely communication and practical solutions.",
      "Help strengthen member experience, culture, and operational consistency.",
      "Document progress and raise risks early instead of allowing deadlines to pass silently.",
      "Build dependable working relationships across the executive board and chapter network.",
    ],
    qualifications: [
      "Demonstrated reliability, sound judgment, and clear written communication.",
      "Experience supporting a team, student organization, nonprofit, project, or community initiative.",
      "Able to work remotely, manage defined priorities, and communicate when support is needed.",
      "At least 18 years old by the appointment start date.",
    ],
    resumeRequired: true,
    questions: [
      {name: "leadershipExperience", label: "Describe a team, organization, or project you helped move forward. What did you personally own?", type: "textarea", required: true},
      {name: "followThrough", label: "Tell us about a time you realized a deadline was at risk. What did you communicate and do next?", type: "textarea", required: true},
      {name: "chapterSupport", label: "How would you support a chapter president who feels overwhelmed without taking over the chapter?", type: "textarea", required: true},
      {name: "teamCulture", label: "What does a healthy, accountable team culture look like in practice?", type: "textarea", required: true},
      {name: "fallAvailability", label: "Describe your realistic fall availability and other major commitments.", type: "textarea", required: true},
    ],
  },
  {
    slug: "faith-ministry-director",
    title: "Faith & Ministry Director",
    category: "Paid Fall Council",
    compensation: "$1,000 total fixed-term stipend; payment schedule provided in writing",
    commitment: "Remote, limited part-time, fixed-term appointment; start date TBA",
    postingTerm: "Start date TBA",
    summary: "Lead the spiritual rhythm of EFF and help chapters build a Christ-centered culture of prayer, belonging, care, and service.",
    responsibilities: [
      "Prepare practical prayer, devotion, and faith-formation resources for collegiate chapters.",
      "Support chapter leaders in creating welcoming, respectful, Christ-centered ministry spaces.",
      "Help plan national prayer moments, Bible-study support, and faith-centered student encouragement.",
      "Use healthy ministry boundaries, protect student privacy, and refer crisis or pastoral needs appropriately.",
      "Collaborate with the National Council without placing the full ministry workload on chapter presidents.",
      "Complete the written monthly priorities and deliverables agreed upon before each payment period.",
    ],
    qualifications: [
      "Current college student or graduate/alumnus; applicants who are not currently enrolled must hold a completed college degree.",
      "Demonstrated experience leading prayer, devotionals, ministry, mentoring, or faith-centered student engagement.",
      "Strong judgment, reliability, warmth, and respect for students from varied backgrounds and levels of faith engagement.",
      "Able to perform the expressly Christian ministry duties described for this role.",
      "At least 18 years old by the appointment start date.",
    ],
    resumeRequired: true,
    questions: [
      {name: "collegeEligibility", label: "Which eligibility path applies to you?", type: "select", required: true, options: ["Currently enrolled college student", "College graduate or alumnus with a completed degree"]},
      {name: "faithDuties", label: "This position leads prayer, Christian devotion, and ministry in alignment with EFF's public Christ-centered mission. Are you willing and able to perform these duties?", type: "select", required: true, options: ["Yes", "No"]},
      {name: "ministryExperience", label: "Describe your ministry, mentoring, prayer, devotional, or faith-centered leadership experience.", type: "textarea", required: true},
      {name: "studentCare", label: "How would you support a student who asks for help beyond your training or role?", help: "We are looking for healthy boundaries, privacy awareness, and appropriate referral judgment.", type: "textarea", required: true},
      {name: "devotionalSample", label: "Outline a 10-minute devotional you could lead for college students.", help: "Include the scripture, main message, one reflection question, and a short closing prayer. Do not submit a video.", type: "textarea", required: true},
      {name: "fallAvailability", label: "Describe your realistic fall availability and other major commitments.", type: "textarea", required: true},
      {name: "independentServices", label: "Do you currently offer ministry, facilitation, program, or consulting services independently to other organizations?", help: "This does not determine selection. It helps EFF and counsel evaluate the legally appropriate work arrangement.", type: "select", required: true, options: ["Yes", "No", "Not currently, but I have in the past"]},
      {name: "workApproach", label: "Describe how you would independently plan and deliver an agreed ministry resource or virtual gathering while keeping EFF informed of results.", type: "textarea", required: true},
    ],
  },
  {
    slug: "legal-counsel",
    title: "Legal Counsel",
    category: "Professional Service",
    compensation: "Paid role; compensation and scope finalized in a written engagement",
    commitment: "Project-based; scope established through a written engagement",
    summary: "Advise EFF on nonprofit governance, employment and volunteer practices, contracts, privacy, intellectual property, and risk management.",
    responsibilities: [
      "Review governance documents, contracts, policies, and public-facing terms within an agreed scope.",
      "Identify legal risks and distinguish legal requirements from operational preferences.",
      "Support conflict checks, privilege, confidentiality, and appropriate documentation.",
      "Coordinate with specialized outside counsel when a matter falls outside the engagement or licensed jurisdiction.",
    ],
    qualifications: [
      "Licensed attorney in at least one U.S. jurisdiction and currently active and in good standing.",
      "Experience relevant to nonprofit, employment, contract, privacy, education, charitable solicitation, or governance matters.",
      "Able to complete a conflicts review and receive any required employer approval before engagement.",
      "No attorney-client relationship begins until EFF authorizes and signs a written engagement letter.",
    ],
    resumeRequired: true,
    questions: [
      {name: "barJurisdictions", label: "List every jurisdiction where you are admitted, your bar number, and current status.", type: "textarea", required: true},
      {name: "discipline", label: "Have you ever been publicly disciplined, suspended, or disbarred?", type: "select", required: true, options: ["No", "Yes - I will explain below"]},
      {name: "disciplineDetail", label: "If yes, provide an explanation and links to the public disposition. Otherwise enter N/A.", type: "textarea", required: true},
      {name: "practiceAreas", label: "Which legal areas can you responsibly support for EFF?", type: "textarea", required: true},
      {name: "conflicts", label: "Identify known or possible conflicts, including current clients, employers, funders, schools, or EFF affiliates. Enter none if none are known.", type: "textarea", required: true},
      {name: "insurance", label: "Do you maintain professional liability coverage, or would your firm cover this engagement?", type: "select", required: true, options: ["Yes", "No", "Not sure / requires firm approval"]},
      {name: "engagementCapacity", label: "Describe the type and approximate amount of legal support you can realistically provide.", type: "textarea", required: true},
    ],
  },
  {
    slug: "board-member",
    title: "Board Member Candidate",
    category: "Volunteer",
    compensation: "Unpaid volunteer governance service",
    commitment: "Remote governance service; term and meeting calendar governed by EFF bylaws and formal board action",
    summary: "Help steward EFF's mission through fiduciary care, strategic judgment, active participation, and responsible nonprofit governance.",
    responsibilities: [
      "Prepare for and participate in board meetings, deliberations, and votes.",
      "Exercise the duties of care, loyalty, and obedience to EFF's charitable mission.",
      "Support oversight, fundraising, risk awareness, and organizational accountability.",
      "Disclose conflicts of interest and protect confidential information.",
    ],
    qualifications: [
      "Demonstrated judgment, integrity, and commitment to EFF's mission.",
      "Capacity to prepare for meetings, participate consistently, and fulfill fiduciary responsibilities.",
      "Experience in governance, education, finance, law, fundraising, student support, faith leadership, or another mission-relevant area is valued.",
      "Understands that applying begins a nomination and review process and does not itself create board membership.",
    ],
    resumeRequired: true,
    questions: [
      {name: "boardMotivation", label: "Why are you interested in serving EFF as a governing board member?", type: "textarea", required: true},
      {name: "governanceStrengths", label: "Which skills, relationships, or perspectives would you bring to the board?", type: "textarea", required: true},
      {name: "fiduciaryUnderstanding", label: "What do the fiduciary duties of care, loyalty, and obedience mean to you?", type: "textarea", required: true},
      {name: "fundraising", label: "How are you prepared to support fundraising, introductions, or resource development?", type: "textarea", required: true},
      {name: "conflicts", label: "Identify any actual or possible conflicts of interest involving EFF. Enter none if none are known.", type: "textarea", required: true},
      {name: "boardAvailability", label: "Describe your realistic availability for meetings, preparation, committee work, and urgent governance matters.", type: "textarea", required: true},
    ],
  },
  {
    slug: "legal-operations-support",
    title: "Legal Operations & Compliance Support Volunteer",
    category: "Volunteer",
    compensation: "Unpaid volunteer service",
    commitment: "Flexible, project-based volunteer support",
    summary: "Help organize policies, records, compliance calendars, research, and attorney-requested materials without giving legal advice or using the title legal counsel.",
    responsibilities: [
      "Maintain organized policy, filing, and compliance trackers.",
      "Research official government sources and prepare clearly sourced summaries for attorney review.",
      "Support document intake, version control, and follow-up tracking.",
      "Escalate legal questions to licensed counsel rather than offering legal conclusions.",
    ],
    qualifications: [
      "Law student, paralegal, compliance professional, governance volunteer, or highly organized researcher.",
      "Understands that this role does not authorize legal advice, legal representation, or the title legal counsel.",
      "Strong confidentiality, sourcing, and document-management habits.",
    ],
    resumeRequired: false,
    questions: [
      {name: "legalSupportBackground", label: "Describe your legal operations, paralegal, law-school, compliance, governance, or research background.", type: "textarea", required: true},
      {name: "noLegalAdvice", label: "Do you understand that this role cannot provide legal advice or represent EFF as counsel?", type: "select", required: true, options: ["Yes", "No"]},
      {name: "researchExample", label: "Describe a time you researched a rule or requirement using primary, official sources.", type: "textarea", required: true},
    ],
  },
  {
    slug: "grant-writer-research",
    title: "Grant Writer, Research & Data Lead",
    category: "Professional Service",
    compensation: "Engagement type and compensation determined before any work begins",
    commitment: "Project-based or semester-based; final scope provided in writing",
    summary: "Build a disciplined grant pipeline, research funders, organize evidence, strengthen proposals, and help EFF turn credible data into compelling cases for support.",
    responsibilities: [
      "Research aligned foundation, corporate, and government opportunities using original funder sources.",
      "Maintain a deadline, eligibility, reporting, and stewardship pipeline.",
      "Draft and revise proposals using verified program, budget, and impact information.",
      "Work with EFF leadership to identify evidence gaps without inventing outcomes or statistics.",
      "Protect confidential student and organizational information.",
    ],
    qualifications: [
      "Strong grant writing, research, editing, project-management, or data storytelling experience.",
      "Able to distinguish restricted and unrestricted funding, document source requirements, and meet deadlines.",
      "Committed to truthful, supportable claims and ethical fundraising practices.",
      "No custom unpaid proposal or speculative grant submission is required as part of the application.",
    ],
    resumeRequired: true,
    questions: [
      {name: "engagementPreference", label: "Which engagement would you consider?", type: "select", required: true, options: ["Paid employee or stipend role", "Paid independent contractor project", "Volunteer project", "Open to discussing the legally appropriate structure"]},
      {name: "grantExperience", label: "Describe your grant, prospect research, proposal, reporting, or fundraising experience.", type: "textarea", required: true},
      {name: "grantResults", label: "Share relevant results with context.", help: "You may include award ranges or win rates, but do not disclose confidential client information.", type: "textarea", required: true},
      {name: "funderTypes", label: "Which funder types and systems have you worked with?", type: "textarea", required: true},
      {name: "workSamples", label: "Provide links to redacted writing or research samples, if available.", type: "textarea", required: false},
      {name: "dataIntegrity", label: "How do you verify claims, statistics, budgets, and eligibility before submission?", type: "textarea", required: true},
    ],
  },
  {
    slug: "social-media-volunteer",
    title: "Social Media & Community Volunteer",
    category: "Volunteer",
    compensation: "Unpaid volunteer service",
    commitment: "Flexible, part-time, project-based service",
    summary: "Help share student opportunities, impact stories, chapter wins, and practical support while protecting student dignity and privacy.",
    responsibilities: [
      "Draft, schedule, and organize mission-aligned social content.",
      "Translate long resources into clear posts, captions, and calls to action.",
      "Use written permissions and approved assets before sharing student stories or images.",
      "Monitor accuracy, accessibility, and respectful community engagement.",
    ],
    qualifications: ["Strong writing or content-creation skills.", "Reliable review and fact-checking habits.", "Understands consent, privacy, and respectful storytelling."],
    resumeRequired: false,
    questions: [
      {name: "platforms", label: "Which platforms, tools, or content formats can you support?", type: "textarea", required: true},
      {name: "portfolio", label: "Share public work samples or a portfolio link, if available.", type: "text", required: false},
      {name: "privacyScenario", label: "A student sends a compelling hardship story and photo. What would you confirm before posting?", type: "textarea", required: true},
    ],
  },
  {
    slug: "creative-communications-volunteer",
    title: "Creative Communications Volunteer",
    category: "Volunteer",
    compensation: "Unpaid volunteer service",
    commitment: "Flexible, project-based design and communications support",
    summary: "Support graphics, writing, short-form video, email, and campaign materials that make EFF resources easier to understand and act on.",
    responsibilities: ["Create accessible, on-brand assets from approved briefs.", "Organize editable source files and follow brand standards.", "Proofread names, dates, links, and claims before release."],
    qualifications: ["Graphic design, copywriting, video, photography, or email experience.", "Comfortable receiving feedback and meeting agreed deadlines.", "Uses properly licensed assets and respects intellectual property."],
    resumeRequired: false,
    questions: [
      {name: "creativeSkills", label: "Which creative or communications skills can you contribute?", type: "textarea", required: true},
      {name: "portfolio", label: "Share your portfolio or public samples.", type: "text", required: true},
      {name: "tools", label: "Which design, video, email, or publishing tools do you use?", type: "textarea", required: true},
    ],
  },
  {
    slug: "chapter-support-volunteer",
    title: "Chapter Support Volunteer",
    category: "Volunteer",
    compensation: "Unpaid volunteer service",
    commitment: "Flexible support for collegiate chapter systems",
    summary: "Help chapter leaders with onboarding, meeting resources, member experience, follow-up, and reliable access to national tools.",
    responsibilities: ["Organize practical chapter resources and reminders.", "Support welcoming member experiences and clear communication.", "Escalate conflict, safety, or policy concerns to authorized leadership."],
    qualifications: ["College organization, chapter, student-affairs, operations, or customer-support experience.", "Calm communication and dependable follow-through.", "Does not act as a disciplinarian, counselor, or investigator without authorization."],
    resumeRequired: false,
    questions: [
      {name: "chapterExperience", label: "Describe your chapter, campus organization, operations, or member-support experience.", type: "textarea", required: true},
      {name: "memberCulture", label: "What helps a collegiate chapter build belonging, consistency, and accountability?", type: "textarea", required: true},
      {name: "conflictScenario", label: "How would you respond if two chapter officers bring you conflicting versions of the same concern?", type: "textarea", required: true},
    ],
  },
  {
    slug: "research-data-volunteer",
    title: "Research & Data Support Volunteer",
    category: "Volunteer",
    compensation: "Unpaid volunteer service",
    commitment: "Flexible, project-based research and data support",
    summary: "Help EFF organize trustworthy public research, clean non-sensitive program data, document sources, and turn approved information into useful internal summaries.",
    responsibilities: ["Research official and primary sources before relying on summaries.", "Clean and organize authorized, non-sensitive records and trackers.", "Document methodology, limitations, dates, and source links.", "Never invent impact statistics or use private student data outside an approved purpose."],
    qualifications: ["Research, evaluation, spreadsheet, data-cleaning, policy, or program-analysis experience.", "Strong source judgment and attention to privacy.", "Comfortable stating uncertainty and limitations rather than overstating findings."],
    resumeRequired: false,
    questions: [
      {name: "researchBackground", label: "Describe your research, data, evaluation, spreadsheet, or analysis experience.", type: "textarea", required: true},
      {name: "researchTools", label: "Which research and data tools can you use responsibly?", type: "textarea", required: true},
      {name: "sourceScenario", label: "You find a statistic repeated on several blogs but cannot locate the original study. What do you do?", type: "textarea", required: true},
      {name: "privacyScenario", label: "How would you protect student privacy while helping analyze program information?", type: "textarea", required: true},
    ],
  },
  {
    slug: "council-support-interest",
    title: "Future National Council Support Interest Pool",
    category: "Future Council Interest",
    compensation: "No position or compensation is promised; terms will be published before interviews",
    commitment: "Role design in progress",
    summary: "Express interest in future small-team support work related to chapter operations, member experience, communications, systems, research, or executive coordination.",
    responsibilities: ["No work assignment is attached to this interest form.", "EFF will contact applicants only after a role has a written scope, classification, compensation status, and selection process."],
    qualifications: ["Strong judgment, communication, and follow-through.", "Experience supporting people, systems, or mission-driven programs.", "Willingness to work collaboratively without shifting all responsibility to chapter presidents."],
    resumeRequired: false,
    questions: [
      {name: "supportAreas", label: "Which future support areas interest you?", type: "textarea", required: true},
      {name: "teamStrength", label: "What strength would you bring to a small, high-accountability national team?", type: "textarea", required: true},
      {name: "culture", label: "How would you help EFF build a culture centered on relationships, membership experience, professionalism, and consistent follow-through?", type: "textarea", required: true},
    ],
  },
];

export const openCareerSlugs = new Set([
  "general-council-member",
  "faith-ministry-director",
  "legal-counsel",
  "board-member",
]);

export const openCareerRoles = careerRoles.filter((role) => openCareerSlugs.has(role.slug));
export const careerRoleMap = new Map(openCareerRoles.map((role) => [role.slug, role]));

export const paidRoleSlugs = new Set(["general-council-member", "faith-ministry-director", "legal-counsel"]);
export const volunteerRoleSlugs = new Set(["board-member"]);
