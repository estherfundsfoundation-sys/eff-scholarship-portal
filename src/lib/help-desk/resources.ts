export type HelpDeskResource = {
  key: string;
  title: string;
  href: string;
  summary: string;
  triggers: RegExp[];
  suggestedReply: string;
};

export const helpDeskResources: HelpDeskResource[] = [
  {
    key:"scholarships",title:"EFF Scholarship Directory",href:"https://portal.estherfundsfoundation.org/scholarships",
    summary:"Search 288+ scholarship opportunities and open the official provider page for eligibility and deadlines.",
    triggers:[/\bscholar(ship|ships)\b/i,/\btuition\b/i,/\baward\b/i,/\bdeadline\b/i],
    suggestedReply:"I hear that finding funding is the priority. Start with the EFF Scholarship Directory, then open each scholarship’s official page to confirm eligibility, required documents, and the current deadline. Tell me your school level, major, state, and nearest deadline, and I can help you narrow the list without guessing about eligibility.",
  },
  {
    key:"eff-programs",title:"EFF Programs and Applications",href:"https://portal.estherfundsfoundation.org/programs",
    summary:"View current EFF programs, availability, requirements, and secure applications.",
    triggers:[/\bapply\b/i,/\bapplication\b/i,/\bname your need\b/i,/\bEFF (grant|funding|scholarship)\b/i],
    suggestedReply:"EFF funding requests must be submitted through an open program in the secure portal. The individual program page shows current availability, requirements, and any deadline. Submitting an application does not guarantee an award, and volunteers cannot approve or promise funding.",
  },
  {
    key:"application-status",title:"Secure EFF Dashboard",href:"https://portal.estherfundsfoundation.org/dashboard",
    summary:"Track an EFF application, requests for information, and official status updates.",
    triggers:[/\b(status|review|decision|approved|denied)\b/i,/\bwhen will\b/i],
    suggestedReply:"Please check your secure EFF dashboard for the official application status and any request for information. EFF posts decisions and required actions there. I cannot change a status or promise a decision date, but I can help you understand what the dashboard is asking for.",
  },
  {
    key:"fafsa",title:"EFF FAFSA and Financial Aid Support",href:"https://portal.estherfundsfoundation.org/resources#fafsa-mentor",
    summary:"Identify the FAFSA stage, safely read errors, and route school or Federal Student Aid questions.",
    triggers:[/\bfafsa\b/i,/\bstudentaid\b/i,/\bfinancial aid\b/i,/\bverification\b/i,/\bSAI\b/i,/\bpell\b/i],
    suggestedReply:"Let’s identify the exact stage before choosing a next step: not started, submitted, processing, action required, processed, selected for verification, corrected, or waiting on the school. Please share the exact safe error wording and deadline—but never send a Social Security number, password, verification code, tax return, or full account record.",
  },
  {
    key:"balance",title:"Stay-Enrolled and Balance Support",href:"https://portal.estherfundsfoundation.org/resources#balance",
    summary:"Prepare an itemized account review and ask about aid, holds, payment options, or completion support.",
    triggers:[/\bbalance\b/i,/\bhold\b/i,/\bpayment\b/i,/\bbursar\b/i,/\bstudent accounts\b/i,/\bdropped (classes|courses)\b/i,/\bunenroll/i],
    suggestedReply:"I understand how urgent a balance or hold can feel. Please identify the exact amount, written deadline, consequence, itemized charges, pending aid or scholarships, and offices already contacted. Financial Aid owns aid questions; the bursar or Student Accounts owns charges and holds. We can help you organize a written account review and ask about available emergency, completion, pending-aid, payment-plan, or due-date options without promising approval.",
  },
  {
    key:"housing",title:"EFF Essentials Housing and Rent Resources",href:"https://essentials.estherfundsfoundation.org",
    summary:"Find off-campus housing and official HUD, state, county, campus, and local emergency resources.",
    triggers:[/\bhous(ing|ed|eless)\b/i,/\brent\b/i,/\beviction\b/i,/\bdorm\b/i,/\bshelter\b/i,/\bapartment\b/i],
    suggestedReply:"Your housing stability matters. Please tell me the city or campus, the exact deadline, whether you have a written notice, and whether you are physically safe tonight. EFF Essentials organizes housing and rent-emergency pathways. Dial 211 for local shelter and essentials; if you are in immediate danger, call 911.",
  },
  {
    key:"food-basic-needs",title:"Food and Basic-Needs Resources",href:"https://portal.estherfundsfoundation.org/resources#basic-needs",
    summary:"Connect campus pantries, meal support, SNAP, 211, transportation, utilities, technology, and childcare.",
    triggers:[/\bfood\b/i,/\bgrocer/i,/\bhungry\b/i,/\bSNAP\b/i,/\btransport/i,/\butility\b/i,/\blaptop\b/i,/\bchildcare\b/i],
    suggestedReply:"Thank you for naming the immediate need. The EFF Student Help Center organizes campus pantries, meal support, SNAP, transportation, utilities, technology, childcare, and local 211 pathways. Tell me your school or county and the nearest deadline so I can help choose the most relevant starting point.",
  },
  {
    key:"finish-line",title:"EFF Finish Line Support",href:"https://portal.estherfundsfoundation.org/resources/finish-line",
    summary:"Deadline-safe scholarship, advocacy, essay, planning, and opportunity-ready tools.",
    triggers:[/\bessay\b/i,/\bresume\b/i,/\brecommendation\b/i,/\bletter of rec/i,/\btonight\b/i,/\blast minute\b/i],
    suggestedReply:"EFF Finish Line has deadline-safe scholarship, essay, application-planning, advocacy, and recommendation tools. For a recommendation request, EFF can verify documented participation or submitted materials but cannot invent a personal relationship or achievements. Share the opportunity, exact deadline and submission method, and the facts EFF can truthfully verify.",
  },
  {
    key:"account-help",title:"EFF Portal Account Help",href:"https://portal.estherfundsfoundation.org/account-help",
    summary:"Resolve sign-in, invitation, password, verification, Vercel, and access problems.",
    triggers:[/\blog ?in\b/i,/\bsign ?in\b/i,/\bpassword\b/i,/\binvitation\b/i,/\bclaim\b/i,/\bvercel\b/i,/\b404\b/i,/\blink (is )?invalid\b/i,/\baccount\b/i],
    suggestedReply:"Use the official EFF portal and Account Help page. Do not request Vercel access, share passwords or codes, or create a duplicate application unless EFF instructs you. Please send the exact safe error wording, page, and time it occurred; cover any private numbers in screenshots.",
  },
  {
    key:"accessibility",title:"Accessibility Support",href:"https://portal.estherfundsfoundation.org/accessibility",
    summary:"Request an accessible alternative without affecting scholarship review.",
    triggers:[/\bdisab/i,/\baccommodat/i,/\baccessib/i,/\bscreen reader\b/i],
    suggestedReply:"EFF can help request an accessible alternative, and an accessibility request does not affect scholarship evaluation. Tell me which page or task is blocking access and what format or assistance would make it usable. School accommodations belong with the school’s Accessibility or Disability Services office.",
  },
  {
    key:"reach",title:"REACH Action Hub",href:"https://reach.estherfundsfoundation.org",
    summary:"Campus outreach, ambassador activities, and REACH resources.",
    triggers:[/\breach\b/i,/\bambassador\b/i,/\bcare package\b/i,/\boutreach\b/i],
    suggestedReply:"REACH campus outreach and ambassador resources are organized in the REACH Action Hub. Tell me whether you are asking about an ambassador account, training, a campus workshop, or student support so I can point you to the correct page.",
  },
  {
    key:"academy",title:"EFF Leadership Training Academy",href:"https://portal.estherfundsfoundation.org/academy",
    summary:"Free EFF training courses and course-completion certificates.",
    triggers:[/\btraining\b/i,/\bcourse\b/i,/\bcertificate\b/i,/\bpeer mentor\b/i],
    suggestedReply:"The EFF Leadership Training Academy offers practical training and course-completion certificates. Open the Academy, choose the relevant course, and sign in so your completion can be recorded securely.",
  },
  {
    key:"211",title:"211 Local Essentials",href:"https://www.211.org/",
    summary:"Local food, shelter, utilities, transportation, and other essential-needs referrals.",
    triggers:[/\bemergency\b/i,/\bshelter\b/i,/\bfood\b/i,/\butility\b/i,/\btransport/i],
    suggestedReply:"For local food, shelter, utilities, transportation, and essential-needs referrals, call 211 or use 211.org. Availability is local and outside assistance is not guaranteed.",
  },
];

export function matchHelpDeskResources(text: string, limit = 4) {
  const matches = helpDeskResources
    .map(resource => ({resource, score: resource.triggers.reduce((sum, trigger) => sum + (trigger.test(text) ? 1 : 0), 0)}))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.resource);
  return matches.length ? matches : [helpDeskResources.find(item => item.key === "eff-programs")!];
}

export function getHelpDeskResource(key: string) {
  return helpDeskResources.find(resource => resource.key === key);
}
