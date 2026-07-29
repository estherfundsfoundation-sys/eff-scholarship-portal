export const HELP_DESK_TRAINING_VERSION = 1;
export const HELP_DESK_PASSING_SCORE = 100;

export type HelpDeskTrainingModule = {
  id: string;
  number: string;
  title: string;
  purpose: string;
  lessons: Array<{heading: string; body: string; bullets?: string[]}>;
  practice: {situation: string; response: string[]};
};

export type HelpDeskTrainingQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const helpDeskTrainingModules: HelpDeskTrainingModule[] = [
  {
    id: "relationship-standard",
    number: "01",
    title: "The EFF relationship standard",
    purpose: "Make every student feel heard while moving the conversation toward a useful next step.",
    lessons: [
      {
        heading: "Listen, name the need, then act",
        body: "Begin with warmth and respect. Reflect the student’s main concern in one sentence, confirm the deadline or consequence, and offer the smallest useful next step. Do not copy and paste every EFF link into every conversation.",
        bullets: [
          "Use the student’s preferred name.",
          "Acknowledge urgency without promising an outcome.",
          "Ask one focused question at a time when information is missing.",
          "End with who will do what next and when the student should return.",
        ],
      },
      {
        heading: "Relationship does not mean overpromising",
        body: "EFF can provide navigation, resource education, document organization, advocacy preparation, and consent-based outreach. EFF cannot promise funding, admission, reinstatement, housing, an appeal result, or a decision date controlled by another organization.",
      },
    ],
    practice: {
      situation: "A student writes, “Nobody cares and I am about to lose my classes tomorrow.”",
      response: [
        "Thank them for trusting EFF and acknowledge the deadline.",
        "Ask for the exact notice, office, deadline, and action already taken.",
        "Route the case as urgent and help them prepare a concise written request.",
        "Do not say the school must restore the classes or that EFF will pay the balance.",
      ],
    },
  },
  {
    id: "scope-boundaries",
    number: "02",
    title: "Volunteer scope, privacy, and boundaries",
    purpose: "Protect students, volunteers, and EFF by keeping every conversation inside the trained volunteer role.",
    lessons: [
      {
        heading: "You are a trained navigator—not a licensed professional",
        body: "Volunteers are not therapists, attorneys, financial-aid administrators, tax advisers, investigators, or EFF award decisionmakers. Explain public information, help organize facts and questions, and connect the student to the office or resource that owns the decision.",
      },
      {
        heading: "Never collect secrets",
        body: "Do not ask for Social Security numbers, passwords, verification codes, tax returns, full bank or card details, medical records, immigration documents, or unredacted identity records. If a student posts one, tell them not to send it again, flag the message for privacy review, and escalate.",
      },
      {
        heading: "Keep cases in the secure desk",
        body: "Do not move a student to a personal phone, social account, group chat, or personal email. Email notifications may tell someone that a secure message is waiting, but must not contain the student’s private story.",
      },
    ],
    practice: {
      situation: "A student offers their portal password so you can check a financial-aid requirement.",
      response: [
        "Decline the password and ask them to change it if it was already shared.",
        "Ask the student to read the exact safe error text while they control their device.",
        "Direct account problems to EFF Account Help or the school/Federal Student Aid support channel.",
      ],
    },
  },
  {
    id: "resource-map",
    number: "03",
    title: "Know the EFF resource map",
    purpose: "Choose the right EFF doorway instead of making a student search the whole internet.",
    lessons: [
      {
        heading: "Core EFF student resources",
        body: "The National Help Desk is the relationship and navigation layer. The Student Help Center provides verified emergency and financial-aid pathways. The Scholarship Directory contains 288+ opportunities. EFF Programs contains current EFF applications and availability. Finish Line provides deadline, application, advocacy, and recommendation tools.",
        bullets: [
          "Help Desk: /resources/student-help",
          "Student Help Center: /resources",
          "Scholarship Directory: /scholarships",
          "EFF Programs: /programs",
          "Finish Line tools: /resources/finish-line",
          "Leadership Training Academy: /academy",
        ],
      },
      {
        heading: "Connected EFF resources",
        body: "EFF Essentials supports searches for housing and basic-needs resources. REACH provides campus outreach and care-package programming. The Chapter Resource Hub supports recognized EFF chapters. Use only the resource that matches the student’s need.",
        bullets: [
          "EFF Essentials: https://essentials.estherfundsfoundation.org",
          "REACH Action Hub: https://reach.estherfundsfoundation.org",
          "Chapter resources: https://estherfundsfoundation.org/eff-chapter-resources",
        ],
      },
    ],
    practice: {
      situation: "A student asks, “Can you find scholarships for me?”",
      response: [
        "Ask about school level, major, location, identity or service criteria, and deadline.",
        "Direct them to the EFF Scholarship Directory.",
        "Help them shortlist opportunities whose official eligibility rules they meet.",
        "Never invent eligibility or a deadline.",
      ],
    },
  },
  {
    id: "financial-aid",
    number: "04",
    title: "FAFSA, financial aid, balances, and enrollment",
    purpose: "Help students identify the office, document, and decision that owns the next step.",
    lessons: [
      {
        heading: "FAFSA and aid questions",
        body: "Identify the exact stage: not started, submitted, processing, action required, processed, verification, corrected, or waiting on the school. Students keep control of StudentAid.gov. Use current official Federal Student Aid and school sources.",
      },
      {
        heading: "Balances and holds",
        body: "Help the student collect an itemized bill, aid offer, pending scholarship notice, receipts, hold notice, and deadline. Route account reconciliation to Student Accounts or the bursar and aid questions to Financial Aid. Ask about emergency/completion grants, professional judgment, payment options, pending-aid review, due-date extensions, and late-fee review without promising approval.",
      },
      {
        heading: "Enrollment and records",
        body: "Admissions, the registrar, advising, and enrollment management may own different steps. Get the exact written notice, current deadline, prior case number, and desired outcome before drafting advocacy.",
      },
    ],
    practice: {
      situation: "A student says, “My FAFSA is done but I still owe $4,200.”",
      response: [
        "Do not assume FAFSA completion equals a complete aid package.",
        "Ask for the safe wording in the aid portal and an itemized account balance.",
        "Separate missing-aid questions from student-account charges.",
        "Route the student to the school offices and EFF financial-aid/balance resources.",
      ],
    },
  },
  {
    id: "basic-needs",
    number: "05",
    title: "Housing, food, transportation, and emergencies",
    purpose: "Respond to basic-needs crises with practical, local, and campus-connected support.",
    lessons: [
      {
        heading: "Start with the immediate consequence",
        body: "Ask what may happen, the amount if relevant, the deadline, current location, and whether the student is physically safe. Connect campus basic-needs centers, dean of students, emergency grants, food pantries, meal support, emergency housing, transportation, utilities, technology, childcare, and work-study options.",
      },
      {
        heading: "Use verified public pathways",
        body: "EFF Essentials and the Student Help Center organize campus, HUD, state, county, SNAP, and 211 resources. For local essentials dial 211. EFF assistance and outside resources are never guaranteed.",
      },
      {
        heading: "Funding requests are decisions, not volunteer promises",
        body: "Volunteers may explain how to submit an eligible EFF application or essentials request. Only authorized EFF staff decide funding. Escalate requests for exceptions, awards, or payment decisions.",
      },
    ],
    practice: {
      situation: "A student says they will be locked out of housing tonight.",
      response: [
        "Confirm whether they are in immediate physical danger.",
        "If in danger, direct them to 911; otherwise connect 211 and campus emergency housing/dean resources.",
        "Ask for the written notice and deadline, then escalate as urgent.",
        "Never promise EFF will pay the housing balance.",
      ],
    },
  },
  {
    id: "scholarships-recommendations",
    number: "06",
    title: "Scholarships, applications, and recommendation requests",
    purpose: "Help students compete honestly and protect EFF’s credibility.",
    lessons: [
      {
        heading: "Scholarship questions",
        body: "Use the EFF Scholarship Directory and the opportunity’s official page. Current availability and deadlines belong to the individual program page. Submission never guarantees an award.",
      },
      {
        heading: "EFF recommendation boundary",
        body: "EFF may verify documented participation, service, submitted materials, or an advocacy relationship. EFF cannot invent a personal relationship, achievements, hours, grades, character observations, or staff knowledge that does not exist. Escalate recommendation requests for authorized review.",
      },
      {
        heading: "Application status",
        body: "Direct EFF applicants to their secure dashboard. Do not decide eligibility, reveal private reviewer notes, change a status, or promise a review date unless it is officially published.",
      },
    ],
    practice: {
      situation: "A student asks you to say you have mentored them for three years.",
      response: [
        "Decline the false claim respectfully.",
        "Offer to help organize documented achievements and EFF-verified participation.",
        "Escalate the recommendation request for authorized staff review.",
      ],
    },
  },
  {
    id: "crisis-safety",
    number: "07",
    title: "Crisis, self-harm, threats, and safety locks",
    purpose: "Recognize when a conversation must leave the normal help queue and enter the safety protocol.",
    lessons: [
      {
        heading: "Do not counsel a mental-health crisis",
        body: "If someone mentions suicide, self-harm, an attempt, immediate danger, or a credible threat, respond with the platform safety message, direct immediate danger to 911 and crisis support to call or text 988, and trigger the safety lock. Do not debate, investigate, diagnose, or promise confidentiality.",
      },
      {
        heading: "The safety lock is not abandonment",
        body: "The system records the message, provides crisis resources, pauses ordinary volunteer replies, and alerts EFF leadership. The purpose is to keep an unlicensed volunteer from handling a life-safety situation alone.",
      },
      {
        heading: "Conduct and harassment",
        body: "Sexual, hateful, threatening, coercive, or personally targeted messages must be flagged. Set a professional boundary, stop engagement, and escalate. Leadership may close or restrict the case.",
      },
    ],
    practice: {
      situation: "A student writes, “There is no point in living if I lose school.”",
      response: [
        "Treat the statement seriously even if you are uncertain about intent.",
        "Use the safety response: 911 for immediate danger and call/text 988 for crisis support.",
        "Trigger the safety lock and leadership alert.",
        "Do not continue the conversation as ordinary academic support.",
      ],
    },
  },
  {
    id: "escalation",
    number: "08",
    title: "When to escalate to the National Office or CEO",
    purpose: "Know which decisions and risks must move to authorized leadership.",
    lessons: [
      {
        heading: "Escalate immediately",
        body: "Safety threats, self-harm, credible violence, harassment, exposed sensitive data, media requests, subpoenas or legal threats, allegations against EFF personnel, and imminent housing or enrollment consequences require escalation.",
      },
      {
        heading: "Escalate for authorized decisions",
        body: "Funding or exception decisions, application-status changes, eligibility determinations, school advocacy using EFF’s name, public statements, legal or policy commitments, and recommendation letters require authorized staff review.",
      },
      {
        heading: "Escalation messages stay factual",
        body: "Record what the student said, the deadline, action already taken, and the reason for escalation. Do not label, diagnose, speculate, or include unnecessary private details in email alerts.",
      },
    ],
    practice: {
      situation: "A reporter asks a volunteer to confirm how many students EFF reinstated.",
      response: [
        "Do not answer or share case information.",
        "Escalate the media request to EFF leadership.",
        "Keep the requester and message in the secure record.",
      ],
    },
  },
  {
    id: "desk-workflow",
    number: "09",
    title: "Using the live desk",
    purpose: "Claim, document, hand off, and close conversations responsibly.",
    lessons: [
      {
        heading: "Availability is honest",
        body: "Choose a 10-, 15-, 30-, or 60-minute availability period only when you can actively respond. EFF says a trained volunteer will reply when available; it does not promise constant live staffing.",
      },
      {
        heading: "One owner at a time",
        body: "Claim a case before replying. Read the intake and complete transcript. Use suggested replies as editable guidance, not blind scripts. Release or hand off when you cannot continue.",
      },
      {
        heading: "Close with a next-step summary",
        body: "State what the student will do, what EFF will do, the important deadline, and when the case may close or return. Leadership can reopen, reassign, or close any conversation.",
      },
    ],
    practice: {
      situation: "Your 15-minute availability ends while a student is gathering documents.",
      response: [
        "Tell the student the next step and that another trained volunteer may continue.",
        "Leave a factual handoff note in the secure closeout summary.",
        "Release the case; do not move the student to your personal contact method.",
      ],
    },
  },
  {
    id: "service-quality",
    number: "10",
    title: "Service hours, records, and quality",
    purpose: "Make volunteer recognition accurate and every case reviewable.",
    lessons: [
      {
        heading: "Hours reflect service performed",
        body: "The system records claim time, meaningful volunteer messages, and closeout. Passive availability alone is not credited as case service. Credits are capped, rounded, and auditable; EFF may correct inaccurate records.",
      },
      {
        heading: "Every transcript belongs to EFF",
        body: "Leadership can review closed and active conversations for safety, training, quality, and case continuity. Volunteers must not copy, screenshot, download, publish, or reuse student stories.",
      },
      {
        heading: "Revocation protects the desk",
        body: "EFF can pause or revoke access for privacy violations, unsafe advice, false promises, harassment, inactivity during claimed cases, or policy violations. Report mistakes promptly; hiding them is more serious than asking for help.",
      },
    ],
    practice: {
      situation: "A volunteer claims a case but sends no response and leaves it assigned for an hour.",
      response: [
        "No case-service time should be credited.",
        "The case should be released or reassigned.",
        "Repeated abandonment may lead to pause or revocation.",
      ],
    },
  },
];

