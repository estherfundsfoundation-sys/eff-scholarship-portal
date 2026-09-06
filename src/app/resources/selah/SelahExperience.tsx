"use client";

import Link from "next/link";
import {useCallback, useEffect, useRef, useState} from "react";
import {
  BookHeart,
  Brain,
  ChevronRight,
  CloudRain,
  Headphones,
  LifeBuoy,
  LockKeyhole,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react";

type Mood = "rest" | "breathe" | "pray" | "study" | "alone";
type Sound = "quiet" | "gentle-rain" | "window-rain" | "deep-rain" | "ocean" | "night";
type Music = "still-waters" | "morning-light" | "focus" | "prayer";
type AudioSettings = {mood: Mood; sound: Sound; music: Music; volume: number};
type AudioSession = {context: AudioContext; master: GainNode; sources: AudioScheduledSourceNode[]};

const moodCopy: Record<Mood, {label: string; message: string}> = {
  rest: {label: "I need rest", message: "You are allowed to pause before everything is solved."},
  breathe: {label: "I need to breathe", message: "Nothing is asking you to rush in this moment."},
  pray: {label: "I want to pray", message: "God is present, even when you do not have the words."},
  study: {label: "I need gentle focus", message: "One small, peaceful step is enough for right now."},
  alone: {label: "I feel alone", message: "You are seen. You are loved. You do not have to carry tonight alone."},
};

const soundCopy: Record<Sound, {label: string; detail: string}> = {
  quiet: {label: "Quiet air", detail: "Music only"},
  "gentle-rain": {label: "Gentle rain", detail: "A light, even rainfall"},
  "window-rain": {label: "Window rain", detail: "Rain softened through glass"},
  "deep-rain": {label: "Deep rain", detail: "A fuller, lower rain"},
  ocean: {label: "Ocean breath", detail: "Slow waves in and out"},
  night: {label: "Night hush", detail: "A soft, low nighttime hum"},
};

const musicCopy: Record<Music, {label: string; detail: string; chord: number[]}> = {
  "still-waters": {label: "Still Waters", detail: "Warm and unhurried", chord: [174.61, 261.63, 349.23]},
  "morning-light": {label: "Morning Light", detail: "Gentle and hopeful", chord: [196, 261.63, 392]},
  focus: {label: "Gentle Focus", detail: "Clear and steady", chord: [220, 329.63, 440]},
  prayer: {label: "Prayer Room", detail: "Quiet and reflective", chord: [196, 293.66, 392]},
};

const scriptures = [
  {text: "Be still, and know that I am God.", ref: "Psalm 46:10"},
  {text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.", ref: "Matthew 11:28"},
  {text: "Casting all your care upon him; for he careth for you.", ref: "1 Peter 5:7"},
  {text: "The Lord is nigh unto them that are of a broken heart.", ref: "Psalm 34:18"},
  {text: "My grace is sufficient for thee: for my strength is made perfect in weakness.", ref: "2 Corinthians 12:9"},
  {text: "When thou passest through the waters, I will be with thee.", ref: "Isaiah 43:2"},
];

function makeNoiseBuffer(context: AudioContext, color: "white" | "brown" = "white") {
  const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    if (color === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[index] = last * 3.2;
    } else {
      data[index] = white;
    }
  }
  return buffer;
}

function stopSources(session: AudioSession) {
  session.sources.forEach((source) => {
    try { source.stop(); } catch {}
    try { source.disconnect(); } catch {}
  });
  session.sources = [];
}

function addNoiseLayer(
  session: AudioSession,
  options: {color?: "white" | "brown"; filter: BiquadFilterType; frequency: number; gain: number; q?: number; pulse?: number},
) {
  const {context, master} = session;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = makeNoiseBuffer(context, options.color);
  source.loop = true;
  filter.type = options.filter;
  filter.frequency.value = options.frequency;
  filter.Q.value = options.q ?? 0.45;
  gain.gain.value = options.gain;
  source.connect(filter).connect(gain).connect(master);
  source.start();
  session.sources.push(source);

  if (options.pulse) {
    const lfo = context.createOscillator();
    const depth = context.createGain();
    lfo.frequency.value = options.pulse;
    depth.gain.value = options.gain * 0.38;
    lfo.connect(depth).connect(gain.gain);
    lfo.start();
    session.sources.push(lfo);
  }
}

function buildSoundscape(session: AudioSession, settings: AudioSettings) {
  stopSources(session);
  const {context, master} = session;
  master.gain.cancelScheduledValues(context.currentTime);
  master.gain.setTargetAtTime(Math.max(settings.volume, 0.0001), context.currentTime, 0.12);

  const preset = musicCopy[settings.music];
  const chord = settings.mood === "study" ? musicCopy.focus.chord : settings.mood === "pray" ? musicCopy.prayer.chord : preset.chord;
  chord.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const movement = context.createOscillator();
    const movementDepth = context.createGain();
    oscillator.type = index === 0 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index * 2.5 - 2.5;
    filter.type = "lowpass";
    filter.frequency.value = 520 + index * 150;
    gain.gain.value = 0.032 / (index + 1);
    movement.frequency.value = 0.035 + index * 0.012;
    movementDepth.gain.value = gain.gain.value * 0.24;
    movement.connect(movementDepth).connect(gain.gain);
    oscillator.connect(filter).connect(gain).connect(master);
    oscillator.start();
    movement.start();
    session.sources.push(oscillator, movement);
  });

  const shimmer = context.createOscillator();
  const shimmerGain = context.createGain();
  shimmer.type = "sine";
  shimmer.frequency.value = settings.music === "focus" ? 587.33 : 523.25;
  shimmerGain.gain.value = 0.0035;
  shimmer.connect(shimmerGain).connect(master);
  shimmer.start();
  session.sources.push(shimmer);

  switch (settings.sound) {
    case "gentle-rain":
      addNoiseLayer(session, {filter: "highpass", frequency: 1150, gain: 0.055});
      break;
    case "window-rain":
      addNoiseLayer(session, {filter: "bandpass", frequency: 920, gain: 0.085, q: 0.7});
      addNoiseLayer(session, {color: "brown", filter: "lowpass", frequency: 260, gain: 0.024});
      break;
    case "deep-rain":
      addNoiseLayer(session, {color: "brown", filter: "lowpass", frequency: 520, gain: 0.09});
      addNoiseLayer(session, {filter: "highpass", frequency: 1600, gain: 0.035});
      break;
    case "ocean":
      addNoiseLayer(session, {color: "brown", filter: "lowpass", frequency: 640, gain: 0.075, pulse: 0.085});
      break;
    case "night":
      addNoiseLayer(session, {color: "brown", filter: "lowpass", frequency: 230, gain: 0.048});
      break;
    default:
      break;
  }
}

