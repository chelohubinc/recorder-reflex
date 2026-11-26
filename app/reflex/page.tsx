"use client";

import Link from "next/link";
import "../fast-mode/fast-mode.css";
import { ArrowLeft, ArrowRight, RotateCw, Zap } from "lucide-react";
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

export default function ReflexPage(){
    const [duration, setDuration] = useState<Duration>(60);
    const [noteDuration, setNoteDuration] = useState<NoteDuration>(4);
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);
    const [sequence, setSequence] = useState<string[]>([]);
    const [sequenceIndex, setSequenceIndex] = useState(0);
    const [remainingMs, setRemainingMs] = useState(60_000);
    const [remainingNoteMs, setRemainingNoteMs] = useState(4_000);
    const [played, setPlayed] = useState(0);
    const startedAt = useRef<number | null>(null);
    const noteStartedAt = useRef<number | null>(null);
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
        if (running) noteStartedAt.current = monotonicNow();
    }, [running, sequenceIndex]);

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
                setPlayed((count) => count + 1);
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
    
    function begin(){
        setSequence(makeSequence());
        setSequenceIndex(0);
        setPlayed(0);
        setRemainingMs(duration * 1000);
        setRemainingNoteMs(noteDuration * 1000);
        ended.current = false;
        startedAt.current = monotonicNow();
        noteStartedAt.current = monotonicNow();
        setFinished(false);
        setRunning(true);
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
            <p className="muted">Les notes se succèdent : joue chaque note sur ta flûte.</p>

            {!running && !finished && (
                <section className="panel" style={{ marginTop: 22 }}>
                    <div className="panel-title-row">
                        <div>
                            <div className="eyebrow">CHOISIS TON DÉFI</div>
                            <h2>Combien de temps veux-tu tenir ?</h2>
                        </div>
                        <Zap className="focus-spark" aria-hidden="true" />
                    </div>

                    <div className="duration-options" style={{ marginTop: 18 }}>
                        {DURATIONS.map((value) => (
                            <button key={value} className="duration-option" aria-pressed={duration === value} onClick={() => setDuration(value)}>
                                {value === 120 ? "2 min" : `${value} s`}
                            </button>
                        ))}
                    </div>

                    <div className="panel-title-row">
                        <div>
                            <h2 className="bg-emerald-100! text-emerald-700! rounded-md px-1">Combien de seconde par note ?</h2>
                        </div>
                    </div>

                    <div className="duration-options" style={{ marginTop: 18 }}>
                        {NOTE_DURATIONS.map((value) => (
                            <button key={value} className="duration-option" aria-pressed={noteDuration === value} onClick={() => setNoteDuration(value)}>
                                {`${value} s`}
                            </button>
                        ))}
                    </div>
                    
                    <p className="muted" style={{ marginTop: 16 }}>Do5 à Ré6 · ordre aléatoire sans répétition immédiate · doigtés allemands.</p>
                    <button className="primary-button" style={{ marginTop: 20 }} onClick={begin}>Démarrer le défi <ArrowRight aria-hidden="true" /></button>
                </section>
            )}

            {running && (
                <>
                    <div className="fast-toolbar">
                        <div className="fast-timer">TEMPS RESTANT <strong>{minutes}:{String(seconds).padStart(2, "0")}</strong></div>
                        <div className="duration-options">
                            <span className="duration-option">{played} jouées</span>
                        </div>
                    </div>

                    <div className="fast-progress"><i style={{ width: `${progressPercent}%` }} /></div>

                    <section className="fast-stage">
                        <div className="fast-progress"><i style={{ width: `${progressPercentNote}%` }} /></div>

                        <div className="eyebrow">NOTE {played + 1} · SYSTÈME ALLEMAND</div>
                        <div className="fast-note">{note.name}<sup>{note.octave}</sup></div>
                        <p className="fast-instruction">Joue cette note sur ta flûte à bec soprano.</p>
                    </section>

                    <p className="fast-footnote">Le chronomètre tourne en continu. L&apos;application ne détecte pas encore la hauteur jouée par le micro.</p>
                </>
            )}

            {finished && (
                <section className="fast-stage fast-summary" style={{ marginTop: 22 }}>
                    <div className="eyebrow">DÉFI TERMINÉ</div>
                    <h2>Bien joué !</h2>
                    <div className="fast-note" style={{ fontSize: 64 }}>{played}</div>
                    <p className="fast-instruction">notes jouées en {duration} secondes</p>
                    <button className="primary-button" onClick={begin}>Recommencer <RotateCw aria-hidden="true" /></button>
                </section>
            )}
        </main>
    )
}
