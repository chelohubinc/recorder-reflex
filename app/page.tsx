"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NOTES } from "@/features/music/data/notes";
import { Fingering, halfHolesFor } from "@/features/music/types/fingering";
import { RecorderDiagram } from "@/components/recorder/RecorderDiagram";
import { getProgress, saveAnswer, startSession, type Progress } from "@/lib/progress";

const emptyFingering = (): Fingering => ({ id: "answer", system: "german", thumb: "open", front: ["open","open","open","open","open","open","open"] });

export default function Home() {
  const [dark, setDark] = useState(false);
  const [started, setStarted] = useState(false);
  const [answer, setAnswer] = useState<Fingering>(emptyFingering());
  const [noteIndex, setNoteIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [lastReaction, setLastReaction] = useState(0);
  const [progress, setProgress] = useState<Progress>({ answers: [], sessions: 0 });
  const [elapsed, setElapsed] = useState(0);
  const note = NOTES[noteIndex % NOTES.length];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setProgress(getProgress()));
    const savedTheme = localStorage.getItem("recorder-reflex-theme");
    window.requestAnimationFrame(() => setDark(savedTheme === "dark"));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    if (!started || feedback) return;
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 50);
    return () => window.clearInterval(timer);
  }, [started, feedback, startedAt]);

  const accuracy = progress.answers.length ? Math.round(progress.answers.filter((item) => item.correct).length / progress.answers.length * 100) : 0;
  const average = progress.answers.length ? Math.round(progress.answers.reduce((sum, item) => sum + item.reactionTimeMs, 0) / progress.answers.length / 10) / 100 : 0;
  const mastered = useMemo(() => NOTES.filter((n) => {
    const attempts = progress.answers.filter((a) => a.noteId === n.id);
    return attempts.length >= 3 && attempts.filter((a) => a.correct).length / attempts.length >= .8;
  }).length, [progress]);

  function begin() {
    startSession(); setProgress(getProgress());
    setStarted(true); setFeedback(null); setAnswer(emptyFingering()); setNoteIndex(Math.floor(Math.random() * NOTES.length)); setElapsed(0); setStartedAt(Date.now());
  }
  function checkAnswer() {
    const correct = answer.thumb === note.fingering.thumb && answer.front.every((hole, i) => hole === note.fingering.front[i]);
    const reactionTimeMs = Math.max(0, Date.now() - startedAt);
    setLastReaction(reactionTimeMs);
    saveAnswer({ noteId: note.id, correct, reactionTimeMs, createdAt: new Date().toISOString() });
    setProgress(getProgress()); setFeedback(correct ? "correct" : "wrong");
  }
  function next() {
    let nextIndex = Math.floor(Math.random() * NOTES.length);
    if (NOTES.length > 1 && nextIndex === noteIndex) nextIndex = (nextIndex + 1) % NOTES.length;
    setNoteIndex(nextIndex); setAnswer(emptyFingering()); setFeedback(null); setStartedAt(Date.now()); setElapsed(0);
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-icon">♫</span><span>recorder<span className="brand-accent">reflex</span></span></Link>
      <div className="side-label">ESPACE DE TRAVAIL</div>
      <a className="nav-link active" href="#home"><span>⌂</span> Tableau de bord</a>
      <a className="nav-link" href="#training" onClick={(e) => { e.preventDefault(); document.getElementById("training")?.scrollIntoView({ behavior: "smooth" }); }}><span>◉</span> Entraînement</a>
      <Link className="nav-link" href="/learn"><span>▤</span> Apprentissage</Link>
      <Link className="nav-link" href="/progress"><span>▥</span> Progression</Link>
      <div className="sidebar-bottom"><div className="practice-tip"><div className="tip-icon">✦</div><strong>Le saviez-vous ?</strong><p>Une pratique courte et régulière aide vos doigts à mémoriser chaque position.</p></div><button className="nav-link theme-button" onClick={() => { const next = !dark; setDark(next); localStorage.setItem("recorder-reflex-theme", next ? "dark" : "light"); }}><span>{dark ? "☼" : "☾"}</span>{dark ? "Mode clair" : "Mode sombre"}</button></div>
    </aside>

    <section className="main-area" id="home">
      <header className="topbar"><div className="breadcrumb">Mon espace <span>/</span> <b>Vue d’ensemble</b></div><div className="top-actions"><span className="streak"><span>✦</span> {progress.sessions} session{progress.sessions === 1 ? "" : "s"}</span><button className="avatar" aria-label="Profil">A</button></div></header>
      <div className="content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> TON ESPACE MUSICAL</div><h1>Bonjour, musicien<span className="wave">✦</span></h1><p className="muted">Chaque note te rapproche de réflexes naturels.</p></div><button className="primary-button" onClick={() => { begin(); document.getElementById("training")?.scrollIntoView({ behavior: "smooth" }); }}><span>▶</span> Reprendre l’entraînement <span className="button-arrow">→</span></button></section>

        <section className="stats-grid" aria-label="Résumé de progression">
          <article className="stat-card"><div className="stat-top"><span>PRÉCISION</span><span className="stat-icon green">◎</span></div><div className="stat-value">{accuracy}<small>%</small></div><div className="stat-foot"><span className="positive">↑</span> Sur tes réponses enregistrées</div><div className="mini-bars">{[35,52,43,64,49,75,58,85,68,100,74,88].map((v,i)=><i key={i} style={{height:`${v}%`}}/>)}</div></article>
          <article className="stat-card"><div className="stat-top"><span>TEMPS DE RÉACTION</span><span className="stat-icon blue">◷</span></div><div className="stat-value">{average}<small>s</small></div><div className="stat-foot">Moyenne de tes réponses</div><div className="stat-spark">⌁</div></article>
          <article className="stat-card"><div className="stat-top"><span>NOTES MAÎTRISÉES</span><span className="stat-icon amber">✦</span></div><div className="stat-value">{mastered}<small> / 9</small></div><div className="stat-foot">Continue à pratiquer pour progresser</div><div className="mastery-track"><i style={{width:`${mastered / 9 * 100}%`}}/></div></article>
        </section>

        <section className="dashboard-grid">
          <article className="panel training-panel" id="training"><div className="panel-heading"><div><div className="eyebrow">MODE RÉFLEXE</div><h2>Note vers doigté</h2><p className="muted">Trouve la bonne position le plus vite possible.</p></div><div className="exercise-badge">⏱ <span>{started ? `${(elapsed / 1000).toFixed(1)} s` : "Chrono prêt"}</span></div></div>
            {!started ? <div className="training-start"><div className="recorder-mark">🪈</div><p>Une note s’affiche, puis reproduis son doigté sur la flûte interactive.</p><button className="primary-button" onClick={begin}>Commencer une série <span>→</span></button></div> : <>
              <div className="question-card"><div className="question-meta">NOTE {String(noteIndex + 1).padStart(2,"0")} <span>•</span> SYSTÈME ALLEMAND</div><div className="note-name">{note.name}<sup>{note.octave}</sup></div><div className="question-prompt">Reproduis son doigté sur la flûte</div></div>
              <RecorderDiagram value={answer} onChange={setAnswer} interactive={!feedback} expected={feedback === "wrong" ? note.fingering : undefined} halfAllowed={halfHolesFor(note.fingering)} />
              {feedback ? <div className={`feedback ${feedback}`}><span>{feedback === "correct" ? "✓ Bien joué !" : "↻ Pas tout à fait"}</span><small>{feedback === "correct" ? `Réponse en ${(lastReaction/1000).toFixed(2)} s` : "Observe les trous en surbrillance et réessaie."}</small><button onClick={next}>Note suivante →</button></div> : <button className="check-button" onClick={checkAnswer}>Vérifier ma position <span>↵</span></button>}
            </>}
          </article>
          <div className="right-column"><article className="panel focus-panel"><div className="panel-title-row"><div><div className="eyebrow">TA PROGRESSION</div><h2>Un pas à la fois</h2></div><span className="focus-spark">✧</span></div><p className="muted">Tes réponses sont sauvegardées sur cet appareil.</p><div className="focus-number">{progress.answers.length}<small> réponses</small></div><div className="focus-line"><span>Précision globale</span><b>{accuracy}%</b></div><div className="progress-track"><i style={{width:`${accuracy}%`}}/></div><Link href="/progress" className="text-link">Voir ma progression <span>→</span></Link></article>
            <article className="panel note-panel"><div className="panel-title-row"><div><div className="eyebrow">RÉFÉRENTIEL</div><h2>Les 9 notes</h2></div><Link href="/learn" className="small-link">Explorer →</Link></div><div className="note-chips">{NOTES.map(n=><span key={n.id} className={progress.answers.some(a=>a.noteId===n.id&&a.correct)?"learned":""}>{n.name}<sup>{n.octave}</sup></span>)}</div><div className="note-range"><span>C5</span><i/><span>D6</span></div></article></div>
        </section>
        <footer className="footer"><span>Recorder Reflex <i>•</i> Pratique ton instrument, un réflexe à la fois.</span><Link href="/lab">Ouvrir le laboratoire ↗</Link></footer>
      </div>
    </section>
  </main>;
}
