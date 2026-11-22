"use client";

import { useState } from "react";
import Link from "next/link";
import { RecorderDiagram } from "@/components/recorder/RecorderDiagram";
import type { Fingering } from "@/features/music/types/fingering";

const initial: Fingering = {
  id: "lab",
  system: "german",
  thumb: "open",
  front: ["open", "open", "open", "open", "open", "open", "open"],
};
export default function LabPage() {
  const [fingering, setFingering] = useState(initial);
  const coveredCount = [fingering.thumb, ...fingering.front].filter((state) => state !== "open").length;

  return (
    <main className="simple-page">
      <Link href="/" className="simple-back">← Retour à Recorder Reflex</Link>
      <div className="eyebrow" style={{ marginTop: 28 }}>RECORDER REFLEX / LAB</div>
      <h1>Flûte interactive</h1>
      <p className="muted">Clique sur les trous pour passer entre ouvert, couvert et demi-couvert.</p>
      <section className="panel" style={{ maxWidth: 480, marginTop: 20 }}>
        <RecorderDiagram value={fingering} onChange={setFingering} />
        <div className="focus-line" style={{ marginTop: 18 }}>
          <span>Trous couverts ou partiellement couverts</span>
          <b>{coveredCount} / 8</b>
        </div>
        <button className="check-button" onClick={() => setFingering(initial)}>Réinitialiser <span>↻</span></button>
      </section>
    </main>
  );
}
