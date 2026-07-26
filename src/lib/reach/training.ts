import type {CourseModule, KnowledgeCheck} from "@/lib/academy/financial-aid-peer-mentor";

export const REACH_AMBASSADOR_COURSE_ID = "reach-campus-ambassador-v1";
export const REACH_AMBASSADOR_PASSING_SCORE = 80;

const effSource = {label: "Esther Funds Foundation R.E.A.C.H.", href: "https://estherfundsfoundation.org/student-support"};
const careProtocol = {
  label: "EFF When Someone Is Struggling Care Protocol",
  href: "https://img1.wsimg.com/blobby/go/48c2e676-ccf9-40a0-800c-597ffdb670e2/downloads/3ba8f26c-e975-454c-b15e-928c2c0c5f6a/EFF_When_Someone_Is_Struggling_Care_Protocol.pdf?ver=1784762753677",
};
const communicationGuide = {
  label: "EFF Professional Communication & Email Etiquette",
  href: "https://img1.wsimg.com/blobby/go/48c2e676-ccf9-40a0-800c-597ffdb670e2/downloads/4ff29f35-6027-4445-a420-a000d60395e3/Professional_Communication_Email_Etiquette.pdf?ver=1784762753677",
};

export const reachAmbassadorModules: CourseModule[] = [
  {
    id: "mission",
    number: "01",
    emoji: "💜",
    title: "This is more than a club",
    time: "8 minutes",
    tagline: "Students remember how we made the next step feel possible.",
    purpose: "Understand the EFF mission, the purpose of REACH, and the standard attached to representing a student lifeline.",
    quickCheck: {
      prompt: "A successful REACH activity is measured only by attendance and social-media views.",
      isFact: false,
      explanation: "Numbers matter, but dignity, credible referrals, follow-through, and a safer student experience matter too.",
    },
    mentorScript: "You do not have to figure everything out alone. Let’s slow this down, identify what you need, and connect you with the right next step.",
    sections: [
      {
        heading: "Why EFF exists",
        body: "Esther Funds Foundation is a faith-based nonprofit working to prevent college dropout by helping students navigate financial hardship, emergencies, and other barriers that threaten their education. REACH puts that mission into action through care, connection, practical resources, and student-to-student encouragement.",
        bullets: [
          "Serve with faith and compassion without pressuring anyone to share your beliefs.",
          "Center the student’s dignity, choices, culture, privacy, and lived experience.",
          "Do not promise outcomes. Promise care, accurate information, and a responsible next step.",
        ],
      },
      {
        heading: "The ambassador standard",
        body: "You are trusted with the EFF name. Be prepared, on time, calm, inclusive, accurate, and accountable. If you make a mistake, acknowledge it early and contact the program team. Professionalism is how we protect students and each other.",
      },
    ],
    practice: {
      title: "Practice: A quiet student at your table",
      situation: "A student pauses near your table but says they are fine and starts to leave.",
      response: [
        "Respect their answer and personal space.",
        "Offer one low-pressure sentence about what REACH provides.",
        "Give them an official resource card or link they can use privately.",
        "Do not photograph, question, or publicly identify them as needing help.",
      ],
    },
    sources: [effSource, {label: "EFF mission and programs", href: "https://estherfundsfoundation.org/programs-%26-ministry"}],
    checks: [{
      id: "mission-1",
      prompt: "Which promise is appropriate for an ambassador?",
      options: ["EFF will pay your balance", "I will personally fix this today", "I can listen, help organize the next step, and connect you with an official resource"],
      correctIndex: 2,
      explanation: "Ambassadors provide care, clarity, and connection without guaranteeing funding or an institutional decision.",
    }],
  },
  {
    id: "pillars",
    number: "02",
    emoji: "🧭",
    title: "The five R.E.A.C.H. pillars",
    time: "10 minutes",
    tagline: "A repeatable way to move from concern to a responsible next step.",
    purpose: "Use the five pillars to support a student without taking over their life or case.",
    quickCheck: {
      prompt: "Holding On means an ambassador should keep a student’s crisis secret.",
      isFact: false,
      explanation: "Holding On means sustaining safe connection and hope. Safety concerns must be referred or escalated.",
    },
    mentorScript: "Let’s REACH this together: reach out, engage the right people, access credible resources, protect your well-being, and hold on to the next step.",
    sections: [
      {
        heading: "R — Reach Out",
        body: "Notice changes, make a private and respectful check-in, listen without interrogation, and ask what kind of support the student wants.",
      },
      {
        heading: "E — Engage Your Community",
        body: "Help the student identify safe people and official campus or local offices. Community includes trusted family, faculty, advisers, faith communities, campus support, and trained professionals chosen by the student.",
      },
      {
        heading: "A — Access Resources",
        body: "Use current official links, the EFF portal, and approved toolkits. Confirm the exact page, office, deadline, and required action. Do not guess or share an old screenshot as current policy.",
      },
      {
        heading: "C — Care for Your Mental Health",
        body: "Normalize rest and trained support. Ambassadors do not diagnose or counsel. For immediate danger call 911; for a mental-health crisis call or text 988; for local essentials dial 211.",
      },
      {
        heading: "H — Hold On",
        body: "Turn a large problem into one documented next step and one follow-up date. Hope is practical when a student knows what happens next.",
      },
    ],
    practice: {
      title: "Practice: Overwhelmed by five different holds",
      situation: "A student shows you a portal with several alerts and says, “I’m done. I’m dropping out.”",
      response: [
        "Acknowledge the stress before offering information.",
        "Ask the student to identify the most urgent deadline and the office attached to it.",
        "Create a short action list while the student controls their account.",
        "Agree on one follow-up check-in and offer the EFF resources page.",
      ],
    },
    sources: [effSource, {label: "EFF Student Resources", href: "https://portal.estherfundsfoundation.org/resources"}],
    checks: [{
      id: "pillars-1",
      prompt: "Which action best represents Access Resources?",
      options: ["Guessing from last semester", "Confirming the current official page, deadline, office, and next action", "Telling the student to search social media"],
      correctIndex: 1,
      explanation: "Credible, current, specific sources protect students from losing time or sharing private information in the wrong place.",
    }],
  },
  {
    id: "boxes",
    number: "03",
    emoji: "📦",
    title: "REACH boxes, materials, and delivery",
    time: "10 minutes",
    tagline: "Care packages are student support—not personal inventory.",
    purpose: "Handle program materials responsibly from delivery through student pickup and documentation.",
    quickCheck: {
      prompt: "An ambassador may promise a REACH box as soon as a student asks.",
      isFact: false,
      explanation: "Never promise inventory, contents, timing, or funding until the program team confirms availability.",
    },
    mentorScript: "I can record your interest and confirm the official next step, but I do not want to promise a box or delivery date before the REACH team confirms availability.",
    sections: [
      {
        heading: "Before boxes are shipped",
        body: "Complete certification, confirm the approved shipping address with the program team, and follow the current inventory instructions. Do not use an address where packages cannot be stored safely.",
      },
      {
        heading: "Receiving and safeguarding supplies",
        body: "Count packages, inspect for damage, store them cleanly and securely, and promptly report missing or damaged items. Do not sell, trade, keep, relabel, or distribute EFF items outside the approved purpose.",
      },
      {
        heading: "Student pickup and delivery",
        body: "Use a safe, accessible, campus-approved meeting point. Share only the information needed to coordinate. Never publish a recipient’s name, hardship, photo, or story without separate, informed consent.",
      },
      {
        heading: "After the activity",
        body: "Submit an accurate activity report, students-reached count, and consent-confirmed photos. Counts must reflect real participation—not estimated impressions.",
      },
    ],
    practice: {
      title: "Practice: The shipment is late",
      situation: "You announced a distribution date, but the boxes have not arrived.",
      response: [
        "Notify the program team and confirm the shipment status.",
        "Update registered students honestly without blaming a partner or inventing a date.",
        "Do not purchase substitute items with personal money expecting reimbursement unless EFF approved it in writing.",
        "Offer approved digital resources while students wait.",
      ],
    },
    sources: [effSource, {label: "REACH Action Hub", href: "https://reach.estherfundsfoundation.org"}],
    checks: [{
      id: "boxes-1",
      prompt: "What should happen before you announce a box distribution date?",
      options: ["Nothing; create excitement first", "Confirm inventory, shipping, location, and instructions with the program team", "Ask students to pay a hold fee"],
      correctIndex: 1,
      explanation: "Confirmation prevents broken promises and protects donated inventory.",
    }],
  },
  {
    id: "boundaries",
    number: "04",
    emoji: "🛡️",
    title: "Care without crossing the line",
    time: "12 minutes",
    tagline: "Support the student. Do not become the office, counselor, or decision-maker.",
    purpose: "Protect privacy, respond safely, and know when a question belongs with a trained professional.",
    quickCheck: {
      prompt: "A student can email an ambassador their tax return if they remove the Social Security number.",
      isFact: false,
      explanation: "Ambassadors should not receive or store tax returns or other sensitive student records.",
    },
    mentorScript: "Please do not send that document to me. I can help you identify the secure official place where it belongs and prepare your questions.",
    sections: [
      {
        heading: "What you may do",
        body: "Listen, help organize facts and questions, share approved resources, practice a phone call, help locate an official office, and follow up. The student remains in control.",
      },
      {
        heading: "What you must not do",
        body: "Do not collect passwords, verification codes, Social Security numbers, tax returns, IDs, medical records, full financial-account details, or private school records. Do not log in for someone, determine eligibility, guarantee funding, provide legal advice, diagnose, investigate, or represent yourself as an EFF employee or campus official.",
      },
      {
        heading: "Safety escalation",
        body: "If there is immediate danger, call 911. For a mental-health or suicide crisis, call or text 988. For local food, housing, transportation, and essentials, dial 211. Follow campus emergency policy and notify the EFF program contact after urgent action when safe.",
      },
      {
        heading: "Your own boundaries matter",
        body: "Do not be on call at all hours. Use official channels, state when you will follow up, and ask for support when a situation is beyond your role. Caring sustainably is part of professionalism.",
      },
    ],
    practice: {
      title: "Practice: A late-night crisis message",
      situation: "A student messages, “I don’t feel safe tonight,” and then stops replying.",
      response: [
        "Treat the message as urgent and use the available emergency information to contact 911 or campus emergency services.",
        "Do not attempt to counsel, investigate, or promise confidentiality.",
        "Share 988 if communication resumes and encourage immediate trained support.",
        "Document only the minimum factual information and notify the proper EFF contact.",
      ],
    },
    sources: [careProtocol, {label: "988 Suicide & Crisis Lifeline", href: "https://988lifeline.org/"}, {label: "211 essential services", href: "https://www.211.org/"}],
    checks: [{
      id: "boundaries-1",
      prompt: "A student asks you to log into a portal and upload a document. What is the safest response?",
      options: ["Log in if they watch", "Ask them to text the password", "Decline credentials and guide them while they control their account or refer them to the official office"],
      correctIndex: 2,
      explanation: "The student keeps control of private accounts and records at all times.",
    }],
  },
  {
    id: "workshops",
    number: "05",
    emoji: "🎤",
    title: "Run a workshop students will actually use",
    time: "12 minutes",
    tagline: "A clear next step beats a crowded slide deck.",
    purpose: "Plan accessible, useful outreach with official materials and a follow-up path.",
    quickCheck: {
      prompt: "You need a large audience for a workshop to count as impact.",
      isFact: false,
      explanation: "A small session can be meaningful when it answers real needs, uses accurate information, and creates documented next steps.",
    },
    mentorScript: "By the end of this session, you will know the one next step to take, the official source to use, and where to ask for help.",
    sections: [
      {
        heading: "Plan backward from one student outcome",
        body: "Name the audience, barrier, learning outcome, official source, activity, referral, and follow-up. Request campus space and accessibility support early. Use only the current approved deck or toolkit.",
      },
      {
        heading: "A simple 30-minute agenda",
        body: "Welcome and purpose (3 minutes), student-safe context (5), practical demonstration (10), individual action step (7), resource and follow-up plan (5). Build time for questions without guessing at answers.",
      },
      {
        heading: "Make access real",
        body: "Use readable fonts, plain language, captions when possible, accessible locations, alt text, and a quiet way to request help. Never require a student to disclose hardship in front of others.",
      },
      {
        heading: "Close the loop",
        body: "Share the exact official links, explain what happens after the workshop, submit your activity report, and follow up on commitments. Do not post a photo until everyone shown has agreed to public sharing.",
      },
    ],
    practice: {
      title: "Practice: You are asked a question you cannot verify",
      situation: "During a scholarship workshop, someone asks for an eligibility answer that is not in the official program page.",
      response: [
        "Say that you do not want to guess.",
        "Write down the exact question without collecting sensitive details.",
        "Identify the official contact or source that can answer it.",
        "Follow up with the verified information or referral.",
      ],
    },
    sources: [
      {label: "EFF Chapter Resource Hub", href: "https://estherfundsfoundation.org/eff-chapter-resources"},
      {label: "EFF Community Service Resources", href: "https://estherfundsfoundation.org/communitty-service"},
      {label: "Complete EFF Resource Drive", href: "https://drive.google.com/drive/folders/1T6mZClcxmPIdPL2IPxt1tLa8j7pS6bhA?usp=drive_link"},
    ],
    checks: [{
      id: "workshops-1",
      prompt: "What should every REACH workshop leave students with?",
      options: ["A promise of funding", "One clear next step, an official source, and a follow-up path", "A required public photo"],
      correctIndex: 1,
      explanation: "Useful workshops turn information into a credible, student-controlled next action.",
    }],
  },
  {
    id: "brand",
    number: "06",
    emoji: "📱",
    title: "Represent REACH online and in public",
    time: "10 minutes",
    tagline: "Your personal voice matters. The EFF identity still belongs to the organization.",
    purpose: "Share approved content confidently without creating unofficial pages, promises, partnerships, or public statements.",
    quickCheck: {
      prompt: "An ambassador may create an “EFF at My University” Instagram page if the bio says unofficial.",
      isFact: false,
      explanation: "No EFF or REACH account, page, group, fundraiser, logo, or branded chapter identity may be created without written National Office approval.",
    },
    mentorScript: "I serve as a REACH Campus Ambassador. For an official EFF statement or partnership decision, I will connect you with the National Office.",
    sections: [
      {
        heading: "What you may share",
        body: "Share approved graphics, official links, personal reflections that do not reveal private student information, and consent-confirmed activity photos from your personal account. Use the official introduction template and keep captions accurate.",
      },
      {
        heading: "What requires written approval",
        body: "Creating or renaming an account or page; using EFF or REACH in a username; launching a GroupMe, fundraiser, store, sponsorship, partnership, petition, event co-brand, press statement, interview, logo variation, or paid promotion; promising boxes, funding, certificates, or official recognition.",
      },
      {
        heading: "Photos and stories",
        body: "Consent to receive help is not consent to be photographed. Consent to a photo is not automatically consent to publish a story about hardship. Ask separately, explain where it will appear, and respect no without pressure.",
      },
      {
        heading: "If conflict appears online",
        body: "Do not argue from an EFF identity, share screenshots, expose private messages, or post a vague public response. Preserve the facts, pause posting, and contact the program team.",
      },
    ],
    practice: {
      title: "Practice: A campus partner asks to announce a collaboration",
      situation: "A student organization tags you in a graphic using the EFF logo before the National Office has approved the partnership.",
      response: [
        "Thank the organization privately and ask them to pause the announcement.",
        "Do not repost or publicly correct them.",
        "Send the proposed graphic and partnership details to the EFF National Office.",
        "Share only after written approval and any required brand corrections.",
      ],
    },
    sources: [
      communicationGuide,
      {label: "Official ambassador introduction template", href: "https://canva.link/ylmn6n7bgocjlcp"},
      {label: "EFF conflict-resolution resources", href: "https://estherfundsfoundation.org/conflict-resolution"},
    ],
    checks: [{
      id: "brand-1",
      prompt: "Which social-media action is allowed without additional approval?",
      options: ["Creating a REACH campus account", "Sharing the official introduction graphic from your personal account", "Launching an EFF fundraiser"],
      correctIndex: 1,
      explanation: "Approved content may be shared personally. New branded identities, fundraisers, and official statements require written approval.",
    }],
  },
  {
    id: "professionalism",
    number: "07",
    emoji: "🤝",
    title: "Communication, conflict, and accountability",
    time: "10 minutes",
    tagline: "Address the issue early. Protect the relationship and the mission.",
    purpose: "Communicate consistently, repair conflict professionally, and create dependable working relationships.",
    quickCheck: {
      prompt: "If another ambassador misses a task, the fastest solution is to call them out in the group chat.",
      isFact: false,
      explanation: "Clarify facts privately, use specific expectations, document the agreement, and escalate only when needed.",
    },
    mentorScript: "I want us to solve this directly and respectfully. Here is what I understood, here is what happened, and here is the next step I am requesting.",
    sections: [
      {
        heading: "The dependable ambassador",
        body: "Check official messages, respond within the stated window, attend required meetings, communicate conflicts before deadlines, and complete agreed follow-up. If capacity changes, say so early.",
      },
      {
        heading: "Use fact–impact–request",
        body: "Fact: describe what happened without labels. Impact: explain what it affected. Request: name the specific next action and time. Keep the conversation private and focused on behavior.",
      },
      {
        heading: "Escalate responsibly",
        body: "Contact the program team for repeated nonresponse, safety concerns, harassment, discrimination, financial questions, unauthorized branding, missing inventory, press contact, or a conflict you cannot resolve safely.",
      },
      {
        heading: "No retaliation or public shaming",
        body: "Do not threaten access, expose private messages, recruit sides, post vague criticism, or retaliate because someone raised a concern. Preserve records and use the official process.",
      },
    ],
    practice: {
      title: "Practice: Your co-host disappears",
      situation: "A co-host stops replying the day before a workshop and still has the printed materials.",
      response: [
        "Send a clear private message naming the time-sensitive fact and requested response.",
        "Alert the program team and prepare a realistic backup plan.",
        "Do not shame the person publicly or make assumptions about their motive.",
        "After the event, document what happened and agree on a prevention plan.",
      ],
    },
    sources: [communicationGuide, {label: "EFF conflict-resolution center", href: "https://estherfundsfoundation.org/conflict-resolution"}],
    checks: [{
      id: "professionalism-1",
      prompt: "Which message best uses fact–impact–request?",
      options: ["You never care about REACH", "The handouts were not delivered by today’s agreed time, which affects tomorrow’s workshop. Please confirm by 6 p.m. whether you can deliver them.", "Everyone needs to know what you did"],
      correctIndex: 1,
      explanation: "It names observable facts, the impact, and a specific next action without attacking the person.",
    }],
  },
  {
    id: "launch",
    number: "08",
    emoji: "🚀",
    title: "Your first 30 days",
    time: "8 minutes",
    tagline: "Consistency builds trust before a big event ever does.",
    purpose: "Turn certification into a realistic campus plan with relationships, resources, and reporting.",
    quickCheck: {
      prompt: "After certification, an ambassador should launch a large event before meeting any campus partners.",
      isFact: false,
      explanation: "Begin with listening, relationships, campus rules, and one achievable activity.",
    },
    mentorScript: "I’m building a REACH presence around what students here actually need. What barrier do you see most often, and what is one practical way we could respond together?",
    sections: [
      {
        heading: "Week 1: Get connected",
        body: "Join GroupMe, complete your workspace profile, download your letter and certificate, review the toolkits, and identify your official program contact.",
      },
      {
        heading: "Week 2: Listen before planning",
        body: "Meet student leaders or campus staff, identify one common barrier, learn the campus event and posting rules, and map available campus resources.",
      },
      {
        heading: "Week 3: Choose one achievable action",
        body: "Select an approved workshop, resource table, peer check-in, or service activity. Confirm the audience, location, materials, accessibility, referral plan, and consent process.",
      },
      {
        heading: "Week 4: Serve, document, improve",
        body: "Complete the activity, submit accurate impact information, follow up on referrals, thank partners, and record one improvement for next time. Consistent small actions build a credible program.",
      },
    ],
    practice: {
      title: "Practice: Build your first action",
      situation: "Your campus has many financial-aid questions, but you have no budget and only two weeks.",
      response: [
        "Choose a small approved resource-navigation session instead of promising individualized financial-aid advice.",
        "Use the EFF financial-aid peer-mentor course and official resource links.",
        "Invite an authorized campus office to answer decisions that are outside your role.",
        "Submit the activity and follow-up results in the workspace.",
      ],
    },
    sources: [
      {label: "REACH Ambassador GroupMe", href: "https://groupme.com/join_group/115383772/RY1wMSj8"},
      {label: "EFF Leadership Training Academy", href: "https://portal.estherfundsfoundation.org/academy"},
      {label: "REACH Action Hub", href: "https://reach.estherfundsfoundation.org"},
    ],
    checks: [{
      id: "launch-1",
      prompt: "What is the strongest first campus move?",
      options: ["Promise a large distribution", "Create a new REACH Instagram page", "Listen to campus needs, learn the rules, and complete one approved achievable action"],
      correctIndex: 2,
      explanation: "Credible, consistent service begins with relationships, local context, and a realistic approved action.",
    }],
  },
];

