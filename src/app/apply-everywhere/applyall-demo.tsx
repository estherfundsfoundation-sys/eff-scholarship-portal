"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import {ArrowRight,Check,ChevronRight,FileCheck2,GraduationCap,LockKeyhole,MapPinned,ShieldCheck,Sparkles} from "lucide-react";
import {APPLYALL_BRAND} from "@/lib/applyall/config";
import {MOCK_INSTITUTIONS} from "@/lib/applyall/mock-routes";
import type {PassportAnswers} from "@/lib/applyall/types";

type Step="WELCOME"|"SCHOOLS"|"INTERVIEW"|"BUILD"|"ACTIONS"|"REVIEW"|"RECEIPTS";
const steps:Step[]=["WELCOME","SCHOOLS","INTERVIEW","BUILD","ACTIONS","REVIEW","RECEIPTS"];
const labels:Record<Step,string>={WELCOME:"Start",SCHOOLS:"Schools",INTERVIEW:"Interview",BUILD:"Build",ACTIONS:"Actions",REVIEW:"Review",RECEIPTS:"Receipts"};

export default function ApplyAllDemo(){
  const [step,setStep]=useState<Step>("WELCOME");
  const [selected,setSelected]=useState<string[]>([]);
  const [answers,setAnswers]=useState<PassportAnswers>({});
  const [actions,setActions]=useState({fee:false,verify:false});
  const [authorized,setAuthorized]=useState(false);
  const schools=MOCK_INSTITUTIONS.filter((school)=>selected.includes(school.id));
  const questions=useMemo(()=>Array.from(new Map(schools.flatMap((school)=>school.questions).map((q)=>[q.canonicalKey,q])).values()),[schools]);
  const totalFields=schools.reduce((sum,school)=>sum+school.questions.length,0);
  const missing=questions.filter((q)=>q.required&&(q.kind==="checkbox"?answers[q.canonicalKey]!==true:String(answers[q.canonicalKey]??"").trim()===""));
  const allActions=(!schools.some((s)=>s.checkpoint==="FEE")||actions.fee)&&(!schools.some((s)=>s.checkpoint==="EMAIL_VERIFICATION")||actions.verify);
  const ready=missing.length===0&&allActions;
  const next=(target:Step)=>{setStep(target);window.scrollTo({top:0,behavior:"smooth"});};

  return <main className="applyall">
    <section className="applyall-top"><div className="shell">
      <div className="applyall-brand"><span><Sparkles/> {APPLYALL_BRAND.publicName}</span><strong>{APPLYALL_BRAND.slogan}</strong></div>
      <div className="applyall-progress" aria-label="Application progress">{steps.map((item,index)=><div key={item} className={steps.indexOf(step)>=index?"active":""}><span>{steps.indexOf(step)>index?<Check/>:index+1}</span><small>{labels[item]}</small></div>)}</div>
      <p className="applyall-demo-warning"><ShieldCheck/> Safe demonstration: these are fictional schools. No real university application or payment will be submitted.</p>
    </div></section>

    {step==="WELCOME"&&<section className="applyall-hero"><div className="shell applyall-hero-grid"><div>
      <span className="applyall-kicker">One student-owned education journey</span><h1>Tell your story once.<br/><em>Go anywhere.</em></h1>
      <p>Build your Future Passport, prepare applications for supported colleges, complete only the actions that require you, and review everything before submission.</p>
      <button className="button" onClick={()=>next("SCHOOLS")}>Start my demonstration <ArrowRight/></button>
      <Link className="button outline" href="/apply-everywhere/schools">Explore Southern colleges</Link>
      <p className="applyall-fine">EFF never invents answers, bypasses security, or submits to a school you did not select.</p>
    </div><div className="applyall-promise"><div><MapPinned/><strong>Select your schools</strong><span>Compare supported routes honestly.</span></div><div><FileCheck2/><strong>Answer once</strong><span>Repeated questions become one interview.</span></div><div><LockKeyhole/><strong>You stay in control</strong><span>Review and authorize the exact batch.</span></div></div></div></section>}

    {step==="SCHOOLS"&&<Workspace title="Select your demonstration schools" intro="Start with Florida, Georgia, and Alabama. Every institution below is fictional and exists only to prove the complete workflow.">
      <div className="applyall-school-grid">{MOCK_INSTITUTIONS.map((school)=><label className={`applyall-school ${selected.includes(school.id)?"selected":""}`} key={school.id}><input type="checkbox" checked={selected.includes(school.id)} onChange={(event)=>setSelected(event.target.checked?[...selected,school.id]:selected.filter((id)=>id!==school.id))}/><span className="applyall-state">{school.state}</span><strong>{school.name}</strong><small>{school.type}{school.hbcu?" · HBCU":""}</small><span className="applyall-ready"><Check/> ApplyAll ready</span><span>{school.fee?`$${school.fee} demonstration fee checkpoint`:"No demonstration fee"}</span></label>)}</div>
      {selected.length>0&&<div className="applyall-compression"><strong>{totalFields} application fields</strong><ArrowRight/><strong>{questions.length} unique questions</strong><span>EFF removes {totalFields-questions.length} repeated fields from your interview.</span></div>}
      <FooterActions back={()=>next("WELCOME")} next={()=>next("INTERVIEW")} disabled={!selected.length} nextLabel="Start my EFF interview"/>
    </Workspace>}

    {step==="INTERVIEW"&&<Workspace title="Your EFF Interview" intro="Complete reusable information once. School-specific questions stay clearly labeled. Your work is saved in this browser during the demonstration.">
      <div className="applyall-count"><strong>{questions.length-missing.length} of {questions.length}</strong><span>required answers completed</span><progress value={questions.length-missing.length} max={questions.length}/></div>
      <div className="applyall-form">{questions.map((question)=><label key={question.canonicalKey}><span>{question.label} {question.schoolSpecific&&<b>School-specific</b>}</span><small>{question.help}</small>{question.kind==="select"?<select value={String(answers[question.canonicalKey]??"")} onChange={(e)=>setAnswers({...answers,[question.canonicalKey]:e.target.value})}><option value="">Select one</option>{question.options?.map((option)=><option key={option}>{option}</option>)}</select>:question.kind==="textarea"?<><textarea value={String(answers[question.canonicalKey]??"")} onChange={(e)=>setAnswers({...answers,[question.canonicalKey]:e.target.value})}/><small>{String(answers[question.canonicalKey]??"").trim().split(/\s+/).filter(Boolean).length} / {question.wordLimit} words</small></>:question.kind==="checkbox"?<span className="applyall-check"><input type="checkbox" checked={answers[question.canonicalKey]===true} onChange={(e)=>setAnswers({...answers,[question.canonicalKey]:e.target.checked})}/> I personally reviewed this statement</span>:<input type={question.kind} step={question.kind==="number"?"0.01":undefined} value={String(answers[question.canonicalKey]??"")} onChange={(e)=>setAnswers({...answers,[question.canonicalKey]:e.target.value})}/>}</label>)}</div>
      {missing.length>0&&<p className="applyall-alert">Complete {missing.length} remaining required {missing.length===1?"answer":"answers"} before building.</p>}
      <FooterActions back={()=>next("SCHOOLS")} next={()=>next("BUILD")} disabled={missing.length>0} nextLabel="Build my applications"/>
    </Workspace>}

    {step==="BUILD"&&<Workspace title="Applications built safely" intro="The compiler mapped your approved Future Passport answers to each fictional route and validated its current version.">
      <div className="applyall-run-list">{schools.map((school)=><div key={school.id}><span className="applyall-icon-success"><Check/></span><div><strong>{school.name}</strong><small>Route {school.routeVersion} · {school.questions.length} fields mapped · no guessing</small></div><b>Built</b></div>)}</div>
      <div className="applyall-security"><LockKeyhole/><div><strong>Your information remains under your control.</strong><p>This demonstration does not store university passwords, security codes, card details, or real student records.</p></div></div>
      <FooterActions back={()=>next("INTERVIEW")} next={()=>next("ACTIONS")} nextLabel="Complete student actions"/>
    </Workspace>}

    {step==="ACTIONS"&&<Workspace title="Student Action Center" intro="These are the few checkpoints only you can complete. EFF will never bypass them.">
      <div className="applyall-tasks">{schools.some((s)=>s.checkpoint==="FEE")&&<Task checked={actions.fee} setChecked={(value)=>setActions({...actions,fee:value})} school="Peach State University — Demonstration" title="Choose the fee-waiver option" reason="Simulate an approved fee decision. No payment will be collected."/>}{schools.some((s)=>s.checkpoint==="EMAIL_VERIFICATION")&&<Task checked={actions.verify} setChecked={(value)=>setActions({...actions,verify:value})} school="Heartland HBCU — Demonstration" title="Complete email verification" reason="Simulate entering a one-time code yourself. EFF never stores the code."/>}{allActions&&<div className="applyall-complete"><Check/> All student checkpoints are complete.</div>}</div>
      <FooterActions back={()=>next("BUILD")} next={()=>next("REVIEW")} disabled={!allActions} nextLabel="Review my application batch"/>
    </Workspace>}

    {step==="REVIEW"&&<Workspace title="Review and authorize your exact batch" intro="Nothing is submitted until you inspect every school and provide specific authorization.">
      <div className="applyall-summary"><div><strong>{schools.length}</strong><span>applications ready</span></div><div><strong>${schools.reduce((sum,s)=>sum+s.fee,0)}</strong><span>fees in demonstration</span></div><div><strong>{totalFields}</strong><span>validated fields</span></div></div>
      <div className="applyall-review-list">{schools.map((school)=><details key={school.id}><summary><span>{school.name}<small>{String(answers["education_goals.primary_major"])} · first-year demonstration</small></span><ChevronRight/></summary><dl><div><dt>Route</dt><dd>{school.routeKey} v{school.routeVersion}</dd></div><div><dt>Fee checkpoint</dt><dd>{school.fee?`$${school.fee} — simulated approval complete`:"None"}</dd></div><div><dt>Application fields</dt><dd>{school.questions.length} validated</dd></div><div><dt>Submission</dt><dd>Mock execution only</dd></div></dl></details>)}</div>
      <label className="applyall-authorize"><input type="checkbox" checked={authorized} onChange={(e)=>setAuthorized(e.target.checked)}/><span><strong>I reviewed and authorize this exact demonstration batch.</strong><small>I understand these fictional applications do not reach real universities.</small></span></label>
      <FooterActions back={()=>next("ACTIONS")} next={()=>next("RECEIPTS")} disabled={!authorized||!ready} nextLabel="Submit all demonstration applications"/>
    </Workspace>}

    {step==="RECEIPTS"&&<Workspace title="Three submissions. One clear next step." intro="The mock routes returned verified confirmation numbers. In production, EFF will never mark an application submitted without an official receipt.">
      <div className="applyall-receipts">{schools.map((school,index)=><article key={school.id}><FileCheck2/><span>Submitted · demonstration</span><h3>{school.name}</h3><dl><div><dt>Confirmation</dt><dd>EFF-DEMO-{school.state}-{String(index+1).padStart(4,"0")}</dd></div><div><dt>Route version</dt><dd>{school.routeVersion}</dd></div><div><dt>Snapshot</dt><dd>Locked after authorization</dd></div></dl></article>)}</div>
      <div className="applyall-next"><GraduationCap/><div><span>{APPLYALL_BRAND.nextMoves}</span><h2>Your journey continues.</h2><ol><li>Begin FAFSA readiness</li><li>Review scholarship matches</li><li>Track admissions portals</li></ol></div></div>
      <button className="button outline" onClick={()=>{setStep("WELCOME");setSelected([]);setAnswers({});setActions({fee:false,verify:false});setAuthorized(false)}}>Restart demonstration</button>
    </Workspace>}
  </main>;
}

function Workspace({title,intro,children}:{title:string;intro:string;children:React.ReactNode}){return <section className="applyall-workspace"><div className="shell"><span className="applyall-kicker">EFF ApplyAll demonstration</span><h1>{title}</h1><p className="applyall-lead">{intro}</p>{children}</div></section>}
function FooterActions({back,next,disabled=false,nextLabel}:{back:()=>void;next:()=>void;disabled?:boolean;nextLabel:string}){return <div className="applyall-footer-actions"><button className="button outline" onClick={back}>Back</button><button className="button" disabled={disabled} onClick={next}>{nextLabel}<ArrowRight/></button></div>}
function Task({checked,setChecked,school,title,reason}:{checked:boolean;setChecked:(value:boolean)=>void;school:string;title:string;reason:string}){return <label className={checked?"complete":""}><input type="checkbox" checked={checked} onChange={(e)=>setChecked(e.target.checked)}/><span><small>{school}</small><strong>{title}</strong><p>{reason}</p></span><b>{checked?"Completed":"Required"}</b></label>}
