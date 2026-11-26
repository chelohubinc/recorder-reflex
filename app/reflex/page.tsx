"use client";

import Link from "next/link";
import "../fast-mode/fast-mode.css";
import { ArrowLeft, ArrowRight, Pause, Play, RotateCw, StopCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateQuestionSequence } from "@/features/training/engine/question-sequence";
import { NOTES } from "@/features/music/data/notes";
import { monotonicNow } from "@/lib/clock";

const DURATIONS = [30, 60, 120] as const;
type Duration = typeof DURATIONS[number];
const NOTE_DURATIONS = [2, 4, 6] as const;
type NoteDuration = typeof NOTE_DURATIONS[number];
const makeSequence = (previousNoteId?: string) =>
  generateQuestionSequence(NOTES.map((note) => note.id), 500, Math.random, previousNoteId);

export default function ReflexPage() {
  const [duration, setDuration] = useState<Duration>(60);
  const [noteDuration, setNoteDuration] = useState<NoteDuration>(4);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sequence, setSequence] = useState<string[]>([]);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(60_000);
  const [remainingNoteMs, setRemainingNoteMs] = useState(4_000);
  const [presented, setPresented] = useState(0);
  const startedAt = useRef<number | null>(null);
  const noteStartedAt = useRef<number | null>(null);
  const pausedAt = useRef<number | null>(null);
  const ended = useRef(true);

  const note = useMemo(
    () => NOTES.find((item) => item.id === sequence[sequenceIndex]) ?? NOTES[0],
    [sequence, sequenceIndex],
  );

  const finishChallenge = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    setRemainingMs(0);
    setRemainingNoteMs(0);
    setRunning(false);
    setPaused(false);
    setFinished(true);
  }, []);

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

  useEffect(() => {
    if (!running || ended.current || noteStartedAt.current === null) return;
    const timer = window.setInterval(() => {
      if (ended.current) return;
      const now = monotonicNow();
      if (startedAt.current !== null && now - startedAt.current >= duration * 1000) {
        finishChallenge();
        return;
      }
      const remaining = Math.max(0, noteDuration * 1000 - (now - noteStartedAt.current!));
      setRemainingNoteMs(remaining);
      if (remaining <= 0) {
        setPresented((count) => count + 1);
        const nextIndex = sequenceIndex + 1;
        const previousNoteId = sequence[sequenceIndex];
        noteStartedAt.current = now;
        setRemainingNoteMs(noteDuration * 1000);
        if (nextIndex >= sequence.length) {
          setSequence(makeSequence(previousNoteId));
          setSequenceIndex(0);
        } else {
          setSequenceIndex(nextIndex);
        }
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [running, noteDuration, duration, sequenceIndex, sequence, finishChallenge]);

  function begin() {
    setSequence(makeSequence());
    setSequenceIndex(0);
    setPresented(0);
    setRemainingMs(duration * 1000);
    setRemainingNoteMs(noteDuration * 1000);
    ended.current = false;
    startedAt.current = monotonicNow();
    noteStartedAt.current = monotonicNow();
    pausedAt.current = null;
    setPaused(false);
    setFinished(false);
    setRunning(true);
  }

  function pauseChallenge() {
    if (!running || ended.current) return;
    pausedAt.current = monotonicNow();
    setRunning(false);
    setPaused(true);
  }

  function resumeChallenge() {
    if (!paused || ended.current) return;
    const now = monotonicNow();
    const pauseDuration = now - (pausedAt.current ?? now);
    if (startedAt.current !== null) startedAt.current += pauseDuration;
    // Preserve the remaining time on the current note instead of restarting its countdown.
    noteStartedAt.current = now - (noteDuration * 1000 - remainingNoteMs);
    pausedAt.current = null;
    setPaused(false);
    setRunning(true);
  }

  function abandonChallenge() {
    ended.current = true;
    startedAt.current = null;
    noteStartedAt.current = null;
    pausedAt.current = null;
    setRunning(false);
    setPaused(false);
    setFinished(false);
    setSequence([]);
    setSequenceIndex(0);
    setPresented(0);
    setRemainingMs(duration * 1000);
    setRemainingNoteMs(noteDuration * 1000);
  }

  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const progressPercent = Math.max(0, Math.min(100, (remainingMs / (duration * 1000)) * 100));
  const progressPercentNote = Math.max(0, Math.min(100, (remainingNoteMs / (noteDuration * 1000)) * 100));

  return (
    <main className="simple-page fast-page">
      <Link href="/" className="simple-back"><ArrowLeft aria-hidden="true" /> Retour au tableau de bord</Link>
      <div className="eyebrow" style={{ marginTop: 28 }}>RECORDER REFLEX / MODE RÉFLEXE</div>
      <h1>Notes enchaînées</h1>
      <p className="muted">Les notes se succèdent automatiquement : reproduis chaque note sur ta flûte.</p>

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
          <div className="panel-title-row"><h2>Combien de secondes par note ?</h2></div>
          <div className="duration-options" style={{ marginTop: 18 }}>
            {NOTE_DURATIONS.map((value) => (
              <button key={value} className="duration-option" aria-pressed={noteDuration === value} onClick={() => setNoteDuration(value)}>{`${value} s`}</button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 16 }}>Do5 à Ré6 · ordre aléatoire sans répétition immédiate · doigtés allemands.</p>
          <button className="primary-button" style={{ marginTop: 20 }} onClick={begin}>Démarrer le défi <ArrowRight aria-hidden="true" /></button>
        </section>
      )}

      {(running || paused) && (
        <>
          <div className="fast-toolbar">
            <div className="fast-timer">TEMPS RESTANT <strong>{minutes}:{String(seconds).padStart(2, "0")}</strong></div>
            <span className="duration-option">{presented} notes présentées</span>
          </div>
          <div className="fast-progress"><i style={{ width: `${progressPercent}%` }} /></div>
          <section className="fast-stage">
            <div className="fast-progress"><i style={{ width: `${progressPercentNote}%` }} /></div>
            <div className="eyebrow">NOTE {presented + 1} · SYSTÈME ALLEMAND</div>
            <div className="fast-note">{note.name}<sup>{note.octave}</sup></div>
            <p className="fast-instruction">{paused ? "Défi en pause." : "Joue cette note sur ta flûte à bec soprano."}</p>
            <div className="fast-controls">
              {paused ? (
                <button className="check-button" onClick={resumeChallenge}><Play aria-hidden="true" /> Reprendre</button>
              ) : (
                <button className="check-button" onClick={pauseChallenge}><Pause aria-hidden="true" /> Pause</button>
              )}
              <button className="skip-button" onClick={abandonChallenge}><StopCircle aria-hidden="true" /> Abandonner</button>
            </div>
          </section>
          <p className="fast-footnote">Le compteur mesure les notes affichées, pas les notes réellement jouées. La reconnaissance par microphone n'est pas encore connectée à ce défi.</p>
        </>
      )}

      {finished && (
        <section className="fast-stage fast-summary" style={{ marginTop: 22 }}>
          <div className="eyebrow">DÉFI TERMINÉ</div>
          <h2>Bien joué !</h2>
          <div className="fast-note" style={{ fontSize: 64 }}>{presented}</div>
          <p className="fast-instruction">notes présentées en {duration} secondes</p>
          <button className="primary-button" onClick={begin}>Recommencer <RotateCw aria-hidden="true" /></button>
          <button className="skip-button" style={{ marginTop: 12 }} onClick={abandonChallenge}>Retour aux réglages</button>
        </section>
      )}
    </main>
  );
}
