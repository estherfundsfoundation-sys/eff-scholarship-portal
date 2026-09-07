"use client";

import {FormEvent, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import {ArrowLeft, ArrowUp, Check, Clipboard, ExternalLink, Flag, RotateCcw, ShieldCheck, Sparkles, Trash2} from "lucide-react";
import styles from "./ask.module.css";

type Source = {id: string; title: string; url: string; sourceType: string; accessedAt: string};
type UiMessage = {id: string; role: "user" | "assistant"; content: string; sources?: Source[]; mode?: string; requestId?: string};

const prompts = [
  "How do I know if I’m ready to graduate?",
  "Help me plan my remaining credits.",
  "What should I do after graduation?",
  "I don’t understand my financial aid.",
  "I have a balance and can’t register.",
  "Help me find scholarships.",
  "I’m struggling in my classes.",
  "How do I get involved with EFF?",
];

function newId() { return crypto.randomUUID(); }

export default function AskEffClient({pilotOnly, requiresPilotCode}: {pilotOnly: boolean; requiresPilotCode: boolean}) {
  const [conversationId, setConversationId] = useState(newId);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [pilotCode, setPilotCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const canSend = input.trim().length > 0 && adultConfirmed && !loading && (!requiresPilotCode || pilotCode.trim().length > 0);
  const apiMessages = useMemo(() => messages.map(({id, role, content}) => ({id, role, content})), [messages]);

  useEffect(() => { endRef.current?.scrollIntoView({behavior: "smooth", block: "nearest"}); }, [messages, loading]);

  function clearConversation() {
    setMessages([]);
    setConversationId(newId());
    setInput("");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    const userMessage: UiMessage = {id: newId(), role: "user", content: input.trim()};
    const requestId = newId();
    const nextMessages = [...apiMessages, userMessage].slice(-16);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        cache: "no-store",
        body: JSON.stringify({requestId, conversationId, adultConfirmed, pilotCode, messages: nextMessages}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ask EFF could not answer right now.");
      setMessages((current) => [...current, {id: newId(), role: "assistant", content: data.answer, sources: data.sources ?? [], mode: data.mode, requestId: data.requestId ?? requestId}]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ask EFF could not answer right now.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAnswer(message: UiMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopied(message.id);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function reportAnswer(message: UiMessage, index: number) {
    const consent = window.confirm("Submitting this report shares this answer and your most recent question with authorized Ask EFF administrators. Continue?");
    if (!consent) return;
    const lastQuestion = [...messages.slice(0, index)].reverse().find((item) => item.role === "user")?.content;
    const response = await fetch("/api/ask/feedback", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({requestId: message.requestId ?? newId(), conversationId, messageId: message.id, answer: message.content, lastQuestion, consentToShare: true})});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error || "The report could not be saved right now.");
    else setError("Thank you. Your accuracy report was recorded.");
  }

  return <main className={styles.page}>
    <section className={styles.shell} aria-labelledby="ask-eff-title">
      <header className={styles.topbar}>
        <Link href="/resources" className={styles.back}><ArrowLeft size={16}/> Back to resources</Link>
        <div className={styles.wordmark}><Sparkles size={17}/><span>ASK EFF</span></div>
        <button type="button" className={styles.clearButton} onClick={clearConversation}><RotateCcw size={15}/> New conversation</button>
      </header>

      <div className={styles.intro}>
        <p className={styles.kicker}>EVERY FUTURE FULFILLED</p>
        <h1 id="ask-eff-title">Ask us a question.</h1>
        <p>Ask about college, graduation, careers, student support, or EFF. Let’s find your next step.</p>
      </div>

      <div className={styles.disclosure} role="note">
        <ShieldCheck aria-hidden="true"/>
        <div><strong>Before you begin</strong><p>Ask EFF is an AI education assistant, not a live staff member. It can make mistakes. Confirm important requirements with your school or the original provider.</p><p>Please do not share passwords, Social Security numbers, student ID numbers, banking details, or other sensitive information.</p></div>
      </div>

      {messages.length === 0 ? <div className={styles.starter}>
        <div className={styles.starterHead}><span>Start where you are</span><p>You do not need to know the right words. Choose a question or write your own.</p></div>
        <div className={styles.promptGrid}>{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => setInput(prompt)}>{prompt}<ArrowUp size={15}/></button>)}</div>
      </div> : <div className={styles.conversation} aria-live="polite">
        {messages.map((message, index) => <article key={message.id} className={message.role === "user" ? styles.userMessage : styles.assistantMessage}>
          <div className={styles.messageLabel}>{message.role === "user" ? "You" : "Ask EFF"}{message.mode === "mock" ? <span>Mock mode</span> : null}</div>
          <div className={styles.messageText}>{message.content}</div>
          {message.sources?.length ? <div className={styles.sources}><strong>Sources and next steps</strong>{message.sources.map((source) => <a href={source.url} target={source.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" key={source.id}><span>{source.id}</span>{source.title}<ExternalLink size={13}/></a>)}</div> : null}
          {message.role === "assistant" ? <div className={styles.messageActions}><button type="button" onClick={() => copyAnswer(message)}>{copied === message.id ? <Check size={14}/> : <Clipboard size={14}/>} {copied === message.id ? "Copied" : "Copy answer"}</button><button type="button" onClick={() => reportAnswer(message, index)}><Flag size={14}/> Report inaccurate</button></div> : null}
        </article>)}
        {loading ? <div className={styles.loading} role="status"><span/><span/><span/> Ask EFF is preparing your response.</div> : null}
        <div ref={endRef}/>
      </div>}

      <form className={styles.composer} onSubmit={submit}>
        {pilotOnly ? <div className={styles.pilotRow}><span>Controlled adult pilot</span>{requiresPilotCode ? <label>Access code<input type="password" value={pilotCode} onChange={(event) => setPilotCode(event.target.value)} autoComplete="off"/></label> : null}</div> : null}
        <label className={styles.inputLabel} htmlFor="ask-eff-input">What do you need help with?</label>
        <div className={styles.inputRow}><textarea id="ask-eff-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="What do you need help with?" rows={3} maxLength={5000}/><button type="submit" disabled={!canSend} aria-label="Send question"><ArrowUp/></button></div>
        <div className={styles.consentRow}><label><input type="checkbox" checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)}/> I confirm that I am 18 or older.</label><span>{input.length}/5000</span></div>
        {error ? <p className={error.startsWith("Thank") ? styles.success : styles.error} role="status">{error}</p> : null}
      </form>

      <footer className={styles.footnote}><span>Temporary conversation · not saved to browser storage</span><button type="button" onClick={clearConversation}><Trash2 size={14}/> Clear conversation</button></footer>
    </section>
  </main>;
}
