import type {CourseModule, KnowledgeCheck} from "./financial-aid-peer-mentor";

export const FIRST_GEN_FAMILY_NAVIGATOR_COURSE_ID = "first-gen-family-navigator-v1";
export const FIRST_GEN_FAMILY_NAVIGATOR_PASSING_SCORE = 80;

export const firstGenFamilyNavigatorModules: CourseModule[] = [
  {
    id: "family-strength",
    number: "01",
    emoji: "💜",
    title: "Your family is already part of the solution",
    time: "16 minutes",
    tagline: "First-generation does not mean first without support.",
    purpose: "Replace deficit thinking with an asset-based family role that protects the student’s voice, confidence, and independence.",
    quickCheck: {
      prompt: "A parent must have attended college to be a powerful source of support for a first-generation student.",
      isFact: false,
      explanation: "Families bring persistence, cultural knowledge, problem-solving, faith, care, and practical support—even when college systems are unfamiliar.",
    },
    mentorScript: "I may not know every college term yet, but I know how to listen, ask clear questions, and help you follow through.",
    sections: [
      {
        heading: "Lead with strengths, not shame",
        body: "First-generation students and families are often described by what they have not experienced. EFF takes an asset-based approach: families already carry resilience, relationships, cultural wisdom, faith, and the ability to solve hard problems. Training adds college-navigation tools to those existing strengths.",
      },
      {
        heading: "Support is not control",
        body: "A strong family navigator asks what the student wants, helps organize choices, and keeps the student involved in every conversation. Taking over accounts, messages, meetings, or decisions can weaken trust and independence. The goal is a student who can advocate for themselves with family support beside them.",
      },
      {
        heading: "Use three kinds of support",
        body: "Families can offer emotional support, practical support, and navigation support.",
        bullets: [
          "Emotional: listen without blame and remind the student that one problem does not define their future.",
          "Practical: help with transportation, meals, calendars, childcare, quiet study time, or emergency planning when possible.",
          "Navigation: help identify the right office, prepare questions, track deadlines, and follow up.",
        ],
      },
    ],
    practice: {
      title: "Practice: “Maybe I do not belong here.”",
      situation: "A first-year student fails an exam and says college may not be for people from their family.",
      response: [
        "Listen before offering a solution or comparison.",
        "Separate one exam result from the student’s identity and long-term ability.",
        "Ask what support has already been tried and help locate tutoring, office hours, advising, or academic coaching.",
        "Agree on one small next action and a time to check back.",
      ],
    },
    sources: [
      {label: "IES: first-generation student support networks", href: "https://nces.ed.gov/use-work/awards/understanding-support-networks-first-generation-college-students"},
      {label: "Federal TRIO programs", href: "https://www.ed.gov/about/ed-offices/ope/trio"},
    ],
    checks: [
      {
        id: "strength-1",
        prompt: "Which response uses an asset-based approach?",
        options: ["Our family knows nothing about college", "We already know how to solve hard problems; now we are learning this system", "The school should make every decision for us"],
        correctIndex: 1,
        explanation: "Asset-based support recognizes existing strengths while adding new navigation knowledge.",
      },
      {
        id: "strength-2",
        prompt: "What is the long-term goal of family navigation?",
        options: ["The family completes every task", "The student builds confidence and can increasingly advocate for themselves", "The student avoids college offices"],
        correctIndex: 1,
        explanation: "Support should strengthen student agency, not replace it.",
      },
    ],
  },
  {
    id: "college-map",
    number: "02",
    emoji: "🗺️",
    title: "Decode the college map",
    time: "22 minutes",
    tagline: "The right office can turn panic into a plan.",
    purpose: "Learn who handles what, how college deadlines work, and how to build a simple family navigation system.",
    quickCheck: {
      prompt: "The financial-aid office and student-accounts office always perform the same job.",
      isFact: false,
      explanation: "Financial aid determines and processes aid; student accounts or the bursar manages charges, payments, balances, and many billing holds.",
    },
    mentorScript: "Let’s name the exact problem first. Then we can contact the office that actually owns the next decision.",
    sections: [
      {
        heading: "Know the common offices",
        body: "College language is easier when every office has a job.",
        bullets: [
          "Admissions: entry requirements and admission records.",
          "Registrar: enrollment, schedules, transcripts, academic records, and many withdrawal processes.",
          "Academic advising: degree plans, course choices, academic progress, and referrals.",
          "Financial aid: aid applications, eligibility, offers, verification, and school aid processes.",
          "Student accounts or bursar: charges, payments, balances, refunds, and billing holds.",
          "Dean of Students or student affairs: student support, conduct, emergencies, and cross-office concerns.",
        ],
      },
      {
        heading: "There is never just one deadline",
        body: "Admission, FAFSA, state aid, deposits, housing, registration, payment, document submission, add/drop, withdrawal, and scholarship dates may differ. Record the official date, time zone, required action, and source. Never rely on a screenshot without checking the current official page or portal.",
      },
      {
        heading: "Build a family command center",
        body: "Use a calendar and one-page action list—not a pile of screenshots. For every open issue, write the problem, deadline, office, person responsible for the next step, and proof of completion. Keep sensitive records only in the student’s approved secure systems.",
      },
    ],
    practice: {
      title: "Practice: A mysterious account hold",
      situation: "A student sees a hold but does not know why, and registration opens tomorrow.",
      response: [
        "Read the exact hold name, issuing office, and instructions in the portal.",
        "Contact the office that owns the hold and state the registration deadline.",
        "Ask what specific action removes the hold and how completion will be confirmed.",
        "Document the response and follow up before the deadline.",
      ],
    },
    sources: [
      {label: "U.S. Department of Education: find and compare colleges", href: "https://www.ed.gov/higher-education/find-college-or-educational-program"},
      {label: "College Scorecard", href: "https://collegescorecard.ed.gov/"},
    ],
    checks: [
      {
        id: "map-1",
        prompt: "Which office usually manages tuition charges and account balances?",
        options: ["Student accounts or bursar", "Library", "Career services"],
        correctIndex: 0,
        explanation: "Student accounts or the bursar generally manages billing, though office names vary by school.",
      },
      {
        id: "map-2",
        prompt: "What belongs on a strong action list?",
        options: ["Only the student’s password", "The issue, owner, deadline, official source, and confirmation", "Rumors from social media"],
        correctIndex: 1,
        explanation: "A clear action list turns a complicated issue into accountable next steps.",
      },
    ],
  },
  {
    id: "money-without-panic",
    number: "03",
    emoji: "💸",
    title: "Talk about college money without panic",
    time: "25 minutes",
    tagline: "Compare the real cost. Protect the relationship.",
    purpose: "Help a family understand FAFSA roles, aid offers, remaining costs, and changed circumstances without making promises or taking over accounts.",
    quickCheck: {
      prompt: "A FAFSA contributor automatically agrees to pay the student’s college bill.",
      isFact: false,
      explanation: "A contributor provides required information, consent, and a signature; the role does not itself create a promise to pay.",
    },
    mentorScript: "Before we say yes or no, let’s separate grants, earned aid, loans, and the amount the school says is still due.",
    sections: [
      {
        heading: "Keep every account with its owner",
        body: "The student and every required FAFSA contributor need separate StudentAid.gov accounts and should never share credentials. Federal Student Aid recommends that the student begin their own form and invite required contributors. Contributor is an information-and-signature role, not a promise to pay.",
      },
      {
        heading: "Read an offer in four layers",
        body: "Separate grants and scholarships, work-study, loans, and the remaining gap. Then compare estimated cost of attendance with the actual charges due now. Work-study is generally earned through a job, and loans must be repaid. The Student Aid Index is not a bill.",
      },
      {
        heading: "When finances change, ask—do not invent",
        body: "If income, employment, medical expenses, housing, caregiving, or other circumstances changed after the FAFSA tax year, the student can ask the school whether a documented special-circumstances review is available. Never alter accurate answers to make the form look different, and never promise approval.",
      },
    ],
    practice: {
      title: "Practice: The family cannot cover the gap",
      situation: "The aid offer leaves a balance and the family recently lost income.",
      response: [
        "Separate grants, scholarships, work-study, loans, and the actual amount due.",
        "Ask financial aid about its documented special-circumstances process.",
        "Ask student accounts about payment dates and available institutional options.",
        "Search current scholarships and other resources without promising that funding will arrive.",
      ],
    },
    sources: [
      {label: "Federal Student Aid: FAFSA steps for parents", href: "https://studentaid.gov/articles/fafsa-for-parents/"},
      {label: "Federal Student Aid: evaluate aid offers", href: "https://studentaid.gov/articles/evaluating-financial-aid-offers/"},
      {label: "Federal Student Aid: when aid is not enough", href: "https://studentaid.gov/articles/financial-aid-not-enough/"},
      {label: "CFPB: paying for college", href: "https://www.consumerfinance.gov/paying-for-college/"},
    ],
    checks: [
      {
        id: "money-1",
        prompt: "Which item is generally earned through a job instead of credited upfront like a grant?",
        options: ["Work-study", "Pell Grant", "Outside scholarship"],
        correctIndex: 0,
        explanation: "Work-study is generally earned in wages after the student obtains and works a job.",
      },
      {
        id: "money-2",
        prompt: "A family’s income dropped after the FAFSA tax year. What is the right next step?",
        options: ["Change accurate answers to guesses", "Ask the school about a documented special-circumstances review", "Create a duplicate FAFSA"],
        correctIndex: 1,
        explanation: "Schools evaluate documented changed circumstances through their own review process.",
      },
    ],
  },
  {
    id: "privacy-and-partnership",
    number: "04",
    emoji: "🔐",
    title: "Privacy, permission, and partnership",
    time: "20 minutes",
    tagline: "Stay close without taking the student’s seat.",
    purpose: "Understand the postsecondary privacy shift and support the student through consent-based communication.",
    quickCheck: {
      prompt: "A college must discuss an adult student’s records with a parent simply because the parent pays tuition.",
      isFact: false,
      explanation: "FERPA rights generally transfer to the student at age 18 or when the student attends a postsecondary institution at any age; limited exceptions may apply.",
    },
    mentorScript: "I want to support you. Tell me what you are comfortable sharing and whether you want me beside you for this conversation.",
    sections: [
      {
        heading: "College changes the privacy relationship",
        body: "Under FERPA, rights generally transfer to the student when they turn 18 or attend a postsecondary institution at any age. A school may have consent forms or other policies that let a student authorize communication. Limited legal exceptions exist, but families should not assume access.",
      },
      {
        heading: "Ask for consent before joining",
        body: "Before entering a call, meeting, email, or case, ask the student what help they want and what information may be shared. Let the student lead when possible. A family member can help take notes, ask agreed questions, and review next steps without pretending to be the student.",
      },
      {
        heading: "Protect private information",
        body: "Never ask another family to send passwords, Social Security numbers, verification codes, tax returns, bank details, identity documents, medical records, or full education records. Use the school’s secure channel. Share only what is necessary and only with the student’s permission.",
      },
    ],
    practice: {
      title: "Practice: The school will not speak with the parent",
      situation: "A parent becomes upset when a college says it cannot discuss the student’s account.",
      response: [
        "Avoid arguing or claiming automatic access.",
        "Ask the student whether they want the parent involved.",
        "Review the school’s official consent or authorized-user process.",
        "Prepare questions together and let the student lead the communication.",
      ],
    },
    sources: [
      {label: "U.S. Department of Education: eligible student FERPA guide", href: "https://studentprivacy.ed.gov/resources/eligible-student-guide-family-educational-rights-and-privacy-act-ferpa"},
      {label: "U.S. Department of Education: what is FERPA?", href: "https://studentprivacy.ed.gov/faq/what-ferpa"},
    ],
    checks: [
      {
        id: "privacy-1",
        prompt: "When do FERPA rights generally transfer to a student?",
        options: ["Only after graduation", "At age 18 or when attending a postsecondary institution at any age", "Whenever a parent requests it"],
        correctIndex: 1,
        explanation: "That is the general federal rule, subject to specific exceptions and school processes.",
      },
      {
        id: "privacy-2",
        prompt: "What is the strongest way for a family member to join a college conversation?",
        options: ["Pretend to be the student", "Join with the student’s consent and an agreed role", "Demand every record by phone"],
        correctIndex: 1,
        explanation: "Consent-based partnership protects privacy and student agency.",
      },
    ],
  },
  {
    id: "academic-belonging",
    number: "05",
    emoji: "📚",
    title: "Support academics and belonging",
    time: "21 minutes",
    tagline: "Ask early. Connect early. Normalize support.",
    purpose: "Recognize academic warning signs and help students use tutoring, advising, faculty, TRIO, and campus communities before a crisis grows.",
    quickCheck: {
      prompt: "Using tutoring is evidence that a student is not ready for college.",
      isFact: false,
      explanation: "Tutoring, office hours, advising, academic coaching, and study groups are normal college success tools.",
    },
    mentorScript: "Getting support is not admitting defeat. It is how strong students protect their goals.",
    sections: [
      {
        heading: "Watch patterns, not perfection",
        body: "One hard assignment is not a crisis. Repeated missed classes, silence, unfinished work, failing grades, lost access, or withdrawing from people may signal that the student needs support. Ask with care instead of blame.",
      },
      {
        heading: "Make the warm handoff",
        body: "Do more than say “go get help.” Identify the exact resource, help the student prepare what to ask, and confirm the next step. Resources may include faculty office hours, tutoring, writing and math centers, advising, accessibility services, counseling, career services, cultural centers, and TRIO Student Support Services where available.",
      },
      {
        heading: "Belonging is part of persistence",
        body: "Encourage at least one academic relationship, one peer or community connection, and one professional or career connection. Families can ask about the student’s people and routines—not only grades.",
      },
    ],
    practice: {
      title: "Practice: The student stops answering",
      situation: "A student who sounded excited in August is missing classes and avoiding family calls.",
      response: [
        "Lead with care, not accusations about grades or money.",
        "Ask whether the student is safe and what has made the last week difficult.",
        "Help identify the most urgent academic, health, financial, or belonging barrier.",
        "Connect the student with the appropriate campus support and schedule a short follow-up.",
      ],
    },
    sources: [
      {label: "U.S. Department of Education: TRIO Student Support Services", href: "https://www.ed.gov/grants-and-programs/grants-higher-education/federal-trio-programs/student-support-services-program-84042a"},
      {label: "Federal TRIO programs", href: "https://www.ed.gov/about/ed-offices/ope/trio"},
    ],
    checks: [
      {
        id: "academic-1",
        prompt: "What is a warm handoff?",
        options: ["Naming a resource and ending the conversation", "Helping identify the right resource, prepare the request, and confirm the next step", "Calling every office without the student"],
        correctIndex: 1,
        explanation: "A warm handoff turns a referral into a supported, student-owned action.",
      },
      {
        id: "academic-2",
        prompt: "Which family question supports belonging?",
        options: ["Why are your grades not perfect?", "Who on campus knows you and can support your goals?", "Why do you need tutoring?"],
        correctIndex: 1,
        explanation: "The question helps the student identify relationships and support without shame.",
      },
    ],
  },
  {
    id: "crisis-plan",
    number: "06",
    emoji: "🧯",
    title: "Respond when college life becomes a crisis",
    time: "24 minutes",
    tagline: "Calm first. Safety first. Then the next right office.",
    purpose: "Use a practical response for food, housing, health, transportation, mental-health, family, and enrollment emergencies.",
    quickCheck: {
      prompt: "A family navigator should investigate and decide whether a student’s crisis story is true before making a referral.",
      isFact: false,
      explanation: "A navigator listens, identifies immediate risks, protects privacy, and connects qualified resources; they do not conduct investigations.",
    },
    mentorScript: "We do not have to solve the whole semester tonight. First, are you safe? Next, what deadline or basic need is most urgent?",
    sections: [
      {
        heading: "Use SAFE",
        body: "S—Safety: ask whether there is immediate danger or a health crisis. A—Acute need: identify tonight’s food, housing, medication, transportation, or enrollment risk. F—Find the responsible campus and community resources. E—Establish the next action, owner, deadline, and follow-up.",
      },
      {
        heading: "Use the right level of help",
        body: "Immediate danger calls for 911. A mental-health crisis may call for 988. Local essentials may be available through 211. Campus resources may include public safety, counseling, health services, student affairs, case management, basic-needs centers, emergency funds, residence life, and the dean of students. Availability varies, so verify current local information.",
      },
      {
        heading: "Protect academics while help is arranged",
        body: "When appropriate, help the student ask about attendance communication, incomplete work, emergency absence processes, temporary support, add/drop or withdrawal implications, housing protection, and financial-aid consequences. Only the institution can explain and decide its policies.",
      },
    ],
    practice: {
      title: "Practice: Housing ends in 48 hours",
      situation: "A student says they may have nowhere to stay and are considering dropping all classes.",
      response: [
        "Ask whether the student is safe tonight and whether immediate emergency support is needed.",
        "Contact verified campus housing, student affairs, case-management, and local essential-needs resources with the student.",
        "Ask the registrar and financial-aid office about consequences before the student changes enrollment.",
        "Create a 24-hour action plan without promising housing or funding.",
      ],
    },
    sources: [
      {label: "EFF student resources", href: "https://portal.estherfundsfoundation.org/resources"},
      {label: "988 Suicide & Crisis Lifeline", href: "https://988lifeline.org/"},
      {label: "211 local resources", href: "https://www.211.org/"},
    ],
    checks: [
      {
        id: "crisis-1",
        prompt: "What comes first in a student crisis?",
        options: ["A complete academic plan", "Immediate safety and the most urgent basic need", "A public social-media post"],
        correctIndex: 1,
        explanation: "Safety and acute needs come before longer-term navigation.",
      },
      {
        id: "crisis-2",
        prompt: "Before a student drops every class, what should they do when possible?",
        options: ["Ask the registrar and financial-aid office about consequences and options", "Assume there are no consequences", "Let a family navigator decide"],
        correctIndex: 0,
        explanation: "Enrollment changes can affect academic progress, aid, housing, and balances; the school must explain its policies.",
      },
    ],
  },
  {
    id: "advocate-with-respect",
    number: "07",
    emoji: "📣",
    title: "Advocate clearly and professionally",
    time: "22 minutes",
    tagline: "Facts. Timeline. Specific ask. Respectful follow-through.",
    purpose: "Turn frustration into written advocacy that a college office can understand and act on.",
    quickCheck: {
      prompt: "The strongest advocacy email includes every detail the family has ever collected.",
      isFact: false,
      explanation: "Strong advocacy is focused: verified facts, a short timeline, the urgent impact, prior actions, and a specific request.",
    },
    mentorScript: "Here are the verified facts, what we already tried, the deadline we face, and the specific help we are requesting.",
    sections: [
      {
        heading: "Build the five-part message",
        body: "Use: purpose, verified facts, short timeline, impact or deadline, and a specific request. Keep the tone calm and professional. Ask for the policy, next step, responsible office, and expected response time. Do not threaten, exaggerate, or accuse without evidence.",
      },
      {
        heading: "Escalate by structure",
        body: "Start with the office that owns the issue. If the response is missing, unclear, or inconsistent, ask for a supervisor or the school’s formal appeal, complaint, or ombuds process. Keep confirmation numbers, dates, names, and copies of non-sensitive communications.",
      },
      {
        heading: "Know what you cannot promise",
        body: "A family navigator cannot guarantee aid, admission, housing, reinstatement, an appeal, a refund, a grade change, or a legal result. The navigator can help the student organize, ask, document, follow up, and connect with qualified professional help.",
      },
    ],
    practice: {
      title: "Practice: Three offices give three answers",
      situation: "The student has conflicting information and a payment deadline in two days.",
      response: [
        "Create a short timeline with dates, offices, and exact written responses.",
        "Identify which office owns the final decision.",
        "Send one focused message requesting written clarification and temporary protection while the conflict is reviewed.",
        "Escalate through the school’s official structure if no timely answer arrives.",
      ],
    },
    sources: [
      {label: "EFF Account Help: safe documentation practices", href: "https://portal.estherfundsfoundation.org/account-help"},
      {label: "U.S. Department of Education: FERPA legal basics", href: "https://studentprivacy.ed.gov/legal-basics"},
    ],
    checks: [
      {
        id: "advocate-1",
        prompt: "Which is the strongest advocacy request?",
        options: ["Fix this now because this is unfair", "Please confirm the missing item, the policy, and whether the registration hold can be paused during review", "We demand every employee’s private information"],
        correctIndex: 1,
        explanation: "It is specific, professional, and tied to the issue and deadline.",
      },
      {
        id: "advocate-2",
        prompt: "What may a family navigator promise?",
        options: ["A successful appeal", "A full scholarship", "A clear, respectful process for organizing and escalating the student’s request"],
        correctIndex: 2,
        explanation: "The process can be supported; institutional or financial outcomes cannot be guaranteed.",
      },
    ],
  },
  {
    id: "help-another-family",
    number: "08",
    emoji: "🤝",
    title: "Help another family—safely",
    time: "25 minutes",
    tagline: "Share the map. Keep their story in their hands.",
    purpose: "Practice ethical peer-family navigation, warm referrals, privacy, cultural humility, and responsible follow-through.",
    quickCheck: {
      prompt: "A trained family navigator should keep copies of another student’s records in case the family needs help later.",
      isFact: false,
      explanation: "Do not collect or store another student’s sensitive records. Help the family use secure official systems and keep ownership of their own documents.",
    },
    mentorScript: "I can help you organize the next step and prepare questions. I cannot access accounts, make the school’s decision, or keep your private documents.",
    sections: [
      {
        heading: "Use LISTEN",
        body: "L—Listen without judgment. I—Identify the exact issue and deadline. S—Separate verified facts from assumptions. T—Turn the problem into small actions. E—Escalate or refer when the decision requires an authorized professional. N—Name the next follow-up while collecting no unnecessary private information.",
      },
      {
        heading: "Practice cultural humility",
        body: "Do not assume every family has the same structure, language, immigration experience, income, transportation, technology, disability access, faith, or relationship with institutions. Ask what support feels respectful and realistic. Use interpretation and accessibility resources when available instead of placing the burden on the student.",
      },
      {
        heading: "Close with teach-back",
        body: "Ask the student or family to repeat the next three actions, who owns each action, and each deadline. Provide official links and a short written recap. A good navigator builds confidence and exits the center of the story.",
      },
    ],
    practice: {
      title: "Practice: A neighbor asks you to “handle everything”",
      situation: "They offer passwords, tax documents, and permission to speak as the student.",
      response: [
        "Decline credentials and private documents and ask them not to send those items.",
        "Explain the navigator boundary and let the student stay in control.",
        "Help organize the issue, questions, offices, and deadlines.",
        "Refer decisions and sensitive submissions to authorized school or government channels.",
      ],
    },
    sources: [
      {label: "EFF Student Emergency Mentor Guide", href: "https://portal.estherfundsfoundation.org/downloads/eff-student-emergency-mentor-guide.pdf"},
      {label: "Federal Student Aid Help Center", href: "https://studentaid.gov/help-center/contact"},
      {label: "EFF resources", href: "https://portal.estherfundsfoundation.org/resources"},
    ],
    checks: [
      {
        id: "family-1",
        prompt: "Which action stays inside the family-navigator role?",
        options: ["Accepting a student’s passwords", "Helping the family prepare questions and find the authorized office", "Promising an appeal result"],
        correctIndex: 1,
        explanation: "Navigators organize, explain public information, and refer; they do not access accounts or guarantee decisions.",
      },
      {
        id: "family-2",
        prompt: "What is the best way to close a navigation session?",
        options: ["Keep all the family’s records", "Have the family repeat the next actions, owners, and deadlines", "Tell the family to wait without a follow-up"],
        correctIndex: 1,
        explanation: "Teach-back protects clarity, ownership, and follow-through.",
      },
    ],
  },
];

