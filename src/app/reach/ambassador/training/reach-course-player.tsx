"use client";

import {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  LockKeyhole,
  MessageCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type {CourseModule} from "@/lib/academy/financial-aid-peer-mentor";
import {
  REACH_AMBASSADOR_PASSING_SCORE,
  reachAmbassadorCourseSources,
  reachAmbassadorFinalQuestions,
} from "@/lib/reach/training";
import {submitReachAmbassadorAssessment} from "./actions";

const storageKey = "eff-reach-campus-ambassador-progress-v1";

export function ReachCoursePlayer({
  modules,
  alreadyCompleted,
  completedScore,
  failedScore,
}: {
  modules: CourseModule[];
  alreadyCompleted: boolean;
  completedScore: number | null;
  failedScore: number | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quickAnswers, setQuickAnswers] = useState<Record<string, boolean>>({});
  const [practiceRevealed, setPracticeRevealed] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ok: boolean; text: string} | null>(null);
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
  }, [modules]);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify({completed, activeIndex}));
  }, [activeIndex, completed, loaded]);

  const activeModule = activeIndex < modules.length ? modules[activeIndex] : null;
  const allModulesComplete = completed.length === modules.length;
  const progress = Math.round((completed.length / modules.length) * 100);
  const selectedForModule = useMemo(
    () => activeModule?.checks.filter(check => answers[check.id] !== undefined).length ?? 0,
    [activeModule, answers],
  );
  const activeQuickAnswer = activeModule ? quickAnswers[activeModule.id] : undefined;
  const quickCorrect = activeModule && activeQuickAnswer !== undefined
    ? activeQuickAnswer === activeModule.quickCheck.isFact
    : null;

  function gradeCheckpoint() {
    if (!activeModule || selectedForModule !== activeModule.checks.length) {
      setMessage({ok: false, text: "Choose an answer for every checkpoint question."});
      return;
    }
    const missed = activeModule.checks.filter(check => answers[check.id] !== check.correctIndex);
    if (missed.length) {
      setMessage({ok: false, text: missed.map(check => check.explanation).join(" ")});
      return;
    }
    setCompleted(current => current.includes(activeModule.id) ? current : [...current, activeModule.id]);
    setMessage({ok: true, text: "Level complete. You understood the student-safe response."});
  }

  function goNext() {
    setMessage(null);
    setActiveIndex(index => Math.min(index + 1, modules.length));
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  function reset() {
    if (!window.confirm("Reset the course progress saved on this device? Your recorded certification will not be removed.")) return;
    setCompleted([]);
    setActiveIndex(0);
    setAnswers({});
    setQuickAnswers({});
    setPracticeRevealed({});
    setMessage(null);
    window.localStorage.removeItem(storageKey);
  }

  return <section className="section"><div className="shell academy-course-layout">
    <aside className="academy-module-nav">
      <div className="academy-progress-label"><strong>{progress}% complete</strong><span>{completed.length} of {modules.length} levels</span></div>
      <div className="academy-progress-track"><span style={{width:`${progress}%`}}/></div>
      <nav aria-label="Course levels">
        {modules.map((module, index) => {
          const unlocked = index === 0 || completed.includes(modules[index - 1].id) || completed.includes(module.id);
          return <button key={module.id} type="button" disabled={!unlocked} className={activeIndex === index ? "active" : ""} onClick={() => {setActiveIndex(index); setMessage(null);}}>
            <span>{completed.includes(module.id) ? <Check size={14}/> : module.number}</span>
            <span>{module.emoji} {module.title}</span>
            {!unlocked && <LockKeyhole size={13}/>}
          </button>;
        })}
        <button type="button" disabled={!allModulesComplete} className={activeIndex === modules.length ? "active" : ""} onClick={() => {setActiveIndex(modules.length); setMessage(null);}}>
          <span>{alreadyCompleted ? <Check size={14}/> : "09"}</span><span>🏆 Final certification</span>{!allModulesComplete && <LockKeyhole size={13}/>}
        </button>
      </nav>
      <button className="academy-reset" type="button" onClick={reset}><RotateCcw size={14}/> Reset this device’s progress</button>
    </aside>

    <div className="academy-lesson">
      {activeModule ? <article>
        <header className="academy-lesson-head">
          <div className="eyebrow">Level {activeModule.number} · {activeModule.time}</div>
          <h2>{activeModule.emoji} {activeModule.title}</h2>
          <p>{activeModule.tagline}</p>
        </header>

        <div className="academy-boundary-card"><ShieldAlert/><div><strong>Your purpose in this level</strong><br/>{activeModule.purpose}</div></div>

        <section className="academy-practice">
          <div className="eyebrow">Myth or fact</div>
          <h3>{activeModule.quickCheck.prompt}</h3>
          <div className="resource-actions">
            <button className="button outline" type="button" onClick={() => setQuickAnswers(current => ({...current, [activeModule.id]: true}))}>Fact</button>
            <button className="button outline" type="button" onClick={() => setQuickAnswers(current => ({...current, [activeModule.id]: false}))}>Myth</button>
          </div>
          {activeQuickAnswer !== undefined && <p className={quickCorrect ? "academy-pass-message" : "academy-retry-message"}>
            {quickCorrect ? "Correct. " : "Not quite. "}{activeModule.quickCheck.explanation}
          </p>}
        </section>

        <div className="academy-boundary-card"><MessageCircle/><div><strong>Words you can use</strong><br/>{activeModule.mentorScript}</div></div>

        {activeModule.sections.map(section => <section className="academy-lesson-section" key={section.heading}>
          <h3>{section.heading}</h3>
          <p>{section.body}</p>
          {section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
        </section>)}

        <section className="academy-practice">
          <Lightbulb/>
          <div className="eyebrow">Real-life practice</div>
          <h3>{activeModule.practice.title}</h3>
          <p className="academy-situation">{activeModule.practice.situation}</p>
          <button className="button outline" type="button" onClick={() => setPracticeRevealed(current => ({...current, [activeModule.id]: true}))}>Show the student-safe response</button>
          {practiceRevealed[activeModule.id] && <ol>{activeModule.practice.response.map(step => <li key={step}>{step}</li>)}</ol>}
        </section>

        <section className="academy-sources">
          <h3>Approved sources and tools</h3>
          <ul>{activeModule.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={13}/></a></li>)}</ul>
        </section>

        <section className="academy-checkpoint">
          <div className="eyebrow">Level checkpoint</div>
          {activeModule.checks.map(check => <fieldset className="academy-question" key={check.id}>
            <legend>{check.prompt}</legend>
            {check.options.map((option, index) => <label key={option}><input type="radio" name={check.id} checked={answers[check.id] === index} onChange={() => setAnswers(current => ({...current, [check.id]: index}))}/><span>{option}</span></label>)}
          </fieldset>)}
          {message && <p className={message.ok ? "academy-pass-message" : "academy-retry-message"}>{message.text}</p>}
          <div className="academy-lesson-actions">
            <button className="button outline" type="button" disabled={activeIndex === 0} onClick={() => {setActiveIndex(index => Math.max(index - 1, 0)); setMessage(null);}}><ChevronLeft/> Previous</button>
            {completed.includes(activeModule.id)
              ? <button className="button" type="button" onClick={goNext}>Continue <ChevronRight/></button>
              : <button className="button" type="button" onClick={gradeCheckpoint}><Check/> Complete this level</button>}
          </div>
        </section>
      </article> : <section className="academy-final">
        <Sparkles/>
        <div className="eyebrow">Final certification assessment</div>
        <h2>Ready to represent REACH?</h2>
        <p>Answer ten real-life decisions. Score {REACH_AMBASSADOR_PASSING_SCORE}% or higher to become certified and unlock your downloadable certificate.</p>
        {failedScore !== null && <p className="academy-retry-message">Your latest score was {failedScore}%. Review the levels and try again. You need {REACH_AMBASSADOR_PASSING_SCORE}%.</p>}
        {alreadyCompleted && <div className="academy-complete-card"><Award/><h3>Certification earned</h3><p>Your recorded score is {completedScore}%. Your certificate and acceptance letter are available in your workspace.</p><Link className="button" href="/reach/ambassador">Open my workspace</Link></div>}
        {!alreadyCompleted && <form className="academy-final-form" action={submitReachAmbassadorAssessment}>
          {reachAmbassadorFinalQuestions.map((question, questionIndex) => <fieldset key={question.id}>
            <legend>{questionIndex + 1}. {question.prompt}</legend>
            {question.options.map((option, index) => <label key={option}><input type="radio" name={`question_${question.id}`} value={index} required/><span>{option}</span></label>)}
          </fieldset>)}
          <label className="academy-honor"><input type="checkbox" name="honor" required/><span>I completed this assessment myself and understand that ambassadors provide peer support, not professional counseling, legal advice, financial-aid decisions, emergency response, or guaranteed funding.</span></label>
          <button className="button" type="submit"><Award/> Submit certification assessment</button>
        </form>}
        <div className="academy-sources" style={{marginTop:28}}>
          <h3>Course resource library</h3>
          <ul>{reachAmbassadorCourseSources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={13}/></a></li>)}</ul>
        </div>
      </section>}
    </div>
  </div></section>;
}
