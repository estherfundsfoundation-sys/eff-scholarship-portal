export const helpRouting:Record<string,{department:string;documents:string[];requests:string[]}>={
  "Financial aid or FAFSA":{department:"Financial Aid Office",documents:["FAFSA Submission Summary","financial-aid offer","verification or correction notice","change-in-circumstance evidence"],requests:["a written account review","the exact outstanding requirement","available professional-judgment, emergency-aid, or hold-relief options"]},
  "Past-due balance or registration hold":{department:"Bursar or Student Accounts",documents:["itemized account statement","payment receipts","pending scholarship or aid notice","hold notice"],requests:["an itemized balance reconciliation","review of pending aid and credits","a temporary hold release or payment option while review is pending"]},
  "Admissions or enrollment":{department:"Admissions or Enrollment Management",documents:["admission notice","enrollment checklist","cancellation or deadline notice","prior case numbers"],requests:["an individualized enrollment review","a written list of remaining requirements","preservation or restoration of the student’s place while review is pending"]},
  "Housing or food insecurity":{department:"Dean of Students or Basic Needs Center",documents:["housing or meal notice","short statement of immediate need","relevant deadline","campus emergency-aid form"],requests:["an urgent basic-needs assessment","available food, housing, or emergency-aid support","a named case contact and response date"]},
  "Academic records or transfer":{department:"Registrar",documents:["transcript or transfer notice","degree audit","registration hold","course schedule"],requests:["a records and hold review","the exact corrective step","written confirmation of the processing timeline"]},
  "Disability or accessibility support":{department:"Accessibility or Disability Services",documents:["accommodation request","prior determination, if applicable","the office’s secure-document instructions"],requests:["the school’s interactive accommodation process","secure instructions for any documentation","temporary support while review is pending where available"]},
  "International or veteran services":{department:"International Student or Veterans Services",documents:["school notice","benefit or status notice","deadline","prior case numbers"],requests:["a status-specific review","coordination with the responsible campus office","written next steps and deadline"]},
  "Technology access":{department:"Student Technology Services or Dean of Students",documents:["device or access error","course technology requirement","deadline","support ticket"],requests:["a loaner, hotspot, repair, or access option","coordination with the student’s course or adviser","a written resolution timeline"]},
  "Discrimination, safety, or student rights":{department:"Title IX, Equal Opportunity, or Student Advocacy",documents:["factual timeline","preserved communications","witness information","requested safety or access measure"],requests:["the correct confidential reporting process","available supportive measures","a named contact and written next step"]},
  "Other":{department:"Dean of Students or Student Advocacy",documents:["factual timeline","school notices","prior case numbers","relevant deadline"],requests:["routing to the office that owns the decision","a named case contact","written next steps and response date"]}
};

export type SchoolContact={
  department_key:string;
  department_name:string;
  contact_url:string|null;
  email:string|null;
  phone:string|null;
  source_url:string;
};

const departmentKeys:Record<string,string[]>={
  "Financial aid or FAFSA":["financial_aid"],
  "Past-due balance or registration hold":["student_accounts","financial_aid"],
  "Admissions or enrollment":["admissions","registrar"],
  "Housing or food insecurity":["basic_needs","housing","student_advocacy"],
  "Academic records or transfer":["registrar"],
  "Disability or accessibility support":["accessibility"],
  "International or veteran services":["international","veterans"],
  "Technology access":["technology","student_advocacy"],
  "Discrimination, safety, or student rights":["title_ix","student_advocacy"],
  "Other":["student_advocacy"]
};

export function contactKeysForIssue(issueType:string){
  return departmentKeys[issueType]??departmentKeys.Other;
}

