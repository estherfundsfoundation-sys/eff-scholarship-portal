"use client";

import Link from "next/link";
import {useCallback, useEffect, useRef, useState} from "react";
import {BookHeart, Headphones, Heart, Pause, Play, RotateCcw, SlidersHorizontal, Sparkles, Volume2, VolumeX} from "lucide-react";

type Mood = "rest" | "breathe" | "pray" | "study" | "alone";
type Sound = "still" | "rain" | "night";

const moodCopy: Record<Mood, {label: string; message: string}> = {
  rest: {label: "I need rest", message: "You are allowed to pause before everything is solved."},
  breathe: {label: "I need to breathe", message: "Nothing is asking you to rush in this moment."},
  pray: {label: "I want to pray", message: "God is present, even when you do not have the words."},
  study: {label: "I need gentle focus", message: "One small, peaceful step is enough for right now."},
  alone: {label: "I feel alone", message: "You are seen. You are loved. You do not have to carry tonight alone."},
};

const scriptures = [
  {text: "Be still, and know that I am God.", ref: "Psalm 46:10"},
  {text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28"},
  {text: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7"},
  {text: "The Lord is close to the brokenhearted.", ref: "Psalm 34:18"},
  {text: "My grace is sufficient for you, for my power is made perfect in weakness.", ref: "2 Corinthians 12:9"},
  {text: "When you pass through the waters, I will be with you.", ref: "Isaiah 43:2"},
];

function makeNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * 0.985 + white * 0.015;
    data[i] = last * 2.4;
  }
  return buffer;
}