export const helpDeskTrainingQuestions: HelpDeskTrainingQuestion[] = [
  {id:"q1",prompt:"A student says they may lose classes tomorrow. What is the best first response?",options:["Promise EFF will fix it","Acknowledge the urgency, confirm the exact notice and deadline, then identify the next owner","Send every EFF link"],correctIndex:1,explanation:"EFF listens, clarifies the consequence, and routes the next step without promising an outcome."},
  {id:"q2",prompt:"Where should ordinary student-support conversations happen?",options:["A volunteer’s personal text messages","The secure EFF National Help Desk","Any social-media DM"],correctIndex:1,explanation:"The secure desk protects continuity, privacy, supervision, and transcripts."},
  {id:"q3",prompt:"A student posts a password. What should you do?",options:["Use it once","Tell them to change it, do not use it, flag privacy risk, and escalate","Save it in the case note"],correctIndex:1,explanation:"Volunteers never receive or use credentials."},
  {id:"q4",prompt:"Where should a student search EFF’s 288+ scholarship opportunities?",options:["The EFF Scholarship Directory","The Careers website","A volunteer’s personal spreadsheet"],correctIndex:0,explanation:"Use portal.estherfundsfoundation.org/scholarships and each opportunity’s official page."},
  {id:"q5",prompt:"A processed FAFSA means:",options:["All aid is complete","The federal form processed; school requirements and account steps may remain","A student should file a duplicate FAFSA"],correctIndex:1,explanation:"Processed is a milestone, not the end of the aid process."},
  {id:"q6",prompt:"Who decides whether EFF gives a student money?",options:["Any certified volunteer","The student’s school","Authorized EFF decisionmakers under the applicable program"],correctIndex:2,explanation:"Volunteers explain application paths but never approve or promise funding."},
  {id:"q7",prompt:"A student needs local food or emergency housing resources. Which number can connect local essentials?",options:["211","411","811"],correctIndex:0,explanation:"211 connects people to local essential-needs resources."},
  {id:"q8",prompt:"A student is in immediate physical danger. Direct them to:",options:["Wait for a volunteer","911","The scholarship directory"],correctIndex:1,explanation:"Immediate danger belongs with emergency services."},
  {id:"q9",prompt:"A student expresses suicidal thoughts. What is required?",options:["Provide counseling until they calm down","Use the safety response, direct 911 for immediate danger and call/text 988, safety-lock, and alert leadership","Close the browser without replying"],correctIndex:1,explanation:"Volunteers do not counsel a suicide crisis; the safety protocol connects qualified crisis support and leadership."},
  {id:"q10",prompt:"Can EFF write that it mentored someone for years when records do not support that?",options:["Yes, to help the student","Only if the deadline is close","No; EFF may verify documented participation but must not invent a relationship"],correctIndex:2,explanation:"Recommendation letters must be truthful and limited to verifiable facts."},
  {id:"q11",prompt:"A journalist asks for case totals and student names. What should a volunteer do?",options:["Answer from memory","Escalate the media request and disclose nothing","Share only first names"],correctIndex:1,explanation:"Public statements and case information require leadership review."},
  {id:"q12",prompt:"A student asks when their EFF award will be approved. A volunteer should:",options:["Give a likely date","Direct them to the secure dashboard and avoid promising a date not officially published","Change their status"],correctIndex:1,explanation:"Volunteers cannot decide eligibility, status, or review timelines."},
  {id:"q13",prompt:"Suggested replies are:",options:["Editable guidance that must be matched to the student’s actual message","Mandatory scripts to paste without reading","Legal advice"],correctIndex:0,explanation:"Volunteers must read the conversation and individualize the response."},
  {id:"q14",prompt:"When your shift ends during an active case, you should:",options:["Move the student to your phone","Leave a factual handoff and release the case","Keep the case assigned overnight"],correctIndex:1,explanation:"A documented handoff keeps the desk available and the relationship continuous."},
  {id:"q15",prompt:"Which activity earns case-service time?",options:["Leaving a shift tab open","A claimed case with meaningful response activity and closeout","Being signed in but unavailable"],correctIndex:1,explanation:"Service records are based on work performed, not passive time."},
  {id:"q16",prompt:"Can EFF leadership review closed volunteer conversations?",options:["No","Only with volunteer permission","Yes, for safety, quality, continuity, and accountability"],correctIndex:2,explanation:"EFF owns and supervises National Help Desk records."},
  {id:"q17",prompt:"A student sends threatening or sexual messages to a volunteer. The volunteer should:",options:["Argue back","Set a professional boundary, flag conduct, stop engagement, and escalate","Delete the transcript"],correctIndex:1,explanation:"The conduct protocol protects volunteers and preserves an auditable record."},
  {id:"q18",prompt:"What score unlocks the EFF National Help Desk volunteer console?",options:["80%","90%","100%"],correctIndex:2,explanation:"All safety and resource questions must be correct before access unlocks."},
];
