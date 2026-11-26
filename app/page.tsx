"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
import {
  Activity,
  ArrowRight,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Check,
  CornerDownLeft,
  House,
  ListMusic,
  Mic,
  Moon,
  Music2,
  Play,
  RotateCw,
  Square,
  Sparkles,
  Star,
  Sun,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";

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

  function stopSession() {
    // The session cleanup effect marks an unfinished session as abandoned.
    setStarted(false);
    setSessionFinished(false);
    setSessionId(null);
    setQuestionIds([]);
    setQuestionIndex(0);
    setFeedback(null);
    setAnswer(emptyFingering());
    setElapsedMs(0);
  }

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
          <Image src="/apple-touch-icon.png" alt="" width={34} height={34} className="brand-icon" />
          <span>recorder<span className="brand-accent">reflex</span></span>
        </Link>
        <div className="side-label">ESPACE DE TRAVAIL</div>
        <Link className="nav-link active" href="/"><House aria-hidden="true" /> Tableau de bord</Link>
        <Link className="nav-link" href="/fast-mode"><ListMusic aria-hidden="true" /> Notes enchaînées</Link>
        <Link className="nav-link" href="/reflex"><Zap aria-hidden="true" /> Reflex</Link>
        <Link className="nav-link" href="/mic-test"><Mic aria-hidden="true" /> Test du microphone</Link>
        <a className="nav-link" href="#training" onClick={(event) => {
          event.preventDefault();
          document.getElementById("training")?.scrollIntoView({ behavior: "smooth" });
        }}><Target aria-hidden="true" /> Entraînement</a>
        <Link className="nav-link" href="/learn"><BookOpen aria-hidden="true" /> Apprentissage</Link>
        <Link className="nav-link" href="/progress"><ChartNoAxesColumnIncreasing aria-hidden="true" /> Progression</Link>

        <div className="sidebar-bottom">
          <div className="practice-tip">
            <div className="tip-icon"><Sparkles aria-hidden="true" /></div>
            <strong>Le saviez-vous ?</strong>
            <p>Une pratique courte et régulière aide vos doigts à mémoriser chaque position.</p>
          </div>
          <button className="nav-link theme-button" onClick={() => {
            const next = !dark;
            setDark(next);
            localStorage.setItem("recorder-reflex-theme", next ? "dark" : "light");
          }}>
            {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}{dark ? "Mode clair" : "Mode sombre"}
          </button>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            {/* Mon espace <span>/</span> <b>Vue d’ensemble</b> */}
          </div>
          <div className="top-actions">
            <span className="streak"><Star aria-hidden="true" /> {stats.sessionsStarted} séries commencées</span>
            <button className="avatar rounded-full! overflow-hidden!" aria-label="Profil">
              <Image src="https://www.gravatar.com/avatar/00000000000000000000000000000000?d=retro" alt="Cover" width={40} height={40} unoptimized className="w-full h-auto" />
            </button>
          </div>
        </header>

        <div className="content">
          <section className={`welcome-row dashboard-extra${started ? " is-hidden" : ""}`} aria-hidden={started}>
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> TON ESPACE MUSICAL</div>
              <h1>Bonjour, musicien<span className="wave"><Sparkles aria-hidden="true" /></span></h1>
              <p className="muted">Chaque note te rapproche de réflexes naturels.</p>
            </div>
            <button className="primary-button" onClick={() => {
              beginSession();
              document.getElementById("training")?.scrollIntoView({ behavior: "smooth" });
            }}>
              <Play aria-hidden="true" /> {sessionFinished ? "Recommencer une série" : started ? "Nouvelle série" : "Commencer l’entraînement"} <ArrowRight className="button-arrow" aria-hidden="true" />
            </button>
          </section>

          <section className={`stats-grid dashboard-extra${started ? " is-hidden" : ""}`} aria-label="Résumé de progression" aria-hidden={started}>
            <article className="stat-card">
              <div className="stat-top"><span>PRÉCISION</span><span className="stat-icon green"><Target aria-hidden="true" /></span></div>
              <div className="stat-value">{accuracy}<small>%</small></div>
              <div className="stat-foot"><TrendingUp className="positive" aria-hidden="true" /> Sur les questions terminées</div>
              <div className="mini-bars" role="img" aria-label="Résultats des douze dernières questions">{recentResults.map((result)=><i key={result.id} className={result.correct ? "correct" : "incorrect"} title={result.correct ? "Bonne réponse" : "Réponse incorrecte"} style={{height: result.correct ? "100%" : "24%"}} />)}</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>TEMPS MOYEN · BONNES RÉPONSES</span><span className="stat-icon blue"><Timer aria-hidden="true" /></span></div>
              <div className="stat-value">{averageReaction.toFixed(2)}<small>s</small></div>
              <div className="stat-foot">Du premier affichage à la bonne réponse</div>
              <Activity className="stat-spark" aria-hidden="true" />
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>NOTES MAÎTRISÉES</span><span className="stat-icon amber"><Star aria-hidden="true" /></span></div>
              <div className="stat-value">{stats.masteredNotes}<small> / 9</small></div>
              <div className="stat-foot">Au moins 3 questions, 80 % de réussite</div>
              <div className="mastery-track"><i style={{width:`${stats.masteredNotes / 9 * 100}%`}}/></div>
            </article>
          </section>

          <section className={`dashboard-grid${started ? " session-active" : ""}`}>
            <article className="panel training-panel" id="training">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">MODE RÉFLEXE</div>
                  <h2>Note vers doigté</h2>
                  <p className="muted">Trouve la bonne position le plus vite possible.</p>
                </div>
                <div className="training-heading-actions">
                  <div className="exercise-badge"><Timer aria-hidden="true" /> <span>{started ? `${(elapsedMs / 1000).toFixed(1)} s` : "Chrono prêt"}</span></div>
                  {started && (
                    <button type="button" className="stop-session-button" onClick={stopSession} aria-label="Arrêter la série">
                      <Square aria-hidden="true" /> Arrêter
                    </button>
                  )}
                </div>
              </div>

              {sessionFinished ? (
                <div className="training-start session-summary">
                  <div className="eyebrow">SÉRIE TERMINÉE</div>
                  <h2>Bravo, musicien !</h2>
                  <div className="session-result">{sessionCorrectCount}<small> / {questionIds.length} bonnes réponses</small></div>
                  <p>{sessionAttemptCount} tentatives · {questionIds.length ? Math.round(sessionCorrectCount / questionIds.length * 100) : 0}% de précision finale</p>
                  <button className="primary-button" onClick={beginSession}>Recommencer une série <ArrowRight aria-hidden="true" /></button>
                </div>
              ) : !started ? (
                <div className="training-start">
                  <div className="recorder-mark"><Music2 aria-hidden="true" /></div>
                  <p>Une note s’affiche, puis reproduis son doigté sur la flûte interactive.</p>
                  <button className="primary-button" onClick={beginSession}>Commencer une série <ArrowRight aria-hidden="true" /></button>
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
                      <span><Check aria-hidden="true" /> Bonne position !</span>
                      <small>Réponse finale en {(lastReactionMs / 1000).toFixed(2)} s · {attemptCount} tentative(s)</small>
                      <button onClick={advanceQuestion}>Question suivante <ArrowRight aria-hidden="true" /></button>
                    </div>
                  ) : feedback === "wrong" ? (
                    <div className="feedback wrong">
                      <span><RotateCw aria-hidden="true" /> Pas tout à fait</span>
                      <small>Les trous entourés en rouge ne correspondent pas. Corrige ta position ou passe cette note.</small>
                      <div className="feedback-actions">
                        <button onClick={() => checkPosition()}>Vérifier à nouveau</button>
                        <button className="secondary-button" onClick={skipQuestion}>Passer cette note</button>
                      </div>
                    </div>
                  ) : (
                    <div className="exercise-actions">
                      <button className="check-button" onClick={() => checkPosition()}>Vérifier ma position <span><CornerDownLeft aria-hidden="true" /></span></button>
                      <button className="skip-button" onClick={skipQuestion}>Passer la note</button>
                    </div>
                  )}
                </>
              )}
            </article>

            <div className={`right-column dashboard-extra${started ? " is-hidden" : ""}`} aria-hidden={started}>
              <article className="panel focus-panel">
                <div className="panel-title-row">
                  <div><div className="eyebrow">TA PROGRESSION</div><h2>Un pas à la fois</h2></div>
                  <Sparkles className="focus-spark" aria-hidden="true" />
                </div>
                <p className="muted">Tes réponses sont sauvegardées sur cet appareil.</p>
                <div className="focus-number">{stats.questionsCompleted}<small> questions terminées</small></div>
                <div className="focus-line"><span>Précision globale</span><b>{accuracy}%</b></div>
                <div className="progress-track"><i style={{width:`${accuracy}%`}}/></div>
                <div className="session-breakdown">
                  <span><i className="session-dot completed" /> {stats.sessionsCompleted} terminées</span>
                  <span><i className="session-dot active" /> {stats.sessionsInProgress} en cours</span>
                  <span><i className="session-dot abandoned" /> {stats.sessionsAbandoned} abandonnées</span>
                </div>
                <Link href="/progress" className="text-link">Voir ma progression <ArrowRight aria-hidden="true" /></Link>
              </article>

              <article className="panel note-panel">
                <div className="panel-title-row">
                  <div><div className="eyebrow">RÉFÉRENTIEL</div><h2>Les 9 notes</h2></div>
                  <Link href="/learn" className="small-link flex flex-wrap">Explorer <ArrowRight aria-hidden="true" /></Link>
                </div>
                <div className="note-chips">
                  {NOTES.map((item) => <span key={item.id} className={masteredIds.has(item.id) ? "learned" : ""}>{item.name}<sup>{item.octave}</sup></span>)}
                </div>
                <div className="note-range"><span>C5</span><i/><span>D6</span></div>
              </article>
            </div>
          </section>

          <footer className={`footer dashboard-extra${started ? " is-hidden" : ""}`} aria-hidden={started}>
            <span>Recorder Reflex <i>•</i> Pratique ton instrument, un réflexe à la fois.</span>
            <Link href="/lab" className="flex flex-wrap">Ouvrir le laboratoire <ArrowRight aria-hidden="true" /></Link>
          </footer>
        </div>
      </section>
    </main>
  );
}
