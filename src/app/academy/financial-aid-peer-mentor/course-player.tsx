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
  Flame,
  Lightbulb,
  LockKeyhole,
  MessageCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import type {CourseModule} from "@/lib/academy/financial-aid-peer-mentor";
import {
  FINANCIAL_AID_PEER_MENTOR_PASSING_SCORE,
  financialAidPeerMentorFinalQuestions,
  financialAidPeerMentorCourseSources,
} from "@/lib/academy/financial-aid-peer-mentor";
import {submitFinancialAidPeerMentorAssessment} from "./actions";
import {
  FIRST_GEN_FAMILY_NAVIGATOR_PASSING_SCORE,
  firstGenFamilyNavigatorCourseSources,
  firstGenFamilyNavigatorFinalQuestions,
} from "@/lib/academy/first-gen-family-navigator";
import {submitFirstGenFamilyNavigatorAssessment} from "../first-gen-family-navigator/actions";

const achievements = [
  {at: 0, icon: "🌱", title: "New here", copy: "Start with one smart move."},
  {at: 2, icon: "🛡️", title: "Boundary Boss", copy: "Privacy and role boundaries locked in."},
  {at: 4, icon: "🧭", title: "FAFSA Navigator", copy: "You can guide the process without taking over."},
  {at: 6, icon: "🔎", title: "Aid Detective", copy: "You know how to spot the real next step."},
  {at: 8, icon: "🏆", title: "Mentor Mode", copy: "All modules complete. Final assessment unlocked."},
];

const familyAchievements = [
  {at: 0, icon: "💜", title: "Family first", copy: "Bring your strengths. Learn the map."},
  {at: 2, icon: "🗺️", title: "Campus Decoder", copy: "You know where to take the next question."},
  {at: 4, icon: "🔐", title: "Trust Keeper", copy: "Consent and student agency come first."},
  {at: 6, icon: "🧯", title: "Calm in Crisis", copy: "Safety, resources, and clear next steps."},
  {at: 8, icon: "🤝", title: "Family Navigator", copy: "Ready to guide another family responsibly."},
];