export const firstGenFamilyNavigatorFinalQuestions: KnowledgeCheck[] = [
  {
    id: "family-final-1",
    prompt: "What is an asset-based way to describe a first-generation family?",
    options: ["A family with no useful college knowledge", "A family with existing strengths that is learning a new system", "A family that should avoid college decisions", "A family that must let the school control everything"],
    correctIndex: 1,
    explanation: "Asset-based support recognizes resilience and knowledge while adding navigation tools.",
  },
  {
    id: "family-final-2",
    prompt: "A student sees a registration hold. What is the strongest first move?",
    options: ["Create a new student account", "Read the exact hold and contact the office that issued it", "Ignore it until registration closes", "Post private records publicly"],
    correctIndex: 1,
    explanation: "Identify the exact problem and decision owner before acting.",
  },
  {
    id: "family-final-3",
    prompt: "A FAFSA contributor is:",
    options: ["Automatically responsible for tuition", "A person required to provide information, consent, and a signature", "A college employee", "The student’s loan co-signer in every case"],
    correctIndex: 1,
    explanation: "Contributor is a FAFSA role, not automatically a payment promise.",
  },
  {
    id: "family-final-4",
    prompt: "Under FERPA, postsecondary education-record rights generally belong to:",
    options: ["The student", "Any relative who calls", "The person paying the phone bill", "The family navigator"],
    correctIndex: 0,
    explanation: "FERPA rights generally transfer to the eligible student, subject to limited exceptions.",
  },
  {
    id: "family-final-5",
    prompt: "What makes a referral a warm handoff?",
    options: ["Naming an office only", "Helping prepare the request and confirming the next step", "Taking the student’s password", "Promising the office will approve"],
    correctIndex: 1,
    explanation: "A warm handoff supports action without taking control.",
  },
  {
    id: "family-final-6",
    prompt: "A student may lose housing tonight. What comes first?",
    options: ["A long-term career plan", "Immediate safety and urgent basic-needs connection", "A public petition using the student’s name", "A new FAFSA"],
    correctIndex: 1,
    explanation: "Safety and acute needs come before longer-term planning.",
  },
  {
    id: "family-final-7",
    prompt: "Which belongs in a focused advocacy email?",
    options: ["Verified facts, a short timeline, the deadline, and a specific request", "Every rumor the family heard", "Passwords and tax documents", "A guaranteed result"],
    correctIndex: 0,
    explanation: "Focused, factual requests are easier for an office to understand and act on.",
  },
  {
    id: "family-final-8",
    prompt: "What may an EFF Family Navigator guarantee?",
    options: ["Reinstatement", "A scholarship", "A respectful process for organizing, referring, and following up", "A grade change"],
    correctIndex: 2,
    explanation: "Navigators can support the process but cannot guarantee institutional or financial outcomes.",
  },
  {
    id: "family-final-9",
    prompt: "Another family offers you a student’s private documents. What should you do?",
    options: ["Store them permanently", "Decline and direct secure submission to the authorized office", "Share them with a group chat", "Use them to sign into the student’s account"],
    correctIndex: 1,
    explanation: "Family navigators do not collect or store sensitive records.",
  },
  {
    id: "family-final-10",
    prompt: "A strong navigation session ends with:",
    options: ["The navigator completing everything", "The family naming the next actions, owners, and deadlines", "A promise that the problem is solved", "No follow-up plan"],
    correctIndex: 1,
    explanation: "Teach-back builds clarity, agency, and follow-through.",
  },
];

export const firstGenFamilyNavigatorCourseSources = [
  {label: "Federal Student Aid: FAFSA steps for parents", href: "https://studentaid.gov/articles/fafsa-for-parents/"},
  {label: "U.S. Department of Education: FERPA eligible-student guide", href: "https://studentprivacy.ed.gov/resources/eligible-student-guide-family-educational-rights-and-privacy-act-ferpa"},
  {label: "U.S. Department of Education: TRIO Student Support Services", href: "https://www.ed.gov/grants-and-programs/grants-higher-education/federal-trio-programs/student-support-services-program-84042a"},
  {label: "U.S. Department of Education: compare colleges", href: "https://www.ed.gov/higher-education/find-college-or-educational-program"},
  {label: "Federal Student Aid: evaluate aid offers", href: "https://studentaid.gov/articles/evaluating-financial-aid-offers/"},
  {label: "Consumer Financial Protection Bureau: paying for college", href: "https://www.consumerfinance.gov/paying-for-college/"},
];