export default function SelahExperience() {
  const [entered, setEntered] = useState(false);
  const [mood, setMood] = useState<Mood>("rest");
  const [sound, setSound] = useState<Sound>("still");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.38);
  const [scripture, setScripture] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const audioRef = useRef<{context: AudioContext; master: GainNode; nodes: AudioScheduledSourceNode[]} | null>(null);
  const settingsRef = useRef({mood, sound, volume});

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.nodes.forEach((node) => { try { node.stop(); } catch {} });
      void audio.context.close();
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  const startAudio = useCallback(() => {
    stopAudio();
    const current = settingsRef.current;
    const AudioContextClass = window.AudioContext || (window as typeof window & {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
    const context = new AudioContextClass();
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(Math.max(current.volume * 0.24, 0.001), context.currentTime + 2.4);
    master.connect(context.destination);
    const nodes: AudioScheduledSourceNode[] = [];

    const chord = current.mood === "study" ? [146.83, 220, 293.66] : current.mood === "pray" ? [130.81, 196, 261.63] : [110, 164.81, 220];
    chord.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index * 3 - 3;
      filter.type = "lowpass";
      filter.frequency.value = 620 + index * 130;
      gain.gain.value = 0.035 / (index + 1);
      oscillator.connect(filter).connect(gain).connect(master);
      oscillator.start();
      nodes.push(oscillator);
    });

    const shimmer = context.createOscillator();
    const shimmerGain = context.createGain();
    shimmer.type = "sine";
    shimmer.frequency.value = current.mood === "study" ? 587.33 : 523.25;
    shimmerGain.gain.value = 0.004;
    shimmer.connect(shimmerGain).connect(master);
    shimmer.start();
    nodes.push(shimmer);

    if (current.sound !== "still") {
      const noise = context.createBufferSource();
      const noiseGain = context.createGain();
      const noiseFilter = context.createBiquadFilter();
      noise.buffer = makeNoiseBuffer(context);
      noise.loop = true;
      noiseFilter.type = current.sound === "rain" ? "highpass" : "lowpass";
      noiseFilter.frequency.value = current.sound === "rain" ? 1050 : 260;
      noiseGain.gain.value = current.sound === "rain" ? 0.18 : 0.1;
      noise.connect(noiseFilter).connect(noiseGain).connect(master);
      noise.start();
      nodes.push(noise);
    }
    audioRef.current = {context, master, nodes};
    setPlaying(true);
  }, [stopAudio]);

  useEffect(() => () => stopAudio(), [stopAudio]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.master.gain.setTargetAtTime(Math.max(volume * 0.24, 0.0001), audioRef.current.context.currentTime, 0.35);
  }, [volume]);
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setSecondsLeft((value) => {
      if (value <= 1) { setTimerRunning(false); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);
  useEffect(() => {
    const id = window.setInterval(() => setScripture((value) => (value + 1) % scriptures.length), 16000);
    return () => window.clearInterval(id);
  }, []);

  const chooseSound = (next: Sound) => {
    const wasPlaying = playing;
    settingsRef.current.sound = next;
    setSound(next);
    if (wasPlaying) window.setTimeout(startAudio, 0);
  };
  const chooseMood = (next: Mood) => {
    const wasPlaying = playing;
    settingsRef.current.mood = next;
    setMood(next);
    if (wasPlaying) window.setTimeout(startAudio, 0);
  };
  const chooseVolume = (next: number) => {
    settingsRef.current.volume = next;
    setVolume(next);
  };
  const setTimer = (minutes: number) => {
    setTimerMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setTimerRunning(false);
  };
  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  if (!entered) return <main className="selah-welcome">
    <div className="selah-stars" aria-hidden="true" />
    <section className="selah-welcome-card">
      <div className="selah-mark"><Sparkles /><span>Esther Funds Foundation presents</span></div>
      <p className="selah-script">You made it here.</p>
      <h1>SELAH</h1>
      <p className="selah-subtitle">A quiet, Christ-centered space for college students.</p>
      <p className="selah-invitation">Nothing to submit. Nothing to prove. You can sit here for as long as you need.</p>
      <button className="selah-enter" onClick={() => setEntered(true)}>Enter the quiet room <Heart size={17} /></button>
      <small>Sound begins only when you choose to play it.</small>
    </section>
  </main>;

  return <main className={`selah-room selah-${sound}`}>
    <div className="selah-window" aria-hidden="true"><span className="selah-moon" /><i /><i /><i /><i /></div>
    <header className="selah-header">
      <Link href="/resources" className="selah-brand"><BookHeart /> <span><b>SELAH</b><small>by Esther Funds Foundation</small></span></Link>
      <button className="selah-control-toggle" onClick={() => setShowControls((value) => !value)} aria-expanded={showControls}><SlidersHorizontal /> Controls</button>
    </header>

    <section className="selah-center" aria-live="polite">
      <p className="selah-now">Right now</p>
      <h1>{moodCopy[mood].message}</h1>
      <blockquote key={scripture}><p>“{scriptures[scripture].text}”</p><cite>{scriptures[scripture].ref}</cite></blockquote>
      <div className="selah-breathe" aria-label="Breathing guide"><span>Breathe in</span></div>
      <div className="selah-player">
        <button className="selah-play" onClick={playing ? stopAudio : startAudio} aria-label={playing ? "Pause instrumental ambience" : "Play instrumental ambience"}>{playing ? <Pause /> : <Play />}</button>
        <div><strong>{playing ? "Gentle instrumental ambience" : "Press play when you are ready"}</strong><span>{sound === "rain" ? "Soft rain + warm keys" : sound === "night" ? "Night hush + warm keys" : "Warm keys + quiet air"}</span></div>
        <button className="selah-mute" onClick={() => chooseVolume(volume > 0 ? 0 : .38)} aria-label={volume > 0 ? "Mute" : "Unmute"}>{volume > 0 ? <Volume2 /> : <VolumeX />}</button>
      </div>
    </section>

    <aside className={`selah-controls ${showControls ? "open" : ""}`} aria-label="Selah controls">
      <button className="selah-close" onClick={() => setShowControls(false)} aria-label="Close controls">×</button>
      <h2>Make this moment yours.</h2>
      <fieldset><legend>What do you need?</legend><div className="selah-choice-grid">{(Object.keys(moodCopy) as Mood[]).map((key) => <button key={key} className={mood === key ? "selected" : ""} onClick={() => chooseMood(key)}>{moodCopy[key].label}</button>)}</div></fieldset>
      <fieldset><legend>Room sound</legend><div className="selah-choice-grid three">{(["still", "rain", "night"] as Sound[]).map((key) => <button key={key} className={sound === key ? "selected" : ""} onClick={() => chooseSound(key)}>{key === "still" ? "Quiet air" : key === "rain" ? "Soft rain" : "Night hush"}</button>)}</div></fieldset>
      <label className="selah-volume">Volume <input type="range" min="0" max="0.8" step="0.01" value={volume} onChange={(event) => chooseVolume(Number(event.target.value))} /></label>
      <fieldset><legend>Quiet timer</legend><div className="selah-choice-grid three">{[5, 10, 20].map((minutes) => <button key={minutes} className={timerMinutes === minutes ? "selected" : ""} onClick={() => setTimer(minutes)}>{minutes} min</button>)}</div><div className="selah-timer"><strong>{formattedTime}</strong><button onClick={() => setTimerRunning((value) => !value)}>{timerRunning ? "Pause" : "Begin"}</button><button onClick={() => setTimer(timerMinutes)} aria-label="Reset timer"><RotateCcw /></button></div></fieldset>
    </aside>

    <footer className="selah-support">
      <details><summary>I need more than a quiet moment</summary><div><p>Selah offers spiritual encouragement and calming tools. It is not therapy or emergency care.</p><nav><a href="tel:988">Call or text 988 for crisis support</a><a href="tel:911">Call 911 for immediate danger</a><a href="tel:211">Call 211 for local essentials</a><Link href="/resources/student-help">Open the National Student Help Desk</Link><Link href="/resources/finish-line">Open Finish Line Support</Link></nav></div></details>
      <span><Headphones /> Original browser-generated ambience. No account or personal data required.</span>
    </footer>
  </main>;
}
