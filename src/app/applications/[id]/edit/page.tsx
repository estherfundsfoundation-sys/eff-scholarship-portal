import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {ApplicationForm} from "./application-form";

type Answer=(key:string)=>string;
type DocumentRecord={kind:string;filename:string};
type UploadField={kind:string;label:string;required?:boolean};

const Field=({label,name,type="text",required=true,defaultValue}:{label:string;name:string;type?:string;required?:boolean;defaultValue?:string})=>
  <label>{label}<input name={name} type={type} required={required} defaultValue={defaultValue}/></label>;

const YesNo=({label,name,defaultValue}:{label:string;name:string;defaultValue?:string})=>
  <label>{label}<select name={name} required defaultValue={defaultValue??""}><option value="" disabled>Select one</option><option value="yes">Yes</option><option value="no">No</option></select></label>;

function UploadFields({fields,documents}:{fields:UploadField[];documents:DocumentRecord[]}){
  return <div className="upload-grid">{fields.map(({kind,label,required=true})=>{
    const attached=documents.find((item)=>item.kind===kind);
    return <label className="upload" key={kind}><strong>{label}</strong>{attached&&<span className="uploaded">Attached: {attached.filename}</span>}<input type="file" name={kind} required={required&&!attached} accept=".pdf,.jpg,.jpeg,.png,.webp"/><small>PDF or image, up to 10 MB</small></label>;
  })}</div>;
}

function Certification({policyBody,answer}:{policyBody:string;answer:Answer}){
  return <div className="agreement"><h3>Applicant certification</h3><p>{policyBody}</p><label className="check"><input type="checkbox" name="certification" value="yes" required defaultChecked={answer("certification")==="yes"}/><span>I have read and accept this certification and authorize electronic records.</span></label><Field name="signature" label="Type your full legal name as your electronic signature" defaultValue={answer("signature")}/></div>;
}

function ServiceApplication({kind,answer,documents,policyBody}:{kind:"ambassador"|"executive";answer:Answer;documents:DocumentRecord[];policyBody:string}){
  const executive=kind==="executive";
  const uploads:UploadField[]=executive?[
    {kind:"enrollment_proof",label:"Proof of full-time enrollment"},
    {kind:"fafsa_summary",label:"Redacted FAFSA Submission Summary"},
    {kind:"service_hours_proof",label:"Verified service-hours record"},
    {kind:"recommendation_letter",label:"Recommendation letter"},
  ]:[
    {kind:"enrollment_proof",label:"Proof of full-time enrollment"},
    {kind:"fafsa_summary",label:"Redacted FAFSA Submission Summary"},
    {kind:"service_hours_proof",label:"Verified service-hours record"},
    {kind:"ambassador_work_proof",label:"Proof of EFF ambassador work"},
  ];
  return <>
    <section className="form-section"><span className="section-number">01</span><h3>Eligibility screening</h3><p className="muted">Answer every item accurately. You must meet every published requirement to submit.</p><div className="form-grid"><YesNo name="full_time_student" label="Are you currently enrolled as a full-time college student?" defaultValue={answer("full_time_student")}/><YesNo name="active_eff_member" label="Are you an active Esther Funds Foundation member?" defaultValue={answer("active_eff_member")}/><YesNo name="good_standing" label="Are you in good standing with your school and EFF?" defaultValue={answer("good_standing")}/><YesNo name="fafsa_completed" label="Have you completed the FAFSA for the current aid year?" defaultValue={answer("fafsa_completed")}/></div></section>
    <section className="form-section"><span className="section-number">02</span><h3>About you</h3><div className="form-grid"><Field name="legal_name" label="Full legal name" defaultValue={answer("legal_name")}/><Field name="preferred_name" label="Preferred name" required={false} defaultValue={answer("preferred_name")}/><Field name="personal_email" label="Personal email" type="email" defaultValue={answer("personal_email")}/><Field name="school_email" label="School email" type="email" required={false} defaultValue={answer("school_email")}/><Field name="phone" label="Phone number" type="tel" defaultValue={answer("phone")}/><Field name="institution" label="College or university" defaultValue={answer("institution")}/><Field name="student_id" label="Student ID number" defaultValue={answer("student_id")}/><Field name="major" label="Major or area of study" required={false} defaultValue={answer("major")}/><Field name="expected_graduation" label="Expected graduation" type="month" defaultValue={answer("expected_graduation")}/></div></section>
    {executive?<section className="form-section"><span className="section-number">03</span><h3>Executive-board service record</h3><div className="form-grid"><Field name="board_role" label="Executive-board role" defaultValue={answer("board_role")}/><Field name="chapter_name" label="EFF chapter" defaultValue={answer("chapter_name")}/><Field name="service_start_date" label="Service start date" type="date" defaultValue={answer("service_start_date")}/><Field name="service_hours_total" label="Total verified service hours" type="number" defaultValue={answer("service_hours_total")}/><Field name="recommender_name" label="Recommender name" defaultValue={answer("recommender_name")}/><Field name="recommender_role" label="Recommender role" defaultValue={answer("recommender_role")}/><Field name="recommender_email" label="Recommender email" type="email" defaultValue={answer("recommender_email")}/></div><label>Describe your meeting attendance and participation<textarea name="meeting_attendance" required minLength={50} defaultValue={answer("meeting_attendance")}/></label><label>Describe the assignments and responsibilities you completed<textarea name="task_completion" required minLength={80} defaultValue={answer("task_completion")}/></label></section>:<section className="form-section"><span className="section-number">03</span><h3>Ambassador service record</h3><div className="form-grid"><Field name="ambassador_service_start_date" label="Ambassador service start date" type="date" defaultValue={answer("ambassador_service_start_date")}/><Field name="service_hours_total" label="Total verified service hours" type="number" defaultValue={answer("service_hours_total")}/></div><label>Summarize your EFF ambassador work, activities, and responsibilities<textarea name="ambassador_work_summary" required minLength={100} defaultValue={answer("ambassador_work_summary")}/></label></section>}
    <section className="form-section"><span className="section-number">04</span><h3>{executive?"Leadership essay":"Ambassador impact essay"}</h3><p className="muted">Write 400–600 words and answer the official prompt shown on the program page.</p><textarea name={executive?"leadership_essay":"ambassador_essay"} required minLength={1800} defaultValue={answer(executive?"leadership_essay":"ambassador_essay")}/></section>
    <section className="form-section"><span className="section-number">05</span><h3>Documents and certification</h3><UploadFields fields={uploads} documents={documents}/><p className="muted"><strong>FAFSA privacy:</strong> Upload only the requested redacted summary. Remove Social Security numbers, FSA IDs, passwords, tax-return details, bank information, and full account numbers.</p><Certification policyBody={policyBody} answer={answer}/></section>
  </>;
}

