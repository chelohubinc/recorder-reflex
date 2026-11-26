"use client";

import Link from "next/link";
import { ArrowLeft, Music2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NOTES } from "@/features/music/data/notes";
import { describePitch, detectPitch } from "@/features/audio/pitch-detection";
import "./mic-test.css";

type DetectedNote = ReturnType<typeof describePitch> & { frequency: number };

export default function MicrophoneTestPage() {
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<DetectedNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quiet, setQuiet] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const runIdRef = useRef(0);

  const stop = useCallback(() => {
    runIdRef.current++;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") void context.close();
    setListening(false);
    setNote(null);
    setQuiet(true);
  }, []);

  useEffect(() => stop, [stop]);

  async function start() {
    setError(null);
    setNote(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("L’accès au microphone n’est pas disponible dans ce navigateur. Essaie avec un navigateur récent sur localhost ou en HTTPS.");
      return;
    }

    const runId = ++runIdRef.current;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      if (runId !== runIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      context = new AudioContext();
      await context.resume();
      if (runId !== runIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        await context.close();
        return;
      }
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      streamRef.current = stream;
      contextRef.current = context;
      setListening(true);

      const analyze = () => {
        if (runId !== runIdRef.current) return;
        analyser.getFloatTimeDomainData(samples);
        const estimate = detectPitch(samples, context!.sampleRate);
        if (estimate && estimate.clarity >= 0.65) {
          setQuiet(false);
          setNote({ ...describePitch(estimate.frequency), frequency: estimate.frequency });
        } else {
          setQuiet(true);
          setNote(null);
        }
        frameRef.current = requestAnimationFrame(analyze);
      };
      analyze();
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop());
      if (context && context.state !== "closed") await context.close().catch(() => undefined);
      if (runId !== runIdRef.current) return;
      setListening(false);
      if (cause instanceof DOMException && cause.name === "NotAllowedError") {
        setError("L’accès au microphone a été refusé. Autorise le microphone dans les réglages du navigateur, puis réessaie.");
      } else if (cause instanceof DOMException && cause.name === "NotFoundError") {
        setError("Aucun microphone n’a été trouvé sur cet appareil.");
      } else {
        setError("Le microphone n’a pas pu démarrer. Vérifie qu’il n’est pas utilisé par une autre application.");
      }
    }
  }

  const isReferenceNote = note ? NOTES.some((item) => item.midi === note.midi) : false;

  return (
    <main className="simple-page mic-page">
      <Link href="/" className="simple-back"><ArrowLeft aria-hidden="true" /> Retour au tableau de bord</Link>
      <div className="eyebrow mic-eyebrow">OUTIL DE CONFIGURATION</div>
      <h1>Test du microphone</h1>
      <p className="muted mic-description">Joue une note tenue à la flûte pour vérifier la détection avant de l’utiliser dans un exercice.</p>

      <section className="mic-card" aria-live="polite">
        <div className={`mic-indicator ${listening ? "is-listening" : ""}`} aria-hidden="true"><Music2 /></div>
        <div className="mic-status">{listening ? quiet ? "Écoute en cours" : "Note détectée" : "Microphone arrêté"}</div>
        <div className="mic-note" aria-label={note ? `${note.name} ${note.octave}` : undefined}>
          {note ? <>{note.name}<sup>{note.octave}</sup></> : <span className="mic-placeholder">—</span>}
        </div>
        <div className="mic-result">
          {note ? (
            <>
              <div className="mic-frequency">{note.frequency.toFixed(1)} Hz <span>·</span> {note.cents > 0 ? "+" : ""}{note.cents} cents</div>
              <div className={`mic-range ${isReferenceNote ? "in-range" : "out-range"}`}>
                {isReferenceNote ? "Cette note fait partie des neuf notes étudiées" : "Cette note est détectée, mais n’est pas dans le référentiel Do5–Ré6"}
              </div>
            </>
          ) : <p className="mic-hint">{listening ? "Joue une note seule et tiens-la quelques instants." : "Le navigateur demandera l’autorisation au démarrage."}</p>}
        </div>
        {error && <p role="alert" className="mic-error">{error}</p>}
        <button className={`primary-button mic-button ${listening ? "stop-button" : ""}`} onClick={listening ? stop : start}>
          {listening ? "Arrêter le microphone" : "Démarrer le test"}
        </button>
      </section>

      <section className="mic-info-grid" aria-label="Conseils d’utilisation">
        <article><span>01</span><h2>Joue une note tenue</h2><p>Une note à la fois aide le détecteur à isoler sa hauteur fondamentale.</p></article>
        <article><span>02</span><h2>Regarde la justesse</h2><p>Les cents indiquent l’écart par rapport à la note tempérée la plus proche.</p></article>
        <article><span>03</span><h2>Vérifie ta plage</h2><p>Le test reconnaît la hauteur. Il ne peut pas confirmer le doigté utilisé.</p></article>
      </section>
      <p className="mic-privacy">L’analyse se fait dans ce navigateur. Aucun son n’est enregistré ni envoyé.</p>
    </main>
  );
}