export function buildAutomaticStudentRouting(record:{
  case_code:string;
  school_name:string;
  issue_type:string;
  school_deadline:string|null;
  essentials_requested:boolean;
  essentials_term:string|null;
},contacts:SchoolContact[],fallbacks:{website?:string|null;admissions_url?:string|null;financial_aid_url?:string|null;accessibility_url?:string|null;veterans_url?:string|null}={}){
  const route=helpRouting[record.issue_type]??helpRouting.Other;
  const lines=contacts.map(contact=>{
    const details=[
      contact.email?`Email: ${contact.email}`:null,
      contact.phone?`Phone: ${contact.phone}`:null,
      contact.contact_url?`Official page: ${contact.contact_url}`:`Official source: ${contact.source_url}`
    ].filter(Boolean).join("\n");
    return `${contact.department_name}\n${details}`;
  });
  if(!lines.length){
    const fallbackUrl=
      record.issue_type==="Financial aid or FAFSA"||record.issue_type==="Past-due balance or registration hold"?fallbacks.financial_aid_url:
      record.issue_type==="Admissions or enrollment"||record.issue_type==="Academic records or transfer"?fallbacks.admissions_url:
      record.issue_type==="Disability or accessibility support"?fallbacks.accessibility_url:
      record.issue_type==="International or veteran services"?fallbacks.veterans_url:
      fallbacks.website;
    lines.push(`${route.department}\nUse ${record.school_name}'s official directory${fallbackUrl?`: ${fallbackUrl}`:" and student portal"} to locate the current office contact.`);
  }
  const deadline=record.school_deadline?`\nReported deadline: ${record.school_deadline}\n`:"\n";
  return `Case: ${record.case_code}
School: ${record.school_name}
Topic: ${record.issue_type}${deadline}
Start with these official school channels:

${lines.join("\n\n")}

Ask the school for:
- ${route.requests.join(";\n- ")};
- the school case or ticket number;
- every deadline and remaining action; and
- secure instructions for any documents.

Prepare these records for the school's secure process:
- ${route.documents.join(";\n- ")}.

EFF funding boundary:
The National Student Help Desk provides navigation, advocacy preparation, and referrals. ${record.essentials_requested?`Your ${record.essentials_term??""} Student Essentials request is a separate small-request review with a maximum of $100; it is not approved or guaranteed.`:"No Student Essentials request was included in this case."} If you need a larger amount or tuition/balance assistance, review and apply for an eligible EFF scholarship at https://portal.estherfundsfoundation.org/programs. Scholarship eligibility, required documents, available funds, review, and final approval apply; submission does not guarantee an award.

Use your official school account when possible. Never email EFF passwords, Social Security numbers, verification codes, tax returns, bank details, or unredacted IDs.`;
}

export function buildSchoolOutreach(record:{student_name:string;case_code:string;school_name:string;issue_type:string;situation_summary:string;steps_taken:string;school_deadline:string|null;documents_available:string[]}){
  const route=helpRouting[record.issue_type]??helpRouting.Other;
  const deadline=record.school_deadline?`\nThe student reported a school deadline of ${record.school_deadline}.`:"";
  const docs=record.documents_available?.length?record.documents_available.join(", "):"The student has not yet identified available records.";
  return {
    department:route.department,
    subject:`Student support request — ${record.student_name} — EFF case ${record.case_code}`,
    body:`Hello ${route.department} Team,

Esther Funds Foundation is contacting you with the student’s express authorization and has copied the student on this message. We are helping ${record.student_name} organize a request that may affect continued enrollment at ${record.school_name}.

Student-reported concern:
${record.situation_summary}

Steps already taken:
${record.steps_taken}${deadline}

Records the student reports having:
${docs}

Please reply directly to the student and copy EFF with:
- ${route.requests.join(";\n- ")};
- the school case or ticket number;
- any remaining action or secure document-submission instructions; and
- the date the student should expect a written response.

EFF case: ${record.case_code}

Please do not send protected education, medical, financial, or identity records to EFF by ordinary email. The school may require its own FERPA authorization or identity-verification process before discussing protected information.

Thank you,
Esther Funds Foundation
Every Future Fulfilled`
  };
}
