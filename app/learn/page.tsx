"use client";

import Link from "next/link";
import { NOTES } from "@/features/music/data/notes";
import { RecorderDiagram } from "@/components/recorder/RecorderDiagram";

export default function LearnPage() {
  return (
    <main className="simple-page">
      <Link href="/" className="simple-back">← Retour au tableau de bord</Link>
      <div className="eyebrow" style={{ marginTop: 28 }}>APPRENTISSAGE GUIDÉ</div>
      <h1>Les notes de ta flûte</h1>
      <p className="muted">Explore les doigtés du système allemand, de Do5 à Ré6.</p>
      <section className="panel">
        <div className="note-list">
          {NOTES.map((note) => (
            <article key={note.id}>
              <h3>{note.name}<sup>{note.octave}</sup></h3>
              <p>{note.internationalName} · {note.frequency.toFixed(1)} Hz</p>
              <RecorderDiagram
                value={note.fingering}
                onChange={() => undefined}
                interactive={false}
              />
              <p>Difficulté {note.difficulty} / 4</p>
              <p className="source-note">
                Référence : {note.fingeringSources.map((source) => source.label).join(" · ")}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
