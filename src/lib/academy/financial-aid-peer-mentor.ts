export const FINANCIAL_AID_PEER_MENTOR_COURSE_ID = "financial-aid-peer-mentor-v1";
export const FINANCIAL_AID_PEER_MENTOR_PASSING_SCORE = 80;

export type KnowledgeCheck = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type CourseModule = {
  id: string;
  number: string;
  emoji: string;
  title: string;
  time: string;
  tagline: string;
  purpose: string;
  quickCheck: {
    prompt: string;
    isFact: boolean;
    explanation: string;
  };
  mentorScript: string;
  visual?: {src: string; alt: string; caption: string};
  sections: Array<{
    heading: string;
    body: string;
    bullets?: string[];
  }>;
  practice: {
    title: string;
    situation: string;
    response: string[];
  };
  sources: Array<{label: string; href: string}>;
  checks: KnowledgeCheck[];
};

const trainingCaption = "Source: U.S. Department of Education, Federal Student Aid Training Center, 2026–27 FSA Basic Training for New Staff. Accessed July 25, 2026.";

export const financialAidPeerMentorModules: CourseModule[] = [
  {
    id: "role-and-safety",
    number: "01",
    emoji: "🛡️",
    title: "Your role, your boundaries, their dignity",
    time: "15 minutes",
    tagline: "Protect the student. Protect the trust. Keep the account in their hands.",
    purpose: "Learn what an EFF Financial Aid Peer Mentor can do, what is off-limits, and how to protect a student’s privacy.",
    quickCheck: {
      prompt: "If a student gives written permission, a peer mentor can log into the student’s StudentAid.gov account.",
      isFact: false,
      explanation: "Permission does not change the boundary. The account is the student’s legal identity and signature; coach without entering it.",
    },
    mentorScript: "I can help you map the next step, but I can’t take your password or enter the account. You stay in control.",
    visual: {
      src: "/academy/fsa-basic-training-banner-screenshot.jpg",
      alt: "Official Federal Student Aid Basic Training for New Staff banner",
      caption: trainingCaption,
    },
    sections: [
      {
        heading: "You are a guide—not the financial-aid office",
        body: "Your job is to make a confusing process feel possible. You may explain public information, help someone build a checklist, practice questions for a school, and point to the right official office or website. You may not decide eligibility, interpret school policy as a final answer, or promise that aid will be approved.",
        bullets: [
          "Say: “Let’s identify the next step and the right office.”",
          "Do not say: “You definitely qualify” or “Your school has to approve this.”",
          "For account, eligibility, verification, professional-judgment, or award decisions, refer the student to the school’s financial-aid office or Federal Student Aid.",
        ],
      },
      {
        heading: "Never touch private credentials",
        body: "A StudentAid.gov account is a person’s legal electronic identity and signature. Never ask for or accept a password, Social Security number, tax return, verification code, recovery code, bank information, or a photo of an identity document. Never log in for a student or contributor. Sit beside them only if they remain in control of their own device and account.",
      },
      {
        heading: "Use the pause–protect–refer rule",
        body: "If a student begins sharing sensitive information, pause them kindly, protect what has already been shared, and refer them to the secure official process. If someone reports homelessness, abuse, abandonment, identity theft, immigration concerns, or immediate danger, do not investigate. Connect them with the appropriate trained professional.",
      },
    ],
    practice: {
      title: "Practice: “Can you just do it for me?”",
      situation: "A student texts you their StudentAid.gov password and asks you to finish the FAFSA before midnight.",
      response: [
        "Tell them to change the password immediately and never send it again.",
        "Do not log in, even with permission.",
        "Offer to stay on the phone while they complete the form themselves and help them locate official instructions.",
        "If they cannot finish because of a technical or account problem, direct them to Federal Student Aid support and notify the school about the time-sensitive barrier.",
      ],
    },
    sources: [
      {label: "Key facts about StudentAid.gov accounts", href: "https://studentaid.gov/articles/key-facts-accounts/"},
      {label: "Federal Student Aid Information Center", href: "https://studentaid.gov/help-center/contact"},
    ],
    checks: [
      {
        id: "role-1",
        prompt: "A student offers to send you their password so you can correct their FAFSA. What should you do?",
        options: ["Accept it if they give written permission", "Decline, ask them to change it, and coach without entering the account", "Ask a second mentor to witness the login"],
        correctIndex: 1,
        explanation: "A StudentAid.gov account is a legal signature. Peer mentors never receive credentials or enter another person’s account.",
      },
      {
        id: "role-2",
        prompt: "Which statement stays inside the peer-mentor role?",
        options: ["You will qualify for a Pell Grant", "Your school must approve this appeal", "Let’s organize your questions and contact the office that makes the decision"],
        correctIndex: 2,
        explanation: "Peer mentors clarify and connect. Only authorized agencies and schools make eligibility, appeal, and award decisions.",
      },
    ],
  },
  {
    id: "roadmap",
    number: "02",
    emoji: "🗺️",
    title: "The financial-aid roadmap",
    time: "18 minutes",
    tagline: "Processed is a milestone—not the finish line.",
    purpose: "See the entire process so you can help a student find where they are stuck instead of starting over.",
    quickCheck: {
      prompt: "Once the FAFSA says processed, the student’s entire financial-aid process is finished.",
      isFact: false,
      explanation: "Processed means Federal Student Aid handled the form. The Submission Summary, school requirements, verification, aid offers, and student account may still need action.",
    },
    mentorScript: "Your FAFSA is processed—great. Now let’s check your Submission Summary and school portal so nothing is quietly waiting.",
    visual: {
      src: "/academy/fsa-module-map-screenshot.jpg",
      alt: "Official Federal Student Aid Basic Training module map showing FAFSA process, eligibility, verification, grants, loans, and related topics",
      caption: trainingCaption,
    },
    sections: [
      {
        heading: "The seven-stop map",
        body: "Most students move through the same broad sequence, even when the details vary by school and state.",
        bullets: [
          "1. Prepare: create accounts and gather the information the form requests.",
          "2. Submit: complete the correct FAFSA award year and add schools.",
          "3. Process: review the FAFSA Submission Summary and resolve flagged items.",
          "4. Verify: respond to school requests through the school’s secure process.",
          "5. Compare: read each school’s aid offer and estimate the remaining cost.",
          "6. Accept: follow the school’s instructions for aid, loans, counseling, and documents.",
          "7. Confirm: check the student account for disbursement, balance, holds, and enrollment.",
        ],
      },
      {
        heading: "There is more than one deadline",
        body: "Federal, state, school, scholarship, verification, housing, billing, and enrollment deadlines may all be different. Never invent a date or assume last year’s date applies. Ask the student to open the current official page or portal and write down the date, time zone, required action, and source.",
      },
      {
        heading: "Build a one-page action list",
        body: "For each open item, record: what is missing, who owns the next action, where it must be submitted, the official deadline, and how completion will be confirmed. Do not store private documents in a mentor’s phone, email, or personal cloud drive.",
      },
    ],
    practice: {
      title: "Practice: The student says, “My FAFSA is done.”",
      situation: "Their form says processed, but the college portal shows an outstanding financial-aid requirement.",
      response: [
        "Celebrate the completed FAFSA without treating it as the end of the process.",
        "Ask the student to read the exact school-portal requirement and deadline.",
        "Help them contact the school if the requirement is unclear.",
        "Have the student confirm that the item was received and the account was updated.",
      ],
    },
    sources: [
      {label: "FAFSA process overview", href: "https://studentaid.gov/sites/default/files/fafsa-process.pdf"},
      {label: "FAFSA help topics", href: "https://studentaid.gov/apply-for-aid/fafsa/filling-out/help"},
      {label: "FSA Basic Training course map", href: "https://fsatraining.ed.gov/course/view.php?id=598"},
    ],
    checks: [
      {
        id: "roadmap-1",
        prompt: "A FAFSA shows “Processed.” What should a student do next?",
        options: ["Assume all aid is complete", "Review the Submission Summary and the school portal for required next steps", "Create a second FAFSA"],
        correctIndex: 1,
        explanation: "Processing is an important milestone, but school requirements, verification, aid offers, and account steps may remain.",
      },
      {
        id: "roadmap-2",
        prompt: "Where should a mentor confirm a deadline?",
        options: ["A social-media post", "Last year’s notes", "The current official agency, state, school, or program page"],
        correctIndex: 2,
        explanation: "Financial-aid dates can change. Always use the current official source and record it.",
      },
    ],
  },
  {
    id: "accounts-and-contributors",
    number: "03",
    emoji: "🔐",
    title: "Accounts, contributors, and preparation",
    time: "22 minutes",
    tagline: "One person. One account. Zero password sharing.",
    purpose: "Help students start cleanly and prevent the account and invitation errors that cause many delays.",
    quickCheck: {
      prompt: "A FAFSA contributor is agreeing to pay the student’s college bill.",
      isFact: false,
      explanation: "Contributor is an information, consent, and signature role. It does not itself create a promise to pay.",
    },
    mentorScript: "Contributor doesn’t mean payer. It means FAFSA needs your information and your own signature from your own account.",
    sections: [
      {
        heading: "Every person uses their own account",
        body: "The student and every required contributor use separate StudentAid.gov accounts. A contributor may be the student, a parent, a stepparent, or a spouse. Being a contributor does not make someone responsible for paying the student’s bill; it means the person must provide information, consent and approval, and a signature when required.",
      },
      {
        heading: "Match identifying information carefully",
        body: "The person creating the account should enter their own legal information exactly as requested. Each account needs its own email address. Federal Student Aid recommends using a personal email that will remain available after school or employment ends. A person should recover an existing account instead of creating a duplicate.",
      },
      {
        heading: "Let the student start the FAFSA",
        body: "The student should normally start the form from their own StudentAid.gov account. The form determines which contributors must participate. Invitations work best when identifying information matches the contributor’s StudentAid.gov account exactly.",
        bullets: [
          "Do not guess which parent belongs on the form.",
          "Use the official “Who’s My FAFSA Parent?” tool when needed.",
          "A contributor without a Social Security number may still be able to create an account and complete their section under the official process.",
        ],
      },
    ],
    practice: {
      title: "Practice: A parent thinks “contributor” means “payer”",
      situation: "A parent refuses the invitation because they cannot afford tuition.",
      response: [
        "Explain that contributor describes a FAFSA role, not a promise to pay.",
        "Explain that their section, consent and approval, and signature may be required for the student’s FAFSA to be complete.",
        "Do not pressure them or make legal claims; share the official parent instructions.",
        "If family circumstances make parent participation unsafe or impossible, refer the student to the school’s financial-aid office.",
      ],
    },
    sources: [
      {label: "Key facts about StudentAid.gov accounts", href: "https://studentaid.gov/articles/key-facts-accounts/"},
      {label: "Completing the FAFSA: steps for parents", href: "https://studentaid.gov/articles/fafsa-for-parents/"},
      {label: "Who’s My FAFSA Parent? wizard", href: "https://studentaid.gov/fafsa-apply/parents"},
    ],
    checks: [
      {
        id: "accounts-1",
        prompt: "What does becoming a FAFSA contributor mean?",
        options: ["The person promises to pay tuition", "The person must provide required information and complete their own section", "The person becomes a loan co-signer"],
        correctIndex: 1,
        explanation: "Contributor is a FAFSA information-and-signature role. It does not itself create a payment obligation.",
      },
      {
        id: "accounts-2",
        prompt: "A parent cannot access an old StudentAid.gov account. What is the safest first step?",
        options: ["Create a second account", "Use the official account-recovery process", "Use the student’s account instead"],
        correctIndex: 1,
        explanation: "Each person should have only one StudentAid.gov account. Recover the existing account rather than creating a duplicate.",
      },
    ],
  },
  {
    id: "complete-the-fafsa",
    number: "04",
    emoji: "🧩",
    title: "Complete the FAFSA without taking over",
    time: "28 minutes",
    tagline: "Explain the question. Never choose the answer.",
    purpose: "Coach students through the form’s major decision points while keeping the student in control.",
    quickCheck: {
      prompt: "A peer mentor should recommend the answer that creates the most financial aid.",
      isFact: false,
      explanation: "FAFSA answers must be accurate. A mentor explains official help text and refers unclear situations rather than steering an answer.",
    },
    mentorScript: "We’re not picking the answer with the best result—we’re finding the answer that is accurate for your real situation.",
    visual: {
      src: "/academy/fsa-module-map-screenshot.jpg",
      alt: "Official Federal Student Aid training topics including the FAFSA Process module",
      caption: trainingCaption,
    },
    sections: [
      {
        heading: "Begin with the correct award year",
        body: "A student may see more than one FAFSA form. Help them connect the award year to the academic period they plan to attend. If they are unsure, confirm with the school rather than guessing.",
      },
      {
        heading: "Student section, contributors, consent, and signatures",
        body: "The student completes the student section and invites any required contributors. Each contributor completes only their own section from their own account. Required consent and approval permits the transfer and use of federal tax information. All required people must complete the requested steps before the form can be fully processed.",
      },
      {
        heading: "School selection and final review",
        body: "Students can list schools even before they are admitted. Before submission, they should review names, dates, marital-status answers, school list, and contributor status. After submission, save the confirmation and monitor the form in “My Activity.”",
      },
      {
        heading: "What a mentor may do on a screen-share",
        body: "Ask the student to hide private numbers, remain in control, and read the question aloud without exposing the answer. Explain unfamiliar terms using official help text. Do not tell them what factual answer to choose. If a question depends on circumstances you cannot evaluate, pause and refer.",
      },
    ],
    practice: {
      title: "Practice: The form asks a question you do not understand",
      situation: "The student asks you to pick the answer that will produce the most aid.",
      response: [
        "Do not choose an answer based on the desired result.",
        "Open the official help text for that question.",
        "Help the student identify the accurate facts the question requests.",
        "If the facts are unusual or unclear, contact Federal Student Aid or the school before submission.",
      ],
    },
    sources: [
      {label: "Steps for students filling out the FAFSA", href: "https://studentaid.gov/articles/fafsa-student-steps/"},
      {label: "FAFSA form help", href: "https://studentaid.gov/apply-for-aid/fafsa/filling-out/help"},
      {label: "FSA Basic Training: FAFSA Process", href: "https://fsatraining.ed.gov/course/view.php?id=598&section=3"},
    ],
    checks: [
      {
        id: "complete-1",
        prompt: "A student asks which answer will get the most aid. What should the mentor do?",
        options: ["Choose the most favorable answer", "Help the student answer accurately using official help and refer if unclear", "Skip every optional question"],
        correctIndex: 1,
        explanation: "The FAFSA must reflect accurate facts. A mentor explains the question and refers uncertainty; they never manipulate answers.",
      },
      {
        id: "complete-2",
        prompt: "Who should sign a contributor’s FAFSA section?",
        options: ["The student", "The peer mentor", "The contributor using their own account"],
        correctIndex: 2,
        explanation: "Each required person uses their own account and legal electronic signature.",
      },
    ],
  },
  {
    id: "dependency-and-circumstances",
    number: "05",
    emoji: "🤝",
    title: "Dependency and difficult family circumstances",
    time: "24 minutes",
    tagline: "No trauma interview required. Listen, protect, and refer.",
    purpose: "Respond safely when the FAFSA’s standard family questions do not fit a student’s real life.",
    quickCheck: {
      prompt: "Paying your own rent and bills automatically makes you independent for FAFSA.",
      isFact: false,
      explanation: "FAFSA uses federal dependency criteria. Self-support alone does not establish independent status.",
    },
    mentorScript: "You don’t have to share painful details with me. Let’s find the school’s private process and the person authorized to review your situation.",
    sections: [
      {
        heading: "FAFSA dependency is not an everyday label",
        body: "Federal FAFSA dependency rules are not the same as living independently, paying your own bills, or whether a parent claims a student on a tax return. Use the official dependency questions. Do not label a student independent based on age, conflict, or self-support alone.",
      },
      {
        heading: "Special circumstances versus unusual circumstances",
        body: "Special circumstances generally involve financial changes that may affect an aid calculation, such as a job loss or major medical expense. Unusual circumstances may involve whether it is possible or safe to obtain parent information, such as abandonment, abuse, trafficking, incarceration, or estrangement. Schools review these situations through professional judgment. A peer mentor does not decide the outcome.",
      },
      {
        heading: "Homelessness and housing insecurity",
        body: "Students experiencing homelessness or at risk of homelessness should receive privacy, urgency, and a referral to the school’s financial-aid office and appropriate homeless-youth contact. Do not require them to tell a peer mentor the details of trauma. Help them ask what documentation or determination process the school uses.",
      },
    ],
    practice: {
      title: "Practice: “My parent refuses to help”",
      situation: "A student has no contact with one parent and says the other parent refuses to complete the FAFSA.",
      response: [
        "Do not decide which parent is required or promise an override.",
        "Use the official parent wizard to identify the standard contributor path.",
        "Ask whether contacting a parent is merely difficult or would be unsafe or impossible; do not ask for traumatic details.",
        "Refer the student to the school’s financial-aid office for its unusual-circumstances or other applicable review process.",
      ],
    },
    sources: [
      {label: "Dependency-status information", href: "https://studentaid.gov/apply-for-aid/fafsa/filling-out/dependency"},
      {label: "Special financial circumstances", href: "https://studentaid.gov/apply-for-aid/fafsa/review-and-correct/professional-judgment"},
      {label: "Homeless youth questions", href: "https://studentaid.gov/apply-for-aid/fafsa/filling-out/homeless"},
    ],
    checks: [
      {
        id: "dependency-1",
        prompt: "A 20-year-old pays all their own bills. Does that fact alone make them independent for FAFSA purposes?",
        options: ["Yes", "No; FAFSA uses federal dependency criteria", "Yes, if a mentor signs a statement"],
        correctIndex: 1,
        explanation: "Self-support alone does not determine FAFSA dependency status. Use the federal criteria and refer unusual circumstances to the school.",
      },
      {
        id: "dependency-2",
        prompt: "Who may make a professional-judgment decision about a student’s unusual circumstances?",
        options: ["An EFF peer mentor", "The school’s authorized financial-aid administrator", "Another student"],
        correctIndex: 1,
        explanation: "Peer mentors can help organize a request, but the school’s authorized financial-aid staff make the decision.",
      },
    ],
  },
  {
    id: "after-submission",
    number: "06",
    emoji: "📊",
    title: "After submission: status, SAI, and corrections",
    time: "22 minutes",
    tagline: "Your SAI is data—not your bill, award, or destiny.",
    purpose: "Help students understand what the FAFSA result does—and does not—mean.",
    quickCheck: {
      prompt: "The Student Aid Index is the amount a family will be charged.",
      isFact: false,
      explanation: "The SAI is an eligibility index used by schools. It is not a bill, final award, or guaranteed payment amount.",
    },
    mentorScript: "Your SAI is not your bill. Let’s use it as one clue, then wait for the school’s actual aid offer and account charges.",
    sections: [
      {
        heading: "Read the FAFSA Submission Summary",
        body: "After processing, the student can access a FAFSA Submission Summary. It may show the Student Aid Index, estimated federal aid eligibility, schools, answers, and next steps or errors. The Student Aid Index is not a bill, an award, or the amount a family must pay.",
      },
      {
        heading: "Estimated eligibility is not an aid offer",
        body: "A school uses FAFSA information plus its own cost of attendance, policies, available funding, and other requirements to prepare an aid offer. The school—not a peer mentor and not the Submission Summary—communicates the actual institutional award.",
      },
      {
        heading: "Corrections versus changes in circumstances",
        body: "Correct factual errors through the official correction process. Do not alter a previously accurate answer simply because circumstances changed or the result was disappointing. When the family’s finances changed after the FAFSA information period, ask the school about a special-circumstances review.",
      },
    ],
    practice: {
      title: "Practice: “My SAI is too high”",
      situation: "A parent lost their job after the tax year used on the FAFSA.",
      response: [
        "Do not change accurate tax-year information to current estimates unless official instructions specifically require it.",
        "Help the student identify the school’s special-circumstances or professional-judgment process.",
        "Ask the school what documentation it requires and the submission deadline.",
        "Explain that the school decides whether and how the review changes the aid offer.",
      ],
    },
    sources: [
      {label: "FAFSA Submission Summary", href: "https://studentaid.gov/articles/fafsa-submission-summary/"},
      {label: "Student Aid Index explained", href: "https://studentaid.gov/sites/default/files/sai-explained.pdf"},
      {label: "What to do after submitting", href: "https://studentaid.gov/articles/things-after-fafsa/"},
    ],
    checks: [
      {
        id: "after-1",
        prompt: "What is the Student Aid Index?",
        options: ["The student’s final bill", "An index schools use in determining aid eligibility", "A guaranteed grant amount"],
        correctIndex: 1,
        explanation: "The SAI is an eligibility index. It is not a bill, family contribution, or final award.",
      },
      {
        id: "after-2",
        prompt: "A family’s income fell after the FAFSA tax year. What is the appropriate next step?",
        options: ["Change accurate tax answers to estimates", "Ask the school about its special-circumstances review", "Submit a duplicate FAFSA"],
        correctIndex: 1,
        explanation: "Changed circumstances generally belong in the school’s documented review process, not an invented correction.",
      },
    ],
  },
  {
    id: "verification-and-offers",
    number: "07",
    emoji: "🔎",
    title: "Verification, aid offers, and the remaining gap",
    time: "26 minutes",
    tagline: "Compare the offer. Check the account. Close the gap.",
    purpose: "Help students respond to requests, compare aid accurately, and avoid preventable enrollment holds.",
    quickCheck: {
      prompt: "Work-study is automatically credited to a student’s bill before the student works.",
      isFact: false,
      explanation: "Work-study is generally earned through a job and paychecks; it is not the same as an upfront grant or scholarship.",
    },
    mentorScript: "Let’s separate free aid, earned aid, and borrowed aid—then compare all of it with what the school says is actually due.",
    visual: {
      src: "/academy/fsa-module-map-screenshot.jpg",
      alt: "Official Federal Student Aid training topics including verification, grants, loans, and packaging",
      caption: trainingCaption,
    },
    sections: [
      {
        heading: "Verification is a process—not an accusation",
        body: "A school may ask a student to confirm information or provide documents. The request, secure submission method, and deadline come from the school. Students should respond promptly and keep confirmation. A peer mentor can help make a checklist but should never receive the documents.",
      },
      {
        heading: "Read an aid offer in layers",
        body: "Separate grants and scholarships from work-study and loans. Then compare the school’s estimated cost of attendance with the aid offered and with charges actually due on the student account. Work-study normally requires the student to obtain and work a job; it is not an upfront bill credit. Loans must be repaid and may require acceptance, counseling, and a promissory note.",
      },
      {
        heading: "Close the loop on the student account",
        body: "An aid offer can still leave a gap. Ask the student to check tuition and fees, housing and meal charges, anticipated aid, payment deadlines, holds, refund timing, and enrollment status. If the numbers do not match, contact student accounts and financial aid with a written list of the differences.",
      },
    ],
    practice: {
      title: "Practice: A verification email asks for documents",
      situation: "The student forwards the email and attaches tax documents to you.",
      response: [
        "Do not open, save, forward, or keep the private attachments.",
        "Ask the student to remove the documents from the message and use the school’s secure submission channel.",
        "Help turn the request into a checklist with the school’s deadline.",
        "Have the student obtain confirmation that every item was received and accepted.",
      ],
    },
    sources: [
      {label: "Verification and corrections", href: "https://studentaid.gov/apply-for-aid/fafsa/review-and-correct"},
      {label: "How to evaluate financial-aid offers", href: "https://studentaid.gov/articles/compare-college-costs/"},
      {label: "Financial-aid dictionary", href: "https://studentaid.gov/articles/financial-aid-dictionary/"},
      {label: "FSA Basic Training: Verification & PJ", href: "https://fsatraining.ed.gov/course/view.php?id=598&section=5"},
    ],
    checks: [
      {
        id: "verification-1",
        prompt: "Where should a student send verification documents?",
        options: ["To the peer mentor’s email", "Through the school’s approved secure process", "In a group chat"],
        correctIndex: 1,
        explanation: "Sensitive documents belong only in the school’s approved secure channel.",
      },
      {
        id: "verification-2",
        prompt: "Which part of an aid offer usually requires the student to get and work a job?",
        options: ["Pell Grant", "Work-study", "Institutional scholarship"],
        correctIndex: 1,
        explanation: "Work-study is generally earned through employment; it is not the same as an upfront grant or scholarship.",
      },
    ],
  },
  {
    id: "mentoring-in-action",
    number: "08",
    emoji: "🚀",
    title: "Mentoring in action",
    time: "25 minutes",
    tagline: "Calm voice. Clear next step. Strong follow-through.",
    purpose: "Turn knowledge into calm, respectful, deadline-aware support.",
    quickCheck: {
      prompt: "Having a student repeat their next three actions is a strong way to close a mentoring session.",
      isFact: true,
      explanation: "Teach-back confirms understanding and keeps ownership with the student.",
    },
    mentorScript: "Before we wrap, tell me your next three moves, who owns each one, and the deadline for each.",
    sections: [
      {
        heading: "Use the LISTEN method",
        body: "L—Listen without blame. I—Identify the exact barrier and deadline. S—Separate facts from assumptions. T—Turn the problem into small actions. E—Escalate to the authorized office when needed. N—Note the confirmation and next follow-up without storing sensitive data.",
      },
      {
        heading: "Write messages that get useful answers",
        body: "A strong student email includes the student’s name and school ID only through the school’s approved channel, the exact portal message or requirement, the action already attempted, the deadline, and a specific question. Keep the tone factual and respectful. Do not send SSNs, passwords, tax returns, or full account details by ordinary email.",
      },
      {
        heading: "Know when the situation is urgent",
        body: "Escalate immediately when a deadline is within 72 hours; classes, housing, food, medication, transportation, or safety are at risk; the student cannot access an account; the school reports conflicting information; or the student mentions abuse, homelessness, identity theft, or a mental-health crisis. Immediate danger requires emergency services; a mental-health crisis may require 988; local essentials may be available through 211.",
      },
      {
        heading: "Close every session with ownership",
        body: "Before leaving, ask the student to say the next three actions in their own words. Confirm who will do each action and by when. Schedule a brief follow-up. The goal is not dependence on the mentor; it is a student who can navigate the next step with confidence.",
      },
    ],
    practice: {
      title: "Practice: A student may be dropped tomorrow",
      situation: "Their school says a required verification item is missing, but the student believes it was uploaded.",
      response: [
        "Treat the deadline as urgent without promising a result.",
        "Help the student locate the upload confirmation and exact portal status.",
        "Help them contact both financial aid and any office controlling the hold, using the school’s urgent-contact process.",
        "Ask for written confirmation of what remains missing, what protection is available while it is reviewed, and the next decision time.",
      ],
    },
    sources: [
      {label: "Federal Student Aid help center", href: "https://studentaid.gov/help-center/contact"},
      {label: "FAFSA help", href: "https://studentaid.gov/apply-for-aid/fafsa/filling-out/help"},
      {label: "EFF student resources", href: "https://portal.estherfundsfoundation.org/resources"},
    ],
    checks: [
      {
        id: "action-1",
        prompt: "Which is the strongest closing question for a mentoring session?",
        options: ["Do you understand?", "Can you tell me your next three actions and deadlines?", "Will you send me all your documents?"],
        correctIndex: 1,
        explanation: "Teach-back confirms understanding and gives the student ownership without collecting private records.",
      },
      {
        id: "action-2",
        prompt: "A student may lose housing in two days. How should the mentor respond?",
        options: ["Wait for the next regular meeting", "Treat it as urgent, connect the right offices and resources, and document next actions", "Promise that EFF will pay the balance"],
        correctIndex: 1,
        explanation: "Urgent basic-needs and enrollment risks need prompt connection and follow-up, without promises of funding or outcomes.",
      },
    ],
  },
];

