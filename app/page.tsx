"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { NOTES } from "@/features/music/data/notes";
import { type Fingering } from "@/features/music/types/fingering";
import { evaluateFingering } from "@/features/training/engine/evaluate-fingering";
import { generateQuestionSequence } from "@/features/training/engine/question-sequence";
import { calculateProgressStatistics } from "@/features/progress/engine/statistics";
import { useProgressSnapshot } from "@/lib/useProgress";
import {
  abandonSession,
  completeQuestion,
  completeSession,
  recordAttempt,
  startSession,
} from "@/lib/progress";
import { RecorderDiagram } from "@/components/recorder/RecorderDiagram";
import { monotonicNow } from "@/lib/clock";

const QUESTIONS_PER_SESSION = 10;

const emptyFingering = (): Fingering => ({
  id: "answer",
  system: "german",
  thumb: "open",
  front: ["open", "open", "open", "open", "open", "open", "open"],
});

export default function Home() {
  const progress = useProgressSnapshot();
  const stats = useMemo(() => calculateProgressStatistics(progress, NOTES), [progress]);
  const [dark, setDark] = useState(false);
  const [started, setStarted] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionKey, setQuestionKey] = useState(0);
  const [answer, setAnswer] = useState<Fingering>(emptyFingering);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastReactionMs, setLastReactionMs] = useState(0);
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);
  const [sessionAttemptCount, setSessionAttemptCount] = useState(0);

  const questionStartedAt = useRef<number | null>(null);
  const lastAttemptAt = useRef<number | null>(null);
  const questionFinalized = useRef(false);

  const currentNoteId = questionIds[questionIndex];
  const note = NOTES.find((item) => item.id === currentNoteId) ?? NOTES[0];

  useEffect(() => {
    const savedTheme = localStorage.getItem("recorder-reflex-theme");
    const frame = window.requestAnimationFrame(() => setDark(savedTheme === "dark"));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  // The timer starts after the question has been committed to the screen.
  useEffect(() => {
    if (!started || !currentNoteId) return;

    const now = monotonicNow();
    questionStartedAt.current = now;
    lastAttemptAt.current = now;
    questionFinalized.current = false;

    const timer = window.setInterval(() => {
      if (!questionFinalized.current && questionStartedAt.current !== null) {
        setElapsedMs(monotonicNow() - questionStartedAt.current);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [started, questionKey, currentNoteId]);

  // A session that is left before completion is explicitly marked as abandoned.
  useEffect(() => {
    if (!started || !sessionId) return;
    return () => abandonSession(sessionId);
  }, [started, sessionId]);

  const masteredIds = useMemo(
    () => new Set(stats.notes.filter((item) => item.mastered).map((item) => item.noteId)),
    [stats.notes],
  );

  function beginSession() {
    if (started && sessionId) abandonSession(sessionId);

    const ids = generateQuestionSequence(NOTES.map((item) => item.id), QUESTIONS_PER_SESSION);
    const id = startSession(QUESTIONS_PER_SESSION);

    setSessionId(id);
    setQuestionIds(ids);
    setQuestionIndex(0);
    setQuestionKey((key) => key + 1);
    setAnswer(emptyFingering());
    setFeedback(null);
    setAttemptCount(0);
    setElapsedMs(0);
    setSessionCorrectCount(0);
    setSessionAttemptCount(0);
    setSessionFinished(false);
    setStarted(true);
  }

  function finalizeQuestion(correct: boolean, reactionTimeMs: number, finalAttemptCount: number) {
    if (questionFinalized.current || !sessionId || !currentNoteId) return;

    questionFinalized.current = true;
    completeQuestion({
      sessionId,
      questionId: `${sessionId}-q-${questionIndex + 1}`,
      noteId: currentNoteId,
      correct,
      reactionTimeMs: Math.round(reactionTimeMs),
      attemptCount: finalAttemptCount,
      createdAt: new Date().toISOString(),
    });

    if (correct) setSessionCorrectCount((count) => count + 1);
  }

  function checkPosition(candidate: Fingering = answer) {
    if (questionFinalized.current || !sessionId || questionStartedAt.current === null) return;

    const now = monotonicNow();
    const evaluation = evaluateFingering(candidate, note.fingering);
    const attemptDuration = Math.max(0, now - (lastAttemptAt.current ?? questionStartedAt.current));
    const totalReaction = Math.max(0, now - questionStartedAt.current);
    const nextAttempt = attemptCount + 1;

    recordAttempt({
      sessionId,
      questionId: `${sessionId}-q-${questionIndex + 1}`,
      noteId: note.id,
      correct: evaluation.correct,
      reactionTimeMs: Math.round(attemptDuration),
      createdAt: new Date().toISOString(),
    });

    lastAttemptAt.current = now;
    setAttemptCount(nextAttempt);
    setSessionAttemptCount((count) => count + 1);
    setLastReactionMs(totalReaction);

    if (evaluation.correct) {
      finalizeQuestion(true, totalReaction, nextAttempt);
      setFeedback("correct");
    } else {
      setFeedback("wrong");
    }
  }

  function handleAnswerChange(nextAnswer: Fingering) {
    if (feedback === "correct" || questionFinalized.current) return;
    setAnswer(nextAnswer);

    // Reaching the exact fingering validates the answer immediately.
    if (evaluateFingering(nextAnswer, note.fingering).correct) {
      checkPosition(nextAnswer);
    }
  }

  function advanceQuestion() {
    const nextIndex = questionIndex + 1;

    if (nextIndex >= questionIds.length) {
      if (sessionId) completeSession(sessionId);
      setStarted(false);
      setSessionFinished(true);
      setFeedback(null);
      return;
    }

    setQuestionIndex(nextIndex);
    setQuestionKey((key) => key + 1);
    setAnswer(emptyFingering());
    setAttemptCount(0);
    setFeedback(null);
    setElapsedMs(0);
  }

  function skipQuestion() {
    if (feedback === "correct" || questionFinalized.current || questionStartedAt.current === null) return;

    const reactionTime = Math.max(0, monotonicNow() - questionStartedAt.current);
    finalizeQuestion(false, reactionTime, attemptCount);
    advanceQuestion();
  }

  const accuracy = stats.accuracy;
  const averageReaction = stats.averageCorrectReactionMs / 1000;
  const recentResults = progress.answers.slice(-12);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">♫</span>
          <span>recorder<span className="brand-accent">reflex</span></span>
        </Link>
        <div className="side-label">ESPACE DE TRAVAIL</div>
        <Link className="nav-link active" href="/"><span>⌂</span> Tableau de bord</Link>
        <a className="nav-link" href="#training" onClick={(event) => {
          event.preventDefault();
          document.getElementById("training")?.scrollIntoView({ behavior: "smooth" });
        }}><span>◉</span> Entraînement</a>
        <Link className="nav-link" href="/learn"><span>▤</span> Apprentissage</Link>
        <Link className="nav-link" href="/progress"><span>▥</span> Progression</Link>

        <div className="sidebar-bottom">
          <div className="practice-tip">
            <div className="tip-icon">✦</div>
            <strong>Le saviez-vous ?</strong>
            <p>Une pratique courte et régulière aide vos doigts à mémoriser chaque position.</p>
          </div>
          <button className="nav-link theme-button" onClick={() => {
            const next = !dark;
            setDark(next);
            localStorage.setItem("recorder-reflex-theme", next ? "dark" : "light");
          }}>
            <span>{dark ? "☼" : "☾"}</span>{dark ? "Mode clair" : "Mode sombre"}
          </button>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Mon espace <span>/</span> <b>Vue d’ensemble</b></div>
          <div className="top-actions">
            <span className="streak"><span>✦</span> {stats.sessionsStarted} séries commencées</span>
            <button className="avatar" aria-label="Profil">A</button>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> TON ESPACE MUSICAL</div>
              <h1>Bonjour, musicien<span className="wave">✦</span></h1>
              <p className="muted">Chaque note te rapproche de réflexes naturels.</p>
            </div>
            <button className="primary-button" onClick={() => {
              beginSession();
              document.getElementById("training")?.scrollIntoView({ behavior: "smooth" });
            }}>
              <span>▶</span> {sessionFinished ? "Recommencer une série" : started ? "Nouvelle série" : "Commencer l’entraînement"} <span className="button-arrow">→</span>
            </button>
          </section>

          <section className="stats-grid" aria-label="Résumé de progression">
            <article className="stat-card">
              <div className="stat-top"><span>PRÉCISION</span><span className="stat-icon green">◎</span></div>
              <div className="stat-value">{accuracy}<small>%</small></div>
              <div className="stat-foot"><span className="positive">↑</span> Sur les questions terminées</div>
              <div className="mini-bars" role="img" aria-label="Résultats des douze dernières questions">{recentResults.map((result,index)=><i key={result.id} className={result.correct ? "correct" : "incorrect"} title={result.correct ? "Bonne réponse" : "Réponse incorrecte"} style={{height: result.correct ? "100%" : "24%"}} />)}</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>TEMPS MOYEN · BONNES RÉPONSES</span><span className="stat-icon blue">◷</span></div>
              <div className="stat-value">{averageReaction.toFixed(2)}<small>s</small></div>
              <div className="stat-foot">Du premier affichage à la bonne réponse</div>
              <div className="stat-spark">⌁</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>SÉRIES TERMINÉES</span><span className="stat-icon amber">✦</span></div>
              <div className="stat-value">{stats.sessionsCompleted}</div>
              <div className="stat-foot">{stats.sessionsInProgress} en cours · {stats.sessionsAbandoned} abandonnées</div>
              <div className="mastery-track"><i style={{width:`${stats.sessionsStarted ? stats.sessionsCompleted / stats.sessionsStarted * 100 : 0}%`}}/></div>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="panel training-panel" id="training">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">MODE RÉFLEXE</div>
                  <h2>Note vers doigté</h2>
                  <p className="muted">Trouve la bonne position le plus vite possible.</p>
                </div>
                <div className="exercise-badge">⏱ <span>{started ? `${(elapsedMs / 1000).toFixed(1)} s` : "Chrono prêt"}</span></div>
              </div>

              {sessionFinished ? (
                <div className="training-start session-summary">
                  <div className="eyebrow">SÉRIE TERMINÉE</div>
                  <h2>Bravo, musicien !</h2>
                  <div className="session-result">{sessionCorrectCount}<small> / {questionIds.length} bonnes réponses</small></div>
                  <p>{sessionAttemptCount} tentatives · {questionIds.length ? Math.round(sessionCorrectCount / questionIds.length * 100) : 0}% de précision finale</p>
                  <button className="primary-button" onClick={beginSession}>Recommencer une série <span>→</span></button>
                </div>
              ) : !started ? (
                <div className="training-start">
                  <div className="recorder-mark">🪈</div>
                  <p>Une note s’affiche, puis reproduis son doigté sur la flûte interactive.</p>
                  <button className="primary-button" onClick={beginSession}>Commencer une série <span>→</span></button>
                  <small className="muted">{QUESTIONS_PER_SESSION} questions par série · les notes ne se répètent pas deux fois de suite.</small>
                </div>
              ) : (
                <>
                  <div className="question-card">
                    <div className="question-meta">QUESTION {String(questionIndex + 1).padStart(2,"0")} / {questionIds.length} <span>•</span> SYSTÈME ALLEMAND</div>
                    <div className="note-name">{note.name}<sup>{note.octave}</sup></div>
                    <div className="question-prompt">Reproduis son doigté sur la flûte</div>
                  </div>

                  <RecorderDiagram
                    value={answer}
                    onChange={handleAnswerChange}
                    interactive={feedback !== "correct"}
                    expected={feedback === "wrong" ? note.fingering : undefined}
                  />

                  {feedback === "correct" ? (
                    <div className="feedback correct">
                      <span>✓ Bonne position !</span>
                      <small>Réponse finale en {(lastReactionMs / 1000).toFixed(2)} s · {attemptCount} tentative(s)</small>
                      <button onClick={advanceQuestion}>Question suivante →</button>
                    </div>
                  ) : feedback === "wrong" ? (
                    <div className="feedback wrong">
                      <span>↻ Pas tout à fait</span>
                      <small>Les trous entourés en rouge ne correspondent pas. Corrige ta position ou passe cette note.</small>
                      <div className="feedback-actions">
                        <button onClick={() => checkPosition()}>Vérifier à nouveau</button>
                        <button className="secondary-button" onClick={skipQuestion}>Passer cette note</button>
                      </div>
                    </div>
                  ) : (
                    <div className="exercise-actions">
                      <button className="check-button" onClick={() => checkPosition()}>Vérifier ma position <span>↵</span></button>
                      <button className="skip-button" onClick={skipQuestion}>Passer la note</button>
                    </div>
                  )}
                </>
              )}
            </article>

            <div className="right-column">
              <article className="panel focus-panel">
                <div className="panel-title-row">
                  <div><div className="eyebrow">TA PROGRESSION</div><h2>Un pas à la fois</h2></div>
                  <span className="focus-spark">✧</span>
                </div>
                <p className="muted">Tes réponses sont sauvegardées sur cet appareil.</p>
                <div className="focus-number">{stats.questionsCompleted}<small> questions terminées</small></div>
                <div className="focus-line"><span>Précision globale</span><b>{accuracy}%</b></div>
                <div className="progress-track"><i style={{width:`${accuracy}%`}}/></div>
                <Link href="/progress" className="text-link">Voir ma progression <span>→</span></Link>
              </article>

              <article className="panel note-panel">
                <div className="panel-title-row">
                  <div><div className="eyebrow">RÉFÉRENTIEL</div><h2>Les 9 notes</h2></div>
                  <Link href="/learn" className="small-link">Explorer →</Link>
                </div>
                <div className="note-chips">
                  {NOTES.map((item) => <span key={item.id} className={masteredIds.has(item.id) ? "learned" : ""}>{item.name}<sup>{item.octave}</sup></span>)}
                </div>
                <div className="note-range"><span>C5</span><i/><span>D6</span></div>
              </article>
            </div>
          </section>

          <footer className="footer">
            <span>Recorder Reflex <i>•</i> Pratique ton instrument, un réflexe à la fois.</span>
            <Link href="/lab">Ouvrir le laboratoire ↗</Link>
          </footer>
        </div>
      </section>
    </main>
  );
}
