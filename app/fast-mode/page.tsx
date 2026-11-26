"use client";

import "./fast-mode.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { NOTES } from "@/features/music/data/notes";
import { generateQuestionSequence } from "@/features/training/engine/question-sequence";
import { completeQuestion, completeSession, recordAttempt, startSession } from "@/lib/progress";
import { monotonicNow } from "@/lib/clock";

const DURATIONS = [30, 60, 120] as const;
type Duration = typeof DURATIONS[number];
const makeSequence = () => generateQuestionSequence(NOTES.map((note) => note.id), 500);

export default function FastModePage() {
  const [duration, setDuration] = useState<Duration>(60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sequence, setSequence] = useState<string[]>([]);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(60_000);
  const [played, setPlayed] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [reactionTotal, setReactionTotal] = useState(0);
  const [bestReaction, setBestReaction] = useState<number | null>(null);
  const [lastReaction, setLastReaction] = useState<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const noteStartedAt = useRef<number | null>(null);

  const note = useMemo(
    () => NOTES.find((item) => item.id === sequence[sequenceIndex]) ?? NOTES[0],
    [sequence, sequenceIndex],
  );
  const averageReaction = played ? reactionTotal / played : 0;

  useEffect(() => {
    if (!running || !sessionId || startedAt.current === null) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, duration * 1000 - (monotonicNow() - startedAt.current!));
      setRemainingMs(remaining);
      if (remaining <= 0) {
        completeSession(sessionId);
        setRunning(false);
        setFinished(true);
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [running, sessionId, duration]);


  useEffect(() => {
    if (running) noteStartedAt.current = monotonicNow();
  }, [running, sequenceIndex]);

  function begin() {
    const id = startSession(999);
    setSessionId(id);
    setSequence(makeSequence());
    setSequenceIndex(0);
    setPlayed(0);
    setSkipped(0);
    setReactionTotal(0);
    setBestReaction(null);
    setLastReaction(null);
    setRemainingMs(duration * 1000);
    startedAt.current = monotonicNow();
    noteStartedAt.current = monotonicNow();
    setFinished(false);
    setRunning(true);
  }

  function submitNote(wasPlayed: boolean) {
    if (!running || !sessionId || noteStartedAt.current === null) return;
    const nowMonotonic = monotonicNow();
    if (startedAt.current !== null && nowMonotonic - startedAt.current >= duration * 1000) {
      completeSession(sessionId);
      setRemainingMs(0);
      setRunning(false);
      setFinished(true);
      return;
    }
    const reactionMs = Math.max(0, nowMonotonic - noteStartedAt.current);
    const questionId = `${sessionId}-fast-${played + skipped + 1}`;
    const now = new Date().toISOString();

    recordAttempt({
      sessionId,
      questionId,
      noteId: note.id,
      correct: wasPlayed,
      reactionTimeMs: Math.round(reactionMs),
      createdAt: now,
    });
    completeQuestion({
      sessionId,
      questionId,
      noteId: note.id,
      correct: wasPlayed,
      reactionTimeMs: Math.round(reactionMs),
      attemptCount: 1,
      createdAt: now,
    });

    if (wasPlayed) {
      setPlayed((count) => count + 1);
      setReactionTotal((total) => total + reactionMs);
      setBestReaction((best) => best === null ? reactionMs : Math.min(best, reactionMs));
    } else {
      setSkipped((count) => count + 1);
    }
    setLastReaction(reactionMs);
    const nextIndex = sequenceIndex + 1;
    if (nextIndex >= sequence.length) {
      setSequence(makeSequence());
      setSequenceIndex(0);
    } else {
      setSequenceIndex(nextIndex);
    }
  }

  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const progressPercent = Math.max(0, Math.min(100, (remainingMs / (duration * 1000)) * 100));

  return (
    <main className="simple-page fast-page">
      <Link href="/" className="simple-back">← Retour au tableau de bord</Link>
      <div className="eyebrow" style={{ marginTop: 28 }}>RECORDER REFLEX / MODE RÉFLEXE</div>
      <h1>Notes enchaînées</h1>
      <p className="muted">Les notes se succèdent : joue chaque note sur ta flûte, puis valide pour passer immédiatement à la suivante.</p>

      {!running && !finished && (
        <section className="panel" style={{ marginTop: 22 }}>
          <div className="panel-title-row">
            <div><div className="eyebrow">CHOISIS TON DÉFI</div><h2>Combien de temps veux-tu tenir ?</h2></div>
            <span className="focus-spark">⚡</span>
          </div>
          <div className="duration-options" style={{ marginTop: 18 }}>
            {DURATIONS.map((value) => (
              <button key={value} className="duration-option" aria-pressed={duration === value} onClick={() => setDuration(value)}>
                {value === 120 ? "2 min" : `${value} s`}
              </button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 16 }}>Do5 à Ré6 · ordre aléatoire sans répétition immédiate · doigtés allemands.</p>
          <button className="primary-button" style={{ marginTop: 20 }} onClick={begin}>Démarrer le défi <span>→</span></button>
        </section>
      )}

      {running && (
        <>
          <div className="fast-toolbar">
            <div className="fast-timer">TEMPS RESTANT <strong>{minutes}:{String(seconds).padStart(2, "0")}</strong></div>
            <div className="duration-options">
              <span className="duration-option">{played} jouées</span>
              <span className="duration-option">{skipped} passées</span>
            </div>
          </div>
          <div className="fast-progress"><i style={{ width: `${progressPercent}%` }} /></div>
          <section className="fast-stage">
            <div className="eyebrow">NOTE {played + skipped + 1} · SYSTÈME ALLEMAND</div>
            <div className="fast-note">{note.name}<sup>{note.octave}</sup></div>
            <p className="fast-instruction">Joue cette note sur ta flûte à bec soprano.</p>
            <div className="fast-controls">
              <button className="check-button" onClick={() => submitNote(true)}>✓ J&apos;ai joué cette note</button>
              <button className="skip-button" onClick={() => submitNote(false)}>Passer →</button>
            </div>
            {lastReaction !== null && <p className="fast-footnote">Dernière réaction : {(lastReaction / 1000).toFixed(2)} s</p>}
          </section>
          <div className="fast-metrics">
            <div className="fast-metric"><strong>{played}</strong><span>Notes jouées</span></div>
            <div className="fast-metric"><strong>{averageReaction ? (averageReaction / 1000).toFixed(2) + " s" : "—"}</strong><span>Réaction moyenne</span></div>
            <div className="fast-metric"><strong>{bestReaction !== null ? (bestReaction / 1000).toFixed(2) + " s" : "—"}</strong><span>Meilleure réaction</span></div>
          </div>
          <p className="fast-footnote">Le chronomètre tourne en continu. La validation est manuelle : l&apos;application ne détecte pas encore la hauteur jouée par le micro.</p>
        </>
      )}

      {finished && (
        <section className="fast-stage fast-summary" style={{ marginTop: 22 }}>
          <div className="eyebrow">DÉFI TERMINÉ</div>
          <h2>Bien joué !</h2>
          <div className="fast-note" style={{ fontSize: 64 }}>{played}</div>
          <p className="fast-instruction">notes jouées en {duration} secondes</p>
          <div className="fast-metrics">
            <div className="fast-metric"><strong>{skipped}</strong><span>Passées</span></div>
            <div className="fast-metric"><strong>{averageReaction ? (averageReaction / 1000).toFixed(2) + " s" : "—"}</strong><span>Réaction moyenne</span></div>
            <div className="fast-metric"><strong>{bestReaction !== null ? (bestReaction / 1000).toFixed(2) + " s" : "—"}</strong><span>Meilleure réaction</span></div>
          </div>
          <button className="primary-button" onClick={begin}>Recommencer <span>↻</span></button>
        </section>
      )}
    </main>
  );
}