export const financialAidPeerMentorFinalQuestions: KnowledgeCheck[] = [
  {
    id: "final-1",
    prompt: "A student sends you a password and asks you to submit the FAFSA. What is your first responsibility?",
    options: ["Log in before the deadline", "Tell them to change it and continue only as a coach", "Forward it to their parent", "Save it in an encrypted note"],
    correctIndex: 1,
    explanation: "Mentors never receive or use credentials.",
  },
  {
    id: "final-2",
    prompt: "A FAFSA contributor is:",
    options: ["Always responsible for the bill", "A person required to provide information, consent and approval, and a signature", "The student’s loan co-signer", "Any relative who gives advice"],
    correctIndex: 1,
    explanation: "Contributor describes a FAFSA role, not a payment promise.",
  },
  {
    id: "final-3",
    prompt: "A student’s processed FAFSA means:",
    options: ["Their aid is finalized", "They should review the Submission Summary and school requirements", "They are guaranteed a grant", "No school follow-up is needed"],
    correctIndex: 1,
    explanation: "Processing is followed by review, school requirements, and an aid offer.",
  },
  {
    id: "final-4",
    prompt: "Which fact alone does NOT establish FAFSA independence?",
    options: ["The student pays their own rent", "The student meets an official dependency criterion", "The school approves a dependency override", "The student is married"],
    correctIndex: 0,
    explanation: "Self-support does not alone establish federal FAFSA independence.",
  },
  {
    id: "final-5",
    prompt: "A family lost income after the FAFSA tax year. The mentor should help the student:",
    options: ["Replace accurate tax answers with guesses", "Ask the school about special-circumstances review", "Create another StudentAid.gov account", "Ignore the change"],
    correctIndex: 1,
    explanation: "The school evaluates documented changes through professional judgment.",
  },
  {
    id: "final-6",
    prompt: "A school asks for verification documents. The mentor should:",
    options: ["Collect them in a personal folder", "Help make a checklist and direct secure submission to the school", "Email them from the mentor’s account", "Decide which documents are unnecessary"],
    correctIndex: 1,
    explanation: "Peer mentors organize and refer; they do not receive sensitive documents.",
  },
  {
    id: "final-7",
    prompt: "The Student Aid Index is:",
    options: ["The final amount the family owes", "An index used in determining eligibility", "A guaranteed Pell Grant", "The student’s account balance"],
    correctIndex: 1,
    explanation: "The SAI is an eligibility index, not a bill or final award.",
  },
  {
    id: "final-8",
    prompt: "A student is facing an enrollment deadline tomorrow. The best mentor response is to:",
    options: ["Promise reinstatement", "Help document the issue and use the school’s urgent escalation process", "Wait seven business days", "Tell the student to submit a duplicate FAFSA"],
    correctIndex: 1,
    explanation: "Urgent, documented escalation is appropriate; guarantees and duplicate forms are not.",
  },
  {
    id: "final-9",
    prompt: "Which statement is appropriate for an EFF peer mentor?",
    options: ["You definitely qualify", "I can sign that section for you", "Let’s find the official rule and prepare your question for the financial-aid office", "EFF can override the school"],
    correctIndex: 2,
    explanation: "Mentors explain, organize, and connect students to authorized decision-makers.",
  },
  {
    id: "final-10",
    prompt: "A successful mentoring session ends with:",
    options: ["The mentor holding the student’s files", "The student naming their next actions, owners, and deadlines", "A promise that aid will arrive", "A completed form signed by the mentor"],
    correctIndex: 1,
    explanation: "Teach-back and a clear action plan build student agency and safe follow-through.",
  },
];

export const financialAidPeerMentorCourseSources = [
  {label: "Federal Student Aid Training Center", href: "https://fsatraining.ed.gov/"},
  {label: "2026–27 FSA Basic Training for New Staff", href: "https://fsatraining.ed.gov/course/view.php?id=598"},
  {label: "FSA Basic Training: FAFSA Process", href: "https://fsatraining.ed.gov/course/view.php?id=598&section=3"},
  {label: "Federal Student Aid FAFSA help", href: "https://studentaid.gov/apply-for-aid/fafsa/filling-out/help"},
  {label: "Federal Student Aid resource articles", href: "https://studentaid.gov/articles/"},
];
