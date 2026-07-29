import Link from "next/link";
import {AlertTriangle, CheckCircle2, ShieldCheck} from "lucide-react";
import {getHelpDeskUser} from "@/lib/help-desk/auth";
import {helpDeskTrainingModules, helpDeskTrainingQuestions} from "@/lib/help-desk/training";
import {submitHelpDeskTraining} from "../actions";
import {redirect} from "next/navigation";

export default async function HelpDeskTraining({searchParams}:{searchParams:Promise<{result?:string;score?:string}>}) {
  const query = await searchParams;
  const {user, profile} = await getHelpDeskUser();
  if (!user) redirect("/sign-in?next=/help-desk/volunteer/training");
  if (!profile) redirect("/help-desk/volunteer");
  if (profile.status === "revoked") redirect("/help-desk/volunteer?access=revoked");
  return <main className="help-desk-training-page">
    <section className="help-desk-training-hero"><div className="shell"><Link className="back-link" href="/help-desk/volunteer">← Volunteer onboarding</Link><div className="eyebrow">EFF National Help Desk certification</div><h1>Know the resource. Protect the student. Build the relationship.</h1><p>Read every module before the final scenario assessment. The volunteer console unlocks only at 100%.</p></div></section>
    <section className="section white"><div className="shell help-desk-training-shell">
      {profile.training_score===100&&<div className="notice success-text"><CheckCircle2/>You are already certified. <Link href="/help-desk/volunteer/desk">Open the volunteer desk.</Link></div>}
      {query.result==="retry"&&<div className="notice error-text"><AlertTriangle/>Your score was {query.score||0}%. Review the explanations and try again. Every question must be correct because the missed item may affect a student’s safety or privacy.</div>}
      <nav className="help-desk-module-nav" aria-label="Training modules">{helpDeskTrainingModules.map(module=><a key={module.id} href={`#${module.id}`}>{module.number} {module.title}</a>)}</nav>
      <div className="help-desk-modules">{helpDeskTrainingModules.map(module=><article className="help-desk-module" id={module.id} key={module.id}><header><span>{module.number}</span><div><h2>{module.title}</h2><p>{module.purpose}</p></div></header>{module.lessons.map(lesson=><section key={lesson.heading}><h3>{lesson.heading}</h3><p>{lesson.body}</p>{lesson.bullets&&<ul>{lesson.bullets.map(item=><li key={item}>{item}</li>)}</ul>}</section>)}<aside><strong>Practice scenario</strong><p>{module.practice.situation}</p><ol>{module.practice.response.map(item=><li key={item}>{item}</li>)}</ol></aside></article>)}</div>
      <form action={submitHelpDeskTraining} className="help-desk-assessment">
        <div className="eyebrow">Final assessment</div><h2>18 decisions. All 18 must be correct.</h2><p>Choose the safest, most accurate EFF response.</p>
        {helpDeskTrainingQuestions.map((question,index)=><fieldset key={question.id}><legend><span>{index+1}</span>{question.prompt}</legend>{question.options.map((option,optionIndex)=><label className="check" key={option}><input type="radio" name={`question_${question.id}`} value={optionIndex} required/><span>{option}</span></label>)}<details><summary>Study note</summary><p>{question.explanation}</p></details></fieldset>)}
        <label className="check help-desk-honor"><input type="checkbox" name="honor" required/><span>I completed this assessment myself and agree to use the EFF escalation, privacy, and safety protocols exactly as trained.</span></label>
        <button className="button"><ShieldCheck/> Submit assessment</button>
      </form>
    </div></section>
  </main>;
}
