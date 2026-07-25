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