export default function SelahExperience() {
  const [entered, setEntered] = useState(false);
  const [mood, setMood] = useState<Mood>("rest");
  const [sound, setSound] = useState<Sound>("gentle-rain");
  const [music, setMusic] = useState<Music>("still-waters");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.52);
  const [audioMessage, setAudioMessage] = useState("Tap play to begin. Phone sound will never autoplay.");
  const [scripture, setScripture] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [journal, setJournal] = useState("");
  const [journalStatus, setJournalStatus] = useState("");
  const audioRef = useRef<AudioSession | null>(null);
  const settingsRef = useRef<AudioSettings>({mood, sound, music, volume});

  const startAudio = useCallback(async () => {
    setAudioMessage("Starting your soundscape…");
    try {
      let session = audioRef.current;
      if (!session || session.context.state === "closed") {
        const AudioContextClass = window.AudioContext || (window as typeof window & {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
        if (!AudioContextClass) throw new Error("Web Audio is unavailable");
        const context = new AudioContextClass();
        const master = context.createGain();
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -18;
        limiter.knee.value = 18;
        limiter.ratio.value = 4;
        limiter.attack.value = 0.02;
        limiter.release.value = 0.35;
        master.gain.value = Math.max(settingsRef.current.volume, 0.0001);
        master.connect(limiter).connect(context.destination);
        session = {context, master, sources: []};
        audioRef.current = session;
      }
      if (session.context.state === "suspended") await session.context.resume();
      buildSoundscape(session, settingsRef.current);
      if (session.context.state !== "running") {
        setPlaying(false);
        setAudioMessage("Your phone kept audio paused. Tap play once more and raise your media volume.");
        return;
      }
      setPlaying(true);
      setAudioMessage(`${musicCopy[settingsRef.current.music].label} with ${soundCopy[settingsRef.current.sound].label.toLowerCase()}`);
    } catch {
      setPlaying(false);
      setAudioMessage("We could not start sound on this device. Tap play again and check your phone's media volume.");
    }
  }, []);

  const pauseAudio = useCallback(() => {
    const session = audioRef.current;
    if (session) {
      stopSources(session);
      void session.context.suspend();
    }
    setPlaying(false);
    setAudioMessage("Paused. Tap play whenever you are ready.");
  }, []);

  const updateSoundscape = useCallback((next: Partial<AudioSettings>) => {
    settingsRef.current = {...settingsRef.current, ...next};
    const session = audioRef.current;
    if (session && session.context.state === "running") {
      buildSoundscape(session, settingsRef.current);
      setPlaying(true);
      setAudioMessage(`${musicCopy[settingsRef.current.music].label} with ${soundCopy[settingsRef.current.sound].label.toLowerCase()}`);
    }
  }, []);

  useEffect(() => {
    try { setJournal(window.localStorage.getItem("eff-selah-private-note") ?? ""); } catch {}
    return () => {
      const session = audioRef.current;
      if (session) {
        stopSources(session);
        void session.context.close();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && audioRef.current?.context.state === "running") {
        stopSources(audioRef.current);
        void audioRef.current.context.suspend();
        setPlaying(false);
        setAudioMessage("Paused while Selah was in the background. Tap play to return.");
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setSecondsLeft((value) => {
      if (value <= 1) {
        setTimerRunning(false);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    const id = window.setInterval(() => setScripture((value) => (value + 1) % scriptures.length), 16000);
    return () => window.clearInterval(id);
  }, []);

  const enterWithSound = () => {
    setEntered(true);
    void startAudio();
  };
  const chooseSound = (next: Sound) => { setSound(next); updateSoundscape({sound: next}); };
  const chooseMusic = (next: Music) => { setMusic(next); updateSoundscape({music: next}); };
  const chooseMood = (next: Mood) => { setMood(next); updateSoundscape({mood: next}); };
  const chooseVolume = (next: number) => {
    setVolume(next);
    settingsRef.current.volume = next;
    const session = audioRef.current;
    if (session) session.master.gain.setTargetAtTime(Math.max(next, 0.0001), session.context.currentTime, 0.08);
  };
  const setTimer = (minutes: number) => { setTimerMinutes(minutes); setSecondsLeft(minutes * 60); setTimerRunning(false); };
  const saveJournal = () => {
    try { window.localStorage.setItem("eff-selah-private-note", journal); setJournalStatus("Saved only on this device."); }
    catch { setJournalStatus("Your browser did not allow local saving. You can still copy your words."); }
  };
  const clearJournal = () => {
    setJournal("");
    try { window.localStorage.removeItem("eff-selah-private-note"); } catch {}
    setJournalStatus("Your private note was cleared.");
  };
  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  if (!entered) return (
    <main className="selah-welcome">
      <div className="selah-stars" aria-hidden="true" />
      <section className="selah-welcome-card">
        <div className="selah-mark"><Sparkles /><span>Esther Funds Foundation presents</span></div>
        <p className="selah-script">You made it here.</p>
        <h1>SELAH</h1>
        <p className="selah-subtitle">A free, Christ-centered mental wellness space for college students.</p>
        <p className="selah-invitation">Nothing to submit. Nothing to prove. Breathe, pray, rest, or gently find your next step.</p>
        <div className="selah-entry-actions">
          <button className="selah-enter" onClick={enterWithSound}><Play size={17} fill="currentColor" /> Enter with sound</button>
          <button className="selah-enter-quiet" onClick={() => setEntered(true)}>Enter quietly</button>
        </div>
        <small>Your phone requires a tap before audio can begin. Selah never autoplays sound.</small>
        <a className="selah-welcome-help" href="#urgent-support" onClick={() => setEntered(true)}>I need urgent support <ChevronRight size={14} /></a>
      </section>
    </main>
  );

  return (
    <main className={`selah-room selah-${sound}`}>
      <section className="selah-quiet-room" id="top">
        <div className="selah-window" aria-hidden="true"><span className="selah-moon" /><i /><i /><i /><i /></div>
        <header className="selah-header">
          <Link href="/resources/selah" className="selah-brand"><BookHeart /> <span><b>SELAH</b><small>by Esther Funds Foundation</small></span></Link>
          <nav className="selah-header-actions" aria-label="Selah navigation">
            <a href="#care-tools">Care tools</a><a href="#urgent-support">Get support</a>
            <button className="selah-control-toggle" onClick={() => setShowControls((value) => !value)} aria-expanded={showControls}><SlidersHorizontal /> Sounds</button>
          </nav>
        </header>

        <section className="selah-center" aria-live="polite">
          <p className="selah-now">Right now</p>
          <h1>{moodCopy[mood].message}</h1>
          <blockquote key={scripture}><p>“{scriptures[scripture].text}”</p><cite>{scriptures[scripture].ref} · KJV</cite></blockquote>
          <div className="selah-breathe" aria-label="Slow breathing guide"><span>Breathe slowly</span></div>
          <div className="selah-player">
            <button className="selah-play" onClick={playing ? pauseAudio : () => void startAudio()} aria-label={playing ? "Pause Selah soundscape" : "Play Selah soundscape"}>{playing ? <Pause /> : <Play fill="currentColor" />}</button>
            <div><strong>{playing ? "Your Selah soundscape is playing" : "Tap play when you are ready"}</strong><span>{audioMessage}</span></div>
            <button className="selah-mute" onClick={() => chooseVolume(volume > 0 ? 0 : 0.52)} aria-label={volume > 0 ? "Mute" : "Unmute"}>{volume > 0 ? <Volume2 /> : <VolumeX />}</button>
          </div>
          <button className="selah-open-sounds" onClick={() => setShowControls(true)}><CloudRain size={16} /> Change rain or music</button>
        </section>

        <aside className={`selah-controls ${showControls ? "open" : ""}`} aria-label="Selah sound and timer controls" aria-hidden={!showControls}>
          <button className="selah-close" onClick={() => setShowControls(false)} aria-label="Close controls">×</button>
          <p className="selah-eyebrow">Your quiet room</p><h2>Make this moment yours.</h2>
          <fieldset><legend>What do you need?</legend><div className="selah-choice-grid">{(Object.keys(moodCopy) as Mood[]).map((key) => <button key={key} className={mood === key ? "selected" : ""} onClick={() => chooseMood(key)}>{moodCopy[key].label}</button>)}</div></fieldset>
          <fieldset><legend>Music</legend><div className="selah-choice-grid">{(Object.keys(musicCopy) as Music[]).map((key) => <button key={key} className={music === key ? "selected" : ""} onClick={() => chooseMusic(key)}><b>{musicCopy[key].label}</b><small>{musicCopy[key].detail}</small></button>)}</div></fieldset>
          <fieldset><legend>Rain &amp; nature</legend><div className="selah-choice-grid">{(Object.keys(soundCopy) as Sound[]).map((key) => <button key={key} className={sound === key ? "selected" : ""} onClick={() => chooseSound(key)}><b>{soundCopy[key].label}</b><small>{soundCopy[key].detail}</small></button>)}</div></fieldset>
          <label className="selah-volume">Volume <input aria-label="Soundscape volume" type="range" min="0" max="0.85" step="0.01" value={volume} onChange={(event) => chooseVolume(Number(event.target.value))} /></label>
          <fieldset><legend>Quiet timer</legend><div className="selah-choice-grid three">{[5, 10, 20].map((minutes) => <button key={minutes} className={timerMinutes === minutes ? "selected" : ""} onClick={() => setTimer(minutes)}>{minutes} min</button>)}</div><div className="selah-timer"><strong>{formattedTime}</strong><button onClick={() => setTimerRunning((value) => !value)}>{timerRunning ? "Pause" : "Begin"}</button><button onClick={() => setTimer(timerMinutes)} aria-label="Reset timer"><RotateCcw /></button></div></fieldset>
          <p className="selah-mobile-note">On a phone, keep media volume on and tap play after returning from another app.</p>
        </aside>
      </section>

      <section className="selah-care" id="care-tools">
        <div className="selah-section-heading">
          <p className="selah-eyebrow">Gentle care for real college days</p><h2>You do not have to fix everything tonight.</h2>
          <p>Choose one small tool. Selah does not diagnose you, and you do not need an account to use it.</p>
        </div>
        <div className="selah-care-grid">
          <article className="selah-care-card breathe-card"><Wind /><p className="selah-card-number">01</p><h3>Take a 60-second reset</h3><p>Put both feet on the floor. Let your shoulders drop. Breathe in gently, pause, and let your exhale be longer than your inhale.</p><a href="#top">Return to the breathing circle</a></article>
          <article className="selah-care-card"><Brain /><p className="selah-card-number">02</p><h3>Come back to the room</h3><ol><li><b>5</b> things you can see</li><li><b>4</b> things you can feel</li><li><b>3</b> things you can hear</li><li><b>2</b> things you can smell</li><li><b>1</b> thing you can taste</li></ol></article>
          <article className="selah-care-card selah-journal-card"><LockKeyhole /><p className="selah-card-number">03</p><h3>Give the feeling words</h3><label htmlFor="selah-note">What feels heaviest right now—and what is one kind next step?</label><textarea id="selah-note" value={journal} onChange={(event) => setJournal(event.target.value)} placeholder="Write without judging yourself…" /><div className="selah-journal-actions"><button onClick={saveJournal}>Save on this device</button><button onClick={clearJournal} aria-label="Clear private note"><Trash2 size={15} /> Clear</button></div><small><LockKeyhole size={12} /> This note stays in this browser. Esther Funds Foundation does not receive it.</small>{journalStatus && <p className="selah-save-status" role="status">{journalStatus}</p>}</article>
        </div>
      </section>

      <section className="selah-campus-plan">
        <div><p className="selah-eyebrow">Your next human connection</p><h2>Let somebody help you carry it.</h2><p>A quiet moment can help you breathe. Support from a real person can help you move forward.</p></div>
        <ol><li><span>1</span><div><b>Tell one safe person</b><p>A friend, resident assistant, mentor, campus minister, professor, coach, or family member.</p></div></li><li><span>2</span><div><b>Contact campus counseling</b><p>Search your college website for “counseling center,” “student health,” or “after-hours crisis line.”</p></div></li><li><span>3</span><div><b>Ask EFF for practical support</b><p>Food, housing, tuition, and transportation stress can affect mental health. The National Student Help Desk can help you identify next steps.</p></div></li></ol>
        <Link className="selah-primary-link" href="/help-desk">Open the National Student Help Desk <ChevronRight /></Link>
      </section>

      <section className="selah-urgent" id="urgent-support">
        <div className="selah-urgent-icon"><LifeBuoy /></div><div className="selah-urgent-copy"><p className="selah-eyebrow">Real-time support</p><h2>Need help right now?</h2><p>If you are in emotional distress, thinking about suicide, or worried you may hurt yourself, call or text <b>988</b> in the United States. It is free and available 24/7. If there is immediate danger, call <b>911</b> or go to the nearest emergency department.</p></div>
        <div className="selah-urgent-actions"><a href="tel:988">Call 988</a><a href="sms:988">Text 988</a><a href="https://988lifeline.org/chat/" target="_blank" rel="noopener noreferrer">Chat with 988</a></div>
      </section>

      <footer className="selah-footer"><div><BookHeart /><span><b>SELAH</b><small>A mental wellness resource by Esther Funds Foundation</small></span></div><p>Selah offers calming tools and spiritual encouragement. It is not therapy, diagnosis, medical advice, or emergency care.</p><span><Headphones /> Original browser-generated soundscapes · No account required</span></footer>
    </main>
  );
}