function GeneralApplication({answer,documents,policyBody}:{answer:Answer;documents:DocumentRecord[];policyBody:string}){
  const uploads:UploadField[]=[
    {kind:"headshot",label:"Headshot photo"},
    {kind:"enrollment_proof",label:"Proof of enrollment or acceptance"},
    {kind:"financial_need_proof",label:"Proof of financial need"},
    {kind:"supporting_document",label:"Optional supporting document",required:false},
  ];
  return <>
    <section className="form-section"><span className="section-number">01</span><h3>Eligibility screening</h3><p className="muted">You must answer yes to every requirement to submit.</p><div className="form-grid"><YesNo name="residency_status" label="Are you a U.S. citizen, U.S. national, or permanent resident?" defaultValue={answer("residency_status")}/><YesNo name="fafsa_completed" label="Have you completed the FAFSA?" defaultValue={answer("fafsa_completed")}/><YesNo name="unmet_need_verified" label="Can your school verify your unmet financial need?" defaultValue={answer("unmet_need_verified")}/><YesNo name="undergraduate_no_bachelors" label="Are you an undergraduate who has not earned a bachelor’s degree?" defaultValue={answer("undergraduate_no_bachelors")}/><YesNo name="accredited_us_institution" label="Are you enrolled at an accredited U.S. college or university?" defaultValue={answer("accredited_us_institution")}/></div></section>
    <section className="form-section"><span className="section-number">02</span><h3>About you</h3><div className="form-grid"><Field name="legal_name" label="Full legal name" defaultValue={answer("legal_name")}/><Field name="preferred_name" label="Preferred name" required={false} defaultValue={answer("preferred_name")}/><Field name="date_of_birth" label="Date of birth" type="date" defaultValue={answer("date_of_birth")}/><Field name="personal_email" label="Personal email" type="email" defaultValue={answer("personal_email")}/><Field name="school_email" label="School email" type="email" required={false} defaultValue={answer("school_email")}/><Field name="phone" label="Phone number" type="tel" defaultValue={answer("phone")}/><Field name="address" label="Mailing address" defaultValue={answer("address")}/><Field name="gender" label="Gender (optional)" required={false} defaultValue={answer("gender")}/><Field name="race_ethnicity" label="Race or ethnicity (optional)" required={false} defaultValue={answer("race_ethnicity")}/><Field name="marital_status" label="Marital status (optional)" required={false} defaultValue={answer("marital_status")}/></div></section>
    <section className="form-section"><span className="section-number">03</span><h3>Education</h3><div className="form-grid"><Field name="institution" label="College or university" defaultValue={answer("institution")}/><Field name="student_id" label="Student ID number" defaultValue={answer("student_id")}/><Field name="class_standing" label="Class standing" defaultValue={answer("class_standing")}/><Field name="major" label="Major or area of study" defaultValue={answer("major")}/><Field name="expected_graduation" label="Expected graduation" type="month" defaultValue={answer("expected_graduation")}/><Field name="enrollment_status" label="Enrollment status" defaultValue={answer("enrollment_status")}/><Field name="gpa" label="Cumulative GPA (optional; no minimum)" required={false} defaultValue={answer("gpa")}/></div></section>
    <section className="form-section"><span className="section-number">04</span><h3>Emergency contact</h3><div className="form-grid"><Field name="emergency_contact_name" label="Contact name" defaultValue={answer("emergency_contact_name")}/><Field name="emergency_contact_relationship" label="Relationship to you" defaultValue={answer("emergency_contact_relationship")}/><Field name="emergency_contact_phone" label="Contact phone" type="tel" defaultValue={answer("emergency_contact_phone")}/><Field name="emergency_contact_email" label="Contact email" type="email" defaultValue={answer("emergency_contact_email")}/></div></section>
    <section className="form-section"><span className="section-number">05</span><h3>Name your need</h3><div className="form-grid"><Field name="amount_requested" label="Total amount requested ($)" type="number" defaultValue={answer("amount_requested")}/><label>Primary need category<select name="need_category" required defaultValue={answer("need_category")}><option value="" disabled>Select one</option>{["Tuition or fees","Housing or utilities","Food","Transportation","Books or supplies","Technology","Childcare","Health or wellness","Other"].map((item)=><option key={item}>{item}</option>)}</select></label><Field name="other_need" label="Other need (if applicable)" required={false} defaultValue={answer("other_need")}/></div><label>Describe your financial need and how you determined this amount<textarea name="financial_need_description" required minLength={100} defaultValue={answer("financial_need_description")}/></label></section>
    <section className="form-section"><span className="section-number">06</span><h3>Your story</h3><label>Your story (200–300 words): Why are you fighting to stay in school, and what would this scholarship make possible for you?<textarea name="story" required minLength={300} defaultValue={answer("story")}/></label><label>Faith reflection: Share how your faith is carrying you through this season.<textarea name="faith_reflection" required minLength={80} defaultValue={answer("faith_reflection")}/></label></section>
    <section className="form-section"><span className="section-number">07</span><h3>Documents and certification</h3><UploadFields fields={uploads} documents={documents}/><Certification policyBody={policyBody} answer={answer}/></section>
  </>;
}