export function CoursePlayer({
  modules,
  signedIn,
  alreadyCompleted,
  completedScore,
  failedScore,
  courseKind = "financial-aid",
}: {
  modules: CourseModule[];
  signedIn: boolean;
  alreadyCompleted: boolean;
  completedScore: number | null;
  failedScore: number | null;
  courseKind?: "financial-aid" | "first-gen-family";
}) {
  const isFamilyCourse = courseKind === "first-gen-family";
  const storageKey = isFamilyCourse
    ? "eff-first-gen-family-navigator-progress-v1"
    : "eff-financial-aid-peer-mentor-progress-v1";
  const courseAchievements = isFamilyCourse ? familyAchievements : achievements;
  const finalQuestions = isFamilyCourse
    ? firstGenFamilyNavigatorFinalQuestions
    : financialAidPeerMentorFinalQuestions;
  const passingScore = isFamilyCourse
    ? FIRST_GEN_FAMILY_NAVIGATOR_PASSING_SCORE
    : FINANCIAL_AID_PEER_MENTOR_PASSING_SCORE;
  const courseSources = isFamilyCourse
    ? firstGenFamilyNavigatorCourseSources
    : financialAidPeerMentorCourseSources;
  const assessmentAction = isFamilyCourse
    ? submitFirstGenFamilyNavigatorAssessment
    : submitFinancialAidPeerMentorAssessment;
  const certificateHref = isFamilyCourse
    ? "/academy/first-gen-family-navigator/complete"
    : "/academy/financial-aid-peer-mentor/complete";
  const certificateTitle = isFamilyCourse
    ? "EFF First-Generation Family Navigator"
    : "EFF Financial Aid Peer Mentor";
  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quickAnswers, setQuickAnswers] = useState<Record<string, boolean>>({});
  const [practiceRevealed, setPracticeRevealed] = useState<Record<string, boolean>>({});
  const [confidence, setConfidence] = useState<Record<string, string>>({});
  const [checkMessage, setCheckMessage] = useState<{ok: boolean; text: string} | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as {completed?: string[]; activeIndex?: number};
      setCompleted((saved.completed ?? []).filter(id => modules.some(module => module.id === id)));
      setActiveIndex(Math.min(Math.max(saved.activeIndex ?? 0, 0), modules.length));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    setLoaded(true);
  }, [modules, storageKey]);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify({completed, activeIndex}));
  }, [activeIndex, completed, loaded, storageKey]);

  const allModulesComplete = completed.length === modules.length;
  const activeModule = activeIndex < modules.length ? modules[activeIndex] : null;
  const progress = Math.round((completed.length / modules.length) * 100);
  const xp = completed.length * 125;
  const currentAchievement = [...courseAchievements].reverse().find(item => completed.length >= item.at) ?? courseAchievements[0];
  const selectedForModule = useMemo(
    () => activeModule?.checks.filter(check => answers[check.id] !== undefined).length ?? 0,
    [activeModule, answers],
  );
  const activeQuickAnswer = activeModule ? quickAnswers[activeModule.id] : undefined;
  const activeQuickCorrect = activeModule && activeQuickAnswer !== undefined
    ? activeQuickAnswer === activeModule.quickCheck.isFact
    : null;

  function gradeCheckpoint() {
    if (!activeModule) return;
    if (selectedForModule !== activeModule.checks.length) {
      setCheckMessage({ok: false, text: "Almost there—pick an answer for each question first."});
      return;
    }
    const correct = activeModule.checks.every(check => answers[check.id] === check.correctIndex);
    if (!correct) {
      setCheckMessage({ok: false, text: "Not locked in yet. Check the coaching notes, switch the answers that need work, and run it back."});
      return;
    }
    const isNewCompletion = !completed.includes(activeModule.id);
    setCompleted(current => current.includes(activeModule.id) ? current : [...current, activeModule.id]);
    setCheckMessage({
      ok: true,
      text: isNewCompletion ? "Locked in! +125 XP. Module complete. ✨" : "Still locked in—this module is complete. ✨",
    });
  }

  function goTo(index: number) {
    setActiveIndex(Math.min(Math.max(index, 0), modules.length));
    setCheckMessage(null);
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  function resetProgress() {
    if (!window.confirm("Reset all module progress on this device? Your issued certificate will not be removed.")) return;
    window.localStorage.removeItem(storageKey);
    setCompleted([]);
    setAnswers({});
    setQuickAnswers({});
    setPracticeRevealed({});
    setConfidence({});
    setActiveIndex(0);
    setCheckMessage(null);
  }

  return (
    <>
      <section className="academy-scope-strip" aria-label="Important course boundary">
        <div className="shell">
          <ShieldAlert aria-hidden="true"/>
          {isFamilyCourse ? (
            <p><strong>Real talk: this is family-navigation training—not professional licensure.</strong> You will learn how to listen, organize, advocate, and make warm referrals. You will never access another person’s account, collect private records, act as the student, make institutional decisions, or replace a financial-aid, legal, counseling, or college professional.</p>
          ) : (
            <p><strong>Real talk: this is peer-navigation training—not federal certification.</strong> You will learn how to guide, explain, organize, and refer. You will never access someone else’s account, collect private documents, determine eligibility, or replace a financial-aid professional.</p>
          )}
        </div>
      </section>

      <section className="academy-game-strip" aria-label="Course progress and achievements">
        <div className="shell">
          <div className="academy-xp"><Flame aria-hidden="true"/><span><strong>{xp} XP</strong> earned</span></div>
          <div className="academy-achievement"><span aria-hidden="true">{currentAchievement.icon}</span><div><strong>{currentAchievement.title}</strong><small>{currentAchievement.copy}</small></div></div>
          <div className="academy-streak"><Star aria-hidden="true"/><span>{completed.length}/{modules.length} power-ups</span></div>
        </div>
      </section>

      <section className="section academy-course-body">
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
                    <span>{completed.includes(module.id) ? <Check size={16}/> : module.emoji}</span>
                    <span><strong>{module.title}</strong><small>{module.time} · 125 XP</small></span>
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
              <article className="academy-module-card">
                <header className="academy-lesson-head">
                  <div className="academy-module-kicker"><span>{activeModule.emoji}</span><span>Level {activeModule.number}</span><span>{activeModule.time}</span><span>125 XP</span></div>
                  <h2>{activeModule.title}</h2>
                  <p>{activeModule.purpose}</p>
                  <div className="academy-tagline"><Sparkles size={17}/>{activeModule.tagline}</div>
                </header>

                {activeModule.visual && (
                  <figure className="academy-source-visual">
                    <Image src={activeModule.visual.src} alt={activeModule.visual.alt} width={1234} height={720} sizes="(max-width: 900px) 100vw, 820px"/>
                    <figcaption>{activeModule.visual.caption} <a href="https://fsatraining.ed.gov/course/view.php?id=598" target="_blank" rel="noopener noreferrer">See the official training <ExternalLink size={12}/></a></figcaption>
                  </figure>
                )}

                <section className="academy-vibe-check">
                  <div className="academy-interaction-label"><Lightbulb size={17}/> MYTH OR FACT?</div>
                  <h3>{activeModule.quickCheck.prompt}</h3>
                  <div className="academy-choice-row">
                    <button type="button" className={activeQuickAnswer === true ? "selected" : ""} aria-pressed={activeQuickAnswer === true} onClick={() => setQuickAnswers(current => ({...current, [activeModule.id]: true}))}>FACT ✅</button>
                    <button type="button" className={activeQuickAnswer === false ? "selected" : ""} aria-pressed={activeQuickAnswer === false} onClick={() => setQuickAnswers(current => ({...current, [activeModule.id]: false}))}>MYTH 🚫</button>
                  </div>
                  {activeQuickCorrect !== null && (
                    <p className={activeQuickCorrect ? "academy-quick-correct" : "academy-quick-retry"} role="status">
                      <strong>{activeQuickCorrect ? "You got it." : "Plot twist—try that one again."}</strong> {activeModule.quickCheck.explanation}
                    </p>
                  )}
                </section>

                <div className="academy-boundary-card">
                  <LockKeyhole aria-hidden="true"/>
                  {isFamilyCourse ? (
                    <div><strong>The non-negotiable partnership rule</strong><p>Ask for the student’s consent. Do not take over, impersonate the student, collect private records, or promise a result. Keep every account, decision, and personal story in the student’s hands.</p></div>
                  ) : (
                    <div><strong>The non-negotiable privacy rule</strong><p>No passwords. No Social Security numbers. No verification codes. No tax returns. No bank details. No identity documents. The student stays in control of every account, answer, signature, and submission.</p></div>
                  )}
                </div>

                <div className="academy-lesson-cards">
                  {activeModule.sections.map((section, sectionIndex) => (
                    <details className="academy-learning-drop" key={section.heading} open={sectionIndex === 0}>
                      <summary><span>{String(sectionIndex + 1).padStart(2, "0")}</span>{section.heading}<ChevronRight size={18}/></summary>
                      <div>
                        <p>{section.body}</p>
                        {section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
                      </div>
                    </details>
                  ))}
                </div>

                <section className="academy-script-card">
                  <MessageCircle aria-hidden="true"/>
                  <div><div className="academy-interaction-label">STEAL THIS LINE</div><p>“{activeModule.mentorScript}”</p><small>Use the idea, then make it sound like you.</small></div>
                </section>

                <section className="academy-practice">
                  <div className="academy-interaction-label">🎬 CHOOSE YOUR MOVE</div>
                  <h3>{activeModule.practice.title}</h3>
                  <p className="academy-situation">{activeModule.practice.situation}</p>
                  <button className="academy-reveal-button" type="button" onClick={() => setPracticeRevealed(current => ({...current, [activeModule.id]: !current[activeModule.id]}))}>
                    {practiceRevealed[activeModule.id] ? "Hide the mentor play" : "Tap to reveal the mentor play"}
                  </button>
                  {practiceRevealed[activeModule.id] && (
                    <div className="academy-revealed-play">
                      <strong>Here’s the move:</strong>
                      <ol>{activeModule.practice.response.map(item => <li key={item}>{item}</li>)}</ol>
                    </div>
                  )}
                </section>

                <section className="academy-confidence">
                  <div><strong>Quick pulse check</strong><p>How are you feeling about this level?</p></div>
                  <div className="academy-choice-row">
                    {["I’m locked in 🔒", "One more read 👀", "I need backup 🙋🏽"].map(option => (
                      <button
                        key={option}
                        type="button"
                        className={confidence[activeModule.id] === option ? "selected" : ""}
                        aria-pressed={confidence[activeModule.id] === option}
                        onClick={() => setConfidence(current => ({...current, [activeModule.id]: option}))}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {confidence[activeModule.id] && <small role="status">Saved for this session. No judgment—good mentors know when to double-check.</small>}
                </section>

                <section className="academy-sources">
                  <h3>{isFamilyCourse ? "Trusted sources, not guesswork" : "Receipts, not rumors"}</h3>
                  <p>Rules and dates can change. Use these official sources instead of guessing or trusting a random post.</p>
                  <div>{activeModule.sources.map(source => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={14}/></a>)}</div>
                </section>

                <section className="academy-checkpoint">
                  <div className="academy-interaction-label"><BookOpenCheck size={17}/> FINAL VIBE CHECK</div>
                  <h3>Can you make the safe call?</h3>
                  <p>Get both right to collect 125 XP and unlock the next level.</p>
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
                        <p className="academy-answer-help"><strong>Coaching note:</strong> {check.explanation}</p>
                      )}
                    </fieldset>
                  ))}
                  {checkMessage && (
                    <div className={checkMessage.ok ? "academy-celebration" : "academy-retry-message"} role="status">
                      {checkMessage.ok && <div className="academy-confetti" aria-hidden="true"><span>✨</span><span>💜</span><span>⭐</span><span>🎉</span></div>}
                      <strong>{checkMessage.text}</strong>
                    </div>
                  )}
                  <button className="button" type="button" onClick={gradeCheckpoint}><BookOpenCheck size={18}/> Check my answers</button>
                </section>

                <div className="academy-lesson-actions">
                  <button className="button outline" type="button" disabled={activeIndex === 0} onClick={() => goTo(activeIndex - 1)}><ChevronLeft size={17}/> Previous level</button>
                  <button className="button" type="button" disabled={!completed.includes(activeModule.id)} onClick={() => goTo(activeIndex + 1)}>Next level <ChevronRight size={17}/></button>
                </div>
              </article>
            ) : (
              <section className="academy-final">
                <div className="academy-final-icon"><Trophy aria-hidden="true"/></div>
                <div className="eyebrow">Final boss</div>
                <h2>{isFamilyCourse ? "Ready to guide a family responsibly?" : "Ready to mentor responsibly?"}</h2>
                <p>Ten real-life decisions. No trick questions and no jargon contest. Score {passingScore}% or higher to earn the {certificateTitle} course-completion certificate.</p>

                {alreadyCompleted ? (
                  <div className="academy-complete-card">
                    <Award aria-hidden="true"/>
                    <div>
                      <h3>Course completed</h3>
                      <p>Your recorded passing score is {completedScore}%.</p>
                      <Link className="button" href={certificateHref}>View and download certificate</Link>
                    </div>
                  </div>
                ) : !allModulesComplete ? (
                  <div className="academy-locked-final">
                    <LockKeyhole aria-hidden="true"/>
                    <div><strong>Complete all eight level checkpoints first.</strong><p>You have completed {completed.length} of {modules.length}. Use the level list to jump back to anything unfinished.</p></div>
                  </div>
                ) : (
                  <>
                    {failedScore !== null && <div className="academy-retry-message" role="alert"><strong>Your last score was {failedScore}%.</strong> Review the questions you were uncertain about and run it back. A new attempt will not count against you.</div>}
                    {!signedIn && <div className="notice"><strong>You can learn without an account.</strong><br/>To submit the final assessment and place your name on a certificate, sign in or create a free EFF portal account.</div>}
                    <form className="academy-final-form" action={assessmentAction}>
                      {finalQuestions.map((question, index) => (
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
                        <span>{isFamilyCourse
                          ? "I completed this assessment myself and understand that this EFF certificate recognizes course completion, not authority to act as a college employee, counselor, attorney, or financial-aid administrator."
                          : "I completed this assessment myself and understand that this EFF certificate recognizes course completion, not federal licensure or authority to act as a financial-aid administrator."}</span>
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
          <div className="section-head"><div><div className="eyebrow">Course integrity</div><h2>Friendly format. Serious sources.</h2></div><p>{isFamilyCourse ? "The lessons use authoritative federal and EFF resources, practical family scenarios, and clear referral boundaries." : "The energy is youth-friendly; the information is grounded in official U.S. Department of Education and Federal Student Aid resources."}</p></div>
          <div className="academy-method-grid">
            {isFamilyCourse ? (
              <>
                <article><strong>Asset-based</strong><p>Families are treated as partners with existing strengths—not as problems to be fixed.</p></article>
                <article><strong>Student-led</strong><p>Consent, privacy, student agency, and warm referrals are built into every module.</p></article>
                <article><strong>Reviewed July 25, 2026</strong><p>College policies and federal guidance change. Learners are taught to verify the current official source.</p></article>
              </>
            ) : (
              <>
                <article><strong>Official-source first</strong><p>Rules and process explanations point learners back to StudentAid.gov and the FSA Training Center.</p></article>
                <article><strong>Student-safe scope</strong><p>Institution-only work—eligibility decisions, professional judgment, verification review, and award administration—is taught as a referral boundary.</p></article>
                <article><strong>Reviewed July 25, 2026</strong><p>Financial-aid rules and dates change. EFF should review this course before each FAFSA cycle and whenever Federal Student Aid publishes a major update.</p></article>
              </>
            )}
          </div>
          <div className="academy-source-list">{courseSources.map(source => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={14}/></a>)}</div>
        </div>
      </section>
    </>
  );
}
