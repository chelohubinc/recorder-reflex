"use client";

import Link from "next/link";
import { NOTES } from "@/features/music/data/notes";
import { calculateProgressStatistics } from "@/features/progress/engine/statistics";
import { useProgressSnapshot } from "@/lib/useProgress";

export default function ProgressPage() {
  const progress = useProgressSnapshot();
  const stats = calculateProgressStatistics(progress, NOTES);

  return (
    <main className="simple-page">
      <Link href="/" className="simple-back">← Retour au tableau de bord</Link>
      <div className="eyebrow" style={{ marginTop: 28 }}>TES STATISTIQUES</div>
      <h1>Ta progression</h1>
      <p className="muted">Tes performances sont enregistrées localement sur cet appareil.</p>

      <section className="stats-grid" style={{ marginTop: 22 }}>
        <article className="stat-card">
          <div className="stat-top">PRÉCISION</div>
          <div className="stat-value">{stats.accuracy}<small>%</small></div>
          <div className="stat-foot">{stats.correctQuestions} bonnes réponses sur {stats.questionsCompleted} questions terminées</div>
        </article>
        <article className="stat-card">
          <div className="stat-top">RÉACTION MOYENNE · BONNES RÉPONSES</div>
          <div className="stat-value">{(stats.averageCorrectReactionMs / 1000).toFixed(2)}<small>s</small></div>
          <div className="stat-foot">Du premier affichage à la bonne réponse</div>
        </article>
        <article className="stat-card">
          <div className="stat-top">SÉRIES TERMINÉES</div>
          <div className="stat-value">{stats.sessionsCompleted}</div>
          <div className="stat-foot">{stats.sessionsStarted} séries commencées au total</div>
        </article>
      </section>

      <section className="panel">
        <h2>Résultats par note</h2>
        <div className="note-list">
          {stats.notes.map((item) => {
            const note = NOTES.find((entry) => entry.id === item.noteId)!;
            return (
              <article key={item.noteId}>
                <h3>{note.name}<sup>{note.octave}</sup></h3>
                <p>{item.questions} questions · {item.correct} réussites · {item.accuracy}% de précision</p>
                <div className="progress-track"><i style={{ width: `${item.accuracy}%` }} /></div>
                <p>{item.mastered ? "Note maîtrisée" : "À continuer de travailler"}</p>
              </article>
            );
          })}
        </div>
        <div className="statistics-extra">
          <p><strong>{stats.totalAttempts}</strong> tentatives enregistrées, y compris les essais incorrects avant correction.</p>
          <p>Temps moyen par tentative : <strong>{(stats.averageAttemptReactionMs / 1000).toFixed(2)} s</strong>.</p>
          <p>Temps moyen de toutes les questions terminées : <strong>{(stats.averageQuestionReactionMs / 1000).toFixed(2)} s</strong>.</p>
        </div>
      </section>
    </main>
  );
}
