"use client";

import {useEffect, useMemo, useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BookOpenCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LockKeyhole,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import type {CourseModule} from "@/lib/academy/financial-aid-peer-mentor";
import {
  FINANCIAL_AID_PEER_MENTOR_PASSING_SCORE,
  financialAidPeerMentorFinalQuestions,
  financialAidPeerMentorCourseSources,
} from "@/lib/academy/financial-aid-peer-mentor";
import {submitFinancialAidPeerMentorAssessment} from "./actions";

const STORAGE_KEY = "eff-financial-aid-peer-mentor-progress-v1";

export function CoursePlayer({
  modules,
  signedIn,
  alreadyCompleted,
  completedScore,
  failedScore,
}: {
  modules: CourseModule[];
  signedIn: boolean;
  alreadyCompleted: boolean;
  completedScore: number | null;
  failedScore: number | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checkMessage, setCheckMessage] = useState<{ok: boolean; text: string} | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as {completed?: string[]; activeIndex?: number};
      setCompleted((saved.completed ?? []).filter(id => modules.some(module => module.id === id)));
      setActiveIndex(Math.min(Math.max(saved.activeIndex ?? 0, 0), modules.length));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setLoaded(true);
  }, [modules]);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({completed, activeIndex}));
  }, [activeIndex, completed, loaded]);

  const allModulesComplete = completed.length === modules.length;
  const activeModule = activeIndex < modules.length ? modules[activeIndex] : null;
  const progress = Math.round((completed.length / modules.length) * 100);
  const selectedForModule = useMemo(
    () => activeModule?.checks.filter(check => answers[check.id] !== undefined).length ?? 0,
    [activeModule, answers],
  );

  function gradeCheckpoint() {
    if (!activeModule) return;
    if (selectedForModule !== activeModule.checks.length) {
      setCheckMessage({ok: false, text: "Choose an answer for every checkpoint question first."});
      return;
    }
    const correct = activeModule.checks.every(check => answers[check.id] === check.correctIndex);
    if (!correct) {
      setCheckMessage({ok: false, text: "Not quite yet. Review the explanations, adjust your answers, and try again."});
      return;
    }
    setCompleted(current => current.includes(activeModule.id) ? current : [...current, activeModule.id]);
    setCheckMessage({ok: true, text: "Checkpoint passed. You are ready for the next module."});
  }

  function goTo(index: number) {
    setActiveIndex(Math.min(Math.max(index, 0), modules.length));
    setCheckMessage(null);
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  function resetProgress() {
    if (!window.confirm("Reset all module progress on this device? Your issued certificate will not be removed.")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setCompleted([]);
    setAnswers({});
    setActiveIndex(0);
    setCheckMessage(null);
  }

  return (
    <>
      <section className="academy-scope-strip" aria-label="Important course boundary">
        <div className="shell">
          <ShieldAlert aria-hidden="true"/>
          <p><strong>This is peer-navigation training, not federal certification or professional financial-aid authorization.</strong> EFF peer mentors do not access accounts, collect sensitive documents, determine eligibility, or replace a school financial-aid administrator.</p>
        </div>
      </section>

      <section className="section">
        <div className="shell academy-course-layout">
          <aside className="academy-module-nav" aria-label="Course modules">
            <div className="academy-progress-label"><strong>{progress}% complete</strong><span>{completed.length} of {modules.length} modules</span></div>
            <div className="academy-progress-track"><span style={{width: `${progress}%`}}/></div>
            <ol>
              {modules.map((module, index) => (
                <li key={module.id}>
                  <button
                    type="button"
                    className={activeIndex === index ? "active" : ""}
                    onClick={() => goTo(index)}
                    aria-current={activeIndex === index ? "step" : undefined}
                  >
                    <span>{completed.includes(module.id) ? <Check size={16}/> : module.number}</span>
                    <span><strong>{module.title}</strong><small>{module.time}</small></span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className={activeIndex === modules.length ? "active" : ""}
                  onClick={() => goTo(modules.length)}
                >
                  <span>{alreadyCompleted ? <Check size={16}/> : <Award size={16}/>}</span>
                  <span><strong>Final assessment</strong><small>10 scenarios · 80% to pass</small></span>
                </button>
              </li>
            </ol>
            <button type="button" className="academy-reset" onClick={resetProgress}><RotateCcw size={15}/> Reset device progress</button>
          </aside>

          <div className="academy-lesson">
            {activeModule ? (
              <>
                <header className="academy-lesson-head">
                  <div className="eyebrow">Module {activeModule.number} · {activeModule.time}</div>
                  <h2>{activeModule.title}</h2>
                  <p>{activeModule.purpose}</p>
                </header>

                {activeModule.visual && (
                  <figure className="academy-source-visual">
                    <Image src={activeModule.visual.src} alt={activeModule.visual.alt} width={1234} height={720} sizes="(max-width: 900px) 100vw, 820px"/>
                    <figcaption>{activeModule.visual.caption} <a href="https://fsatraining.ed.gov/course/view.php?id=598" target="_blank" rel="noopener noreferrer">View official training <ExternalLink size={12}/></a></figcaption>
                  </figure>
                )}

                <div className="academy-boundary-card">
                  <LockKeyhole aria-hidden="true"/>
                  <div><strong>The non-negotiable privacy rule</strong><p>Never request or receive passwords, Social Security numbers, verification codes, tax returns, bank details, or full identity documents. Never sign or submit a form for another person.</p></div>
                </div>

                {activeModule.sections.map(section => (
                  <section className="academy-lesson-section" key={section.heading}>
                    <h3>{section.heading}</h3>
                    <p>{section.body}</p>
                    {section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
                  </section>
                ))}

                <section className="academy-practice">
                  <div className="eyebrow">Real-life practice</div>
                  <h3>{activeModule.practice.title}</h3>
                  <p className="academy-situation">{activeModule.practice.situation}</p>
                  <strong>A safe mentor response:</strong>
                  <ol>{activeModule.practice.response.map(item => <li key={item}>{item}</li>)}</ol>
                </section>

                <section className="academy-sources">
                  <h3>Official desk references</h3>
                  <p>Open these sources when you mentor. Do not rely on memory when a rule or date may have changed.</p>
                  <div>{activeModule.sources.map(source => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={14}/></a>)}</div>
                </section>

                <section className="academy-checkpoint">
                  <div className="eyebrow">Module checkpoint</div>
                  <h3>Show that you can apply it</h3>
                  {activeModule.checks.map((check, questionIndex) => (
                    <fieldset key={check.id}>
                      <legend>{questionIndex + 1}. {check.prompt}</legend>
                      {check.options.map((option, optionIndex) => (
                        <label key={option}>
                          <input
                            type="radio"
                            name={check.id}
                            checked={answers[check.id] === optionIndex}
                            onChange={() => {
                              setAnswers(current => ({...current, [check.id]: optionIndex}));
                              setCheckMessage(null);
                            }}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                      {checkMessage && answers[check.id] !== undefined && answers[check.id] !== check.correctIndex && (
                        <p className="academy-answer-help">{check.explanation}</p>
                      )}
                    </fieldset>
                  ))}
                  {checkMessage && <p className={checkMessage.ok ? "academy-pass-message" : "academy-retry-message"} role="status">{checkMessage.text}</p>}
                  <button className="button" type="button" onClick={gradeCheckpoint}><BookOpenCheck size={18}/> Check my answers</button>
                </section>

                <div className="academy-lesson-actions">
                  <button className="button outline" type="button" disabled={activeIndex === 0} onClick={() => goTo(activeIndex - 1)}><ChevronLeft size={17}/> Previous</button>
                  <button className="button" type="button" disabled={!completed.includes(activeModule.id)} onClick={() => goTo(activeIndex + 1)}>Next module <ChevronRight size={17}/></button>
                </div>
              </>
            ) : (
              <section className="academy-final">
                <div className="eyebrow">Final assessment</div>
                <h2>Ready to mentor responsibly?</h2>
                <p>This assessment focuses on real decisions, not memorizing vocabulary. You need {FINANCIAL_AID_PEER_MENTOR_PASSING_SCORE}% to earn the EFF Financial Aid Peer Mentor course-completion certificate.</p>

                {alreadyCompleted ? (
                  <div className="academy-complete-card">
                    <Award aria-hidden="true"/>
                    <div>
                      <h3>Course completed</h3>
                      <p>Your recorded passing score is {completedScore}%.</p>
                      <Link className="button" href="/academy/financial-aid-peer-mentor/complete">View and download certificate</Link>
                    </div>
                  </div>
                ) : !allModulesComplete ? (
                  <div className="academy-locked-final">
                    <LockKeyhole aria-hidden="true"/>
                    <div><strong>Complete all eight module checkpoints first.</strong><p>You have completed {completed.length} of {modules.length}. Use the module list to return to anything unfinished.</p></div>
                  </div>
                ) : (
                  <>
                    {failedScore !== null && <div className="academy-retry-message" role="alert"><strong>Your last score was {failedScore}%.</strong> Review the questions you were uncertain about and try again. A new attempt will not count against you.</div>}
                    {!signedIn && <div className="notice"><strong>You can learn without an account.</strong><br/>To submit the final assessment and place your name on a certificate, you will be asked to sign in or create a free EFF portal account.</div>}
                    <form className="academy-final-form" action={submitFinancialAidPeerMentorAssessment}>
                      {financialAidPeerMentorFinalQuestions.map((question, index) => (
                        <fieldset key={question.id}>
                          <legend>{index + 1}. {question.prompt}</legend>
                          {question.options.map((option, optionIndex) => (
                            <label key={option}>
                              <input required type="radio" name={`question_${question.id}`} value={optionIndex}/>
                              <span>{option}</span>
                            </label>
                          ))}
                        </fieldset>
                      ))}
                      <label className="academy-honor">
                        <input type="checkbox" name="honor" required/>
                        <span>I completed this assessment myself and understand that this EFF certificate recognizes course completion, not federal licensure or authority to act as a financial-aid administrator.</span>
                      </label>
                      <button className="button" type="submit"><Award size={18}/> Submit final assessment</button>
                    </form>
                  </>
                )}
              </section>
            )}
          </div>
        </div>
      </section>

      <section className="section white academy-method">
        <div className="shell">
          <div className="section-head"><div><div className="eyebrow">Course integrity</div><h2>How this course was built</h2></div><p>Student-friendly explanations are grounded in official U.S. Department of Education and Federal Student Aid resources.</p></div>
          <div className="academy-method-grid">
            <article><strong>Official-source first</strong><p>Rules and process explanations point learners back to StudentAid.gov and the FSA Training Center.</p></article>
            <article><strong>Student-safe scope</strong><p>Institution-only work—eligibility decisions, professional judgment, verification review, and award administration—is taught as a referral boundary.</p></article>
            <article><strong>Reviewed July 25, 2026</strong><p>Financial-aid rules and dates change. EFF should review this course before each FAFSA cycle and whenever Federal Student Aid publishes a major update.</p></article>
          </div>
          <div className="academy-source-list">{financialAidPeerMentorCourseSources.map(source => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={14}/></a>)}</div>
        </div>
      </section>
    </>
  );
}