export const reachAmbassadorFinalQuestions: KnowledgeCheck[] = [
  {id: "final-1", prompt: "A student sends you a portal password. What do you do?", options: ["Use it once", "Ask them to change it and coach without entering the account", "Forward it to another ambassador"], correctIndex: 1, explanation: "Ambassadors never receive or use private credentials."},
  {id: "final-2", prompt: "When may you promise a REACH box?", options: ["As soon as a student asks", "After training", "Only after the program team confirms current inventory and delivery"], correctIndex: 2, explanation: "Certification alone does not guarantee current inventory or shipping."},
  {id: "final-3", prompt: "Which action is allowed from your personal Instagram?", options: ["Share the approved introduction template", "Create an EFF campus account", "Launch an EFF fundraiser"], correctIndex: 0, explanation: "New branded identities and fundraisers require written approval."},
  {id: "final-4", prompt: "A student says they are in immediate danger. What is the first priority?", options: ["Finish an intake form", "Call 911 or campus emergency services", "Post in GroupMe"], correctIndex: 1, explanation: "Immediate safety takes priority."},
  {id: "final-5", prompt: "What is the best workshop outcome?", options: ["A large photo", "One clear next step, official source, and follow-up path", "A promise that every issue will be solved"], correctIndex: 1, explanation: "Useful workshops make credible action possible."},
  {id: "final-6", prompt: "What consent is required before posting a student’s photo?", options: ["None at a public event", "Clear consent to be photographed and publicly shared", "The ambassador’s consent"], correctIndex: 1, explanation: "Participation is not automatic publication consent."},
  {id: "final-7", prompt: "A reporter asks for an EFF statement. What should you do?", options: ["Answer immediately", "Connect them with the National Office", "Ask social media followers"], correctIndex: 1, explanation: "Ambassadors do not issue official organizational statements."},
  {id: "final-8", prompt: "Which conflict message is professional?", options: ["You always let us down", "The agreed materials are missing; please confirm the delivery plan by 6 p.m.", "I will post the screenshots"], correctIndex: 1, explanation: "Use facts, impact, and a specific request."},
  {id: "final-9", prompt: "What does Hold On mean?", options: ["Keep crisis information secret", "Keep the student dependent on you", "Sustain hope through one responsible next step and follow-up"], correctIndex: 2, explanation: "Hold On combines encouragement with practical continuity."},
  {id: "final-10", prompt: "What must happen before representing REACH at an activity?", options: ["Create a flyer", "Complete certification and use approved materials", "Collect student records"], correctIndex: 1, explanation: "Training and approved resources protect students and the organization."},
];

export const reachAmbassadorCourseSources = [
  effSource,
  careProtocol,
  communicationGuide,
  {label: "EFF Chapter Resource Hub", href: "https://estherfundsfoundation.org/eff-chapter-resources"},
  {label: "EFF Community Service Resources", href: "https://estherfundsfoundation.org/communitty-service"},
  {label: "Official REACH Introduction Template", href: "https://canva.link/ylmn6n7bgocjlcp"},
];