export default async function EditApplication({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string;error?:string}>}){
  const {id}=await params;
  const query=await searchParams;
  const supabase=await createClient();
  const {data:application}=await supabase.from("applications").select("id,status,application_answers(question_key,value),documents(kind,filename),program_cycles(name,closes_at,programs(name,slug),policy_versions(id,version,body,published_at))").eq("id",id).single();
  if(!application)notFound();
  if(application.status!=="draft"&&application.status!=="additional_information_needed")redirect(`/applications/${id}`);
  const answers=new Map(((application.application_answers as unknown as Array<{question_key:string;value:string}>)??[]).map((item)=>[item.question_key,typeof item.value==="string"?item.value:JSON.stringify(item.value)]));
  const answer=(key:string)=>answers.get(key)??"";
  const cycle=application.program_cycles as unknown as {closes_at:string|null;programs:{name:string;slug:string};policy_versions:Array<{id:string;body:string;published_at:string|null}>};
  const policy=cycle.policy_versions.find((item)=>item.published_at);
  if(!policy)throw new Error("The application agreement is unavailable.");
  const documents=(application.documents as unknown as DocumentRecord[])??[];
  const programSlug=cycle.programs.slug;
  const serviceKind=programSlug==="eff-ambassador-service-scholarship"?"ambassador":programSlug==="collegiate-executive-board-service-scholarship"?"executive":null;
  const deadline=cycle.closes_at?new Date(cycle.closes_at).toLocaleString("en-US",{month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"See the program page";
  return <main className="section"><div className="shell form-shell"><Link className="card-link" href="/dashboard">← Save and return to dashboard</Link><div className="form-heading"><div><div className="eyebrow">Official application</div><h2>{cycle.programs.name}</h2><p className="muted">Deadline: {deadline} · Your draft saves when you choose Save draft.</p></div><div className="progress-ring" aria-label="Application in progress">{serviceKind?"5":"7"} sections</div></div>{query.saved&&<div className="notice" role="status"><strong>Draft saved.</strong> You can safely leave and return later.</div>}{query.error&&<div className="notice" role="alert"><strong>We could not complete that step.</strong><br/>{query.error}</div>}<ApplicationForm applicationId={id}><input type="hidden" name="policy_version_id" value={policy.id}/>{serviceKind?<ServiceApplication kind={serviceKind} answer={answer} documents={documents} policyBody={policy.body}/>:<GeneralApplication answer={answer} documents={documents} policyBody={policy.body}/>}<div className="form-actions"><button className="button outline" name="intent" value="save" formNoValidate>Save draft</button><button className="button" name="intent" value="submit">Review and submit application</button></div></ApplicationForm></div></main>;
}
