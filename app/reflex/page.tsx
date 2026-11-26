"use client";

import Link from "next/link";
import "../fast-mode/fast-mode.css";
import { ArrowLeft, ArrowRight, Pause, Play, RotateCw, SkipForward, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateQuestionSequence } from "@/features/training/engine/question-sequence";
import { NOTES } from "@/features/music/data/notes";
import { describePitch, detectPitch } from "@/features/audio/pitch-detection";
import { isMatchingRecorderNote } from "@/features/audio/match-note";
import { monotonicNow } from "@/lib/clock";

const DURATIONS = [30, 60, 120] as const;
type Duration = typeof DURATIONS[number];
const makeSequence = (previousNoteId?: string) =>
  generateQuestionSequence(NOTES.map((note) => note.id), 500, Math.random, previousNoteId);

export default function ReflexPage() {
  const [duration, setDuration] = useState<Duration>(60);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sequence, setSequence] = useState<string[]>([]);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(60_000);
  const [correct, setCorrect] = useState(0);
  const [passed, setPassed] = useState(0);
  const [detected, setDetected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("Joue la note affichée. Le défi avance quand la bonne hauteur est reconnue.");
  const [micError, setMicError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const startedAt = useRef<number | null>(null);
  const pausedAt = useRef<number | null>(null);
  const ended = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const candidateRef = useRef<{ midi: number; count: number } | null>(null);
  const resolvingRef = useRef(false);
  const advanceRef = useRef<(wasCorrect: boolean) => void>(() => undefined);

  const note = useMemo(
    () => NOTES.find((item) => item.id === sequence[sequenceIndex]) ?? NOTES[0],
    [sequence, sequenceIndex],
  );

  const stopAudio = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") void context.close();
    candidateRef.current = null;
    resolvingRef.current = false;
    setListening(false);
    setDetected(null);
  }, []);

  const finishChallenge = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    setRemainingMs(0);
    setRunning(false);
    setPaused(false);
    setFinished(true);
    stopAudio();
  }, [stopAudio]);

  const advanceNote = useCallback((wasCorrect: boolean) => {
    if (ended.current || resolvingRef.current) return;
    resolvingRef.current = true;
    if (wasCorrect) setCorrect((count) => count + 1);
    else setPassed((count) => count + 1);
    const previousNoteId = sequence[sequenceIndex];
    const nextIndex = sequenceIndex + 1;
    if (nextIndex >= sequence.length) {
      setSequence(makeSequence(previousNoteId));
      setSequenceIndex(0);
    } else {
      setSequenceIndex(nextIndex);
    }
    candidateRef.current = null;
    setDetected(null);
    setFeedback(wasCorrect ? "Bonne hauteur détectée !" : "Note passée. Continue !");
    window.setTimeout(() => { resolvingRef.current = false; }, 180);
  }, [sequence, sequenceIndex]);
  advanceRef.current = advanceNote;

  useEffect(() => {
    if (!running || startedAt.current === null) return;
    const timer = window.setInterval(() => {
      if (ended.current) return;
      const remaining = Math.max(0, duration * 1000 - (monotonicNow() - startedAt.current!));
      setRemainingMs(remaining);
      if (remaining <= 0) finishChallenge();
    }, 80);
    return () => window.clearInterval(timer);
  }, [running, duration, finishChallenge]);


  const startMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Le microphone nécessite un navigateur récent et une connexion HTTPS (ou localhost).");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
      await context.resume();
      streamRef.current = stream;
      contextRef.current = context;
      setListening(true);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      if (context && context.state !== "closed") await context.close();
      throw error;
    }
  }, []);

  async function begin() {
    setMicError(null);
    try {
      await startMicrophone();
      setSequence(makeSequence());
      setSequenceIndex(0);
      setCorrect(0);
      setPassed(0);
      setRemainingMs(duration * 1000);
      ended.current = false;
      resolvingRef.current = false;
      startedAt.current = monotonicNow();
      pausedAt.current = null;
      setFeedback("Joue la note affichée. Le défi avance quand la bonne hauteur est reconnue.");
      setFinished(false);
      setPaused(false);
      setRunning(true);
    } catch (cause) {
      stopAudio();
      setMicError(cause instanceof DOMException && cause.name === "NotAllowedError"
        ? "Autorise l’accès au microphone dans ton navigateur pour démarrer le défi."
        : cause instanceof DOMException && cause.name === "NotFoundError"
          ? "Aucun microphone n’a été trouvé sur cet appareil."
          : cause instanceof Error ? cause.message : "Impossible de démarrer le microphone.");
    }
  }

  function pauseChallenge() {
    if (!running || ended.current) return;
    pausedAt.current = monotonicNow();
    setRunning(false);
    setPaused(true);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (contextRef.current?.state === "running") void contextRef.current.suspend();
  }

  async function resumeChallenge() {
    if (!paused || ended.current) return;
    const now = monotonicNow();
    const pauseDuration = now - (pausedAt.current ?? now);
    if (startedAt.current !== null) startedAt.current += pauseDuration;
    pausedAt.current = null;
    try {
      await contextRef.current?.resume();
      setPaused(false);
      setRunning(true);
      if (contextRef.current && streamRef.current) {
        // The analyser loop is restarted by the effect below.
        setListening(true);
      }
    } catch {
      setMicError("Le microphone n’a pas pu reprendre. Abandonne puis redémarre le défi.");
    }
  }

  function abandonChallenge() {
    ended.current = true;
    startedAt.current = null;
    pausedAt.current = null;
    stopAudio();
    setRunning(false);
    setPaused(false);
    setFinished(false);
    setSequence([]);
    setSequenceIndex(0);
    setCorrect(0);
    setPassed(0);
    setRemainingMs(duration * 1000);
  }

  // Restart the analyser loop after a pause without requesting microphone permission again.
  useEffect(() => {
    if (!running || !contextRef.current || !streamRef.current) return;
    const context = contextRef.current;
    const source = context.createMediaStreamSource(streamRef.current);
    const analyser = context.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const analyze = () => {
      if (!running || contextRef.current !== context || ended.current) return;
      analyser.getFloatTimeDomainData(samples);
      const estimate = detectPitch(samples, context.sampleRate);
      if (estimate && estimate.clarity >= 0.65) {
        const pitch = describePitch(estimate.frequency);
        setDetected(`${pitch.name}${pitch.octave}`);
        if (isMatchingRecorderNote(pitch.midi, pitch.cents, note.midi)) {
          const previous = candidateRef.current;
          candidateRef.current = previous?.midi === pitch.midi
            ? { midi: pitch.midi, count: previous.count + 1 }
            : { midi: pitch.midi, count: 1 };
          if (candidateRef.current.count >= 8 && !resolvingRef.current) advanceRef.current(true);
        } else candidateRef.current = null;
      } else {
        candidateRef.current = null;
        setDetected(null);
      }
      frameRef.current = requestAnimationFrame(analyze);
    };
    analyze();
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      source.disconnect();
    };
  }, [running, note.midi]);

  useEffect(() => () => {
    ended.current = true;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (contextRef.current && contextRef.current.state !== "closed") void contextRef.current.close();
  }, []);

  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const progressPercent = Math.max(0, Math.min(100, (remainingMs / (duration * 1000)) * 100));

  return (
    <main className="simple-page fast-page">
      <Link href="/" className="simple-back"><ArrowLeft aria-hidden="true" /> Retour au tableau de bord</Link>
      <div className="eyebrow" style={{ marginTop: 28 }}>RECORDER REFLEX / MODE RÉFLEXE</div>
      <h1>Notes enchaînées</h1>
      <p className="muted">Joue la note affichée : le microphone valide la hauteur et passe automatiquement à la suivante.</p>

      {!running && !paused && !finished && (
        <section className="panel" style={{ marginTop: 22 }}>
          <div className="panel-title-row">
            <div><div className="eyebrow">CHOISIS TON DÉFI</div><h2>Combien de temps veux-tu tenir ?</h2></div>
            <Zap className="focus-spark" aria-hidden="true" />
          </div>
          <div className="duration-options" style={{ marginTop: 18 }}>
            {DURATIONS.map((value) => (
              <button key={value} className="duration-option" aria-pressed={duration === value} onClick={() => setDuration(value)}>
                {value === 120 ? "2 min" : `${value} s`}
              </button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 16 }}>Do5 à Ré6 · doigtés allemands · validation après 8 détections stables à ±45 cents.</p>
          {micError && <p role="alert" className="mic-error">{micError}</p>}
          <button className="primary-button" style={{ marginTop: 20 }} onClick={begin}>Autoriser le micro et démarrer <ArrowRight aria-hidden="true" /></button>
        </section>
      )}

      {(running || paused) && (
        <>
          <div className="fast-toolbar">
            <div className="fast-timer">TEMPS RESTANT <strong>{minutes}:{String(seconds).padStart(2, "0")}</strong></div>
            <span className="duration-option">{correct} validées · {passed} passées</span>
          </div>
          <div className="fast-progress"><i style={{ width: `${progressPercent}%` }} /></div>
          <section className="fast-stage">
            <div className="eyebrow">NOTE {correct + passed + 1} · SYSTÈME ALLEMAND</div>
            <div className="fast-note">{note.name}<sup>{note.octave}</sup></div>
            <p className="fast-instruction">{paused ? "Défi en pause." : feedback}</p>
            <p className="fast-footnote">Micro : {paused ? "en pause" : listening ? "à l’écoute" : "connexion en cours"}{detected ? ` · Détecté : ${detected}` : ""}</p>
            <div className="fast-controls">
              {paused ? (
                <button className="check-button" onClick={resumeChallenge}><Play aria-hidden="true" /> Reprendre</button>
              ) : (
                <button className="check-button" onClick={pauseChallenge}><Pause aria-hidden="true" /> Pause</button>
              )}
              <button className="skip-button" onClick={() => advanceNote(false)} disabled={paused}><SkipForward aria-hidden="true" /> Passer</button>
              <button className="skip-button" onClick={abandonChallenge}>Abandonner</button>
            </div>
          </section>
          <p className="fast-footnote">Le défi avance uniquement si la bonne hauteur est détectée de façon stable ou si tu appuies sur « Passer ». Le chronomètre global termine le défi ; aucune limite de temps ne s’applique à chaque note.</p>
        </>
      )}

      {finished && (
        <section className="fast-stage fast-summary" style={{ marginTop: 22 }}>
          <div className="eyebrow">DÉFI TERMINÉ</div>
          <h2>Bien joué !</h2>
          <div className="fast-metrics">
            <div className="fast-metric"><strong>{correct}</strong><span>Validées</span></div>
            <div className="fast-metric"><strong>{passed}</strong><span>Passées</span></div>
            <div className="fast-metric"><strong>{correct + passed}</strong><span>Traitées</span></div>
          </div>
          <p className="fast-instruction">Résultat sur {duration} secondes.</p>
          <button className="primary-button" onClick={begin}>Recommencer <RotateCw aria-hidden="true" /></button>
          <button className="skip-button" style={{ marginTop: 12 }} onClick={abandonChallenge}>Retour aux réglages</button>
        </section>
      )}
    </main>
  );
}
