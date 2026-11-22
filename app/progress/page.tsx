"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NOTES } from "@/features/music/data/notes";
import { getProgress, type Progress } from "@/lib/progress";

export default function ProgressPage() {
  const [progress,setProgress]=useState<Progress>({answers:[],sessions:0});
  useEffect(()=>{const frame=requestAnimationFrame(()=>setProgress(getProgress()));return ()=>cancelAnimationFrame(frame)},[]);
  const good=progress.answers.filter(a=>a.correct).length;
  const accuracy=progress.answers.length?Math.round(good/progress.answers.length*100):0;
  const average=progress.answers.length?Math.round(progress.answers.reduce((s,a)=>s+a.reactionTimeMs,0)/progress.answers.length):0;
  return <main className="simple-page"><Link href="/" className="simple-back">← Retour au tableau de bord</Link><div className="eyebrow" style={{marginTop:28}}>TES STATISTIQUES</div><h1>Ta progression</h1><p className="muted">Tes performances sont enregistrées localement sur cet appareil.</p><section className="stats-grid" style={{marginTop:22}}><article className="stat-card"><div className="stat-top">PRÉCISION</div><div className="stat-value">{accuracy}<small>%</small></div><div className="stat-foot">{good} bonnes réponses sur {progress.answers.length}</div></article><article className="stat-card"><div className="stat-top">RÉACTION MOYENNE</div><div className="stat-value">{(average/1000).toFixed(2)}<small>s</small></div><div className="stat-foot">Sur toutes les réponses</div></article><article className="stat-card"><div className="stat-top">SESSIONS</div><div className="stat-value">{progress.sessions}</div><div className="stat-foot">Séries commencées</div></article></section><section className="panel"><h2>Résultats par note</h2><div className="note-list">{NOTES.map(note=>{const records=progress.answers.filter(a=>a.noteId===note.id);const rate=records.length?Math.round(records.filter(a=>a.correct).length/records.length*100):0;return <article key={note.id}><h3>{note.name}<sup>{note.octave}</sup></h3><p>{records.length} tentatives · {rate}% de précision</p><div className="progress-track"><i style={{width:`${rate}%`}}/></div></article>})}</div></section></main>;
}
