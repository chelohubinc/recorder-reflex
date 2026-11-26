"use client";

import { useEffect } from "react";
import {
  nextHoleState,
  type Fingering,
  type HoleState,
  type HoleTarget,
} from "@/features/music/types/fingering";

interface RecorderDiagramProps {
  value: Fingering;
  onChange: (value: Fingering) => void;
  interactive?: boolean;
  expected?: Fingering;
}

const stateLabel = (state: HoleState) =>
  state === "closed" ? "fermé" : state === "half" ? "à moitié couvert" : "ouvert";

export function RecorderDiagram({
  value,
  onChange,
  interactive = true,
  expected,
}: RecorderDiagramProps) {
  function setHole(target: HoleTarget, state: HoleState) {
    if (!interactive) return;

    if (target === "thumb") {
      onChange({ ...value, thumb: state });
      return;
    }

    const front = [...value.front] as Fingering["front"];
    front[target] = state;
    onChange({ ...value, front });
  }

  // Keyboard shortcuts mirror mouse interaction: open -> closed -> half -> open.
  useEffect(() => {
    if (!interactive) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        target.closest("input, textarea, select, [contenteditable='true']")
      )) return;

      const digit = event.code.startsWith("Numpad")
        ? event.code.slice("Numpad".length)
        : event.key;
      const holeNumber = Number(digit);
      if (!Number.isInteger(holeNumber) || holeNumber < 1 || holeNumber > 7) return;

      event.preventDefault();
      const index = holeNumber - 1;
      const next = nextHoleState(value.front[index], true);
      const front = [...value.front] as Fingering["front"];
      front[index] = next;
      onChange({ ...value, front });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [interactive, onChange, value]);

  function renderHole(
    state: HoleState,
    target: HoleTarget,
    label: string,
    expectedState?: HoleState,
  ) {
    const mismatch = expectedState !== undefined && expectedState !== state;
    const match = expectedState !== undefined && expectedState === state;
    const feedbackClass = mismatch ? " hole-wrong" : match ? " hole-right" : "";
    const nextState = nextHoleState(state, true);

    return (
      <button
        key={String(target)}
        type="button"
        disabled={!interactive}
        aria-label={`${label}, ${stateLabel(state)}${interactive ? ", modifier" : ""}`}
        aria-pressed={state !== "open"}
        title={`${label} : ${stateLabel(state)}`}
        onClick={() => setHole(target, nextState)}
        className={`recorder-hole ${state}${feedbackClass}${interactive ? " clickable" : ""}`}
      >
        <span className="sr-only">{label}</span>
      </button>
    );
  }

  return (
    <div className="recorder-wrap">
      <div className="diagram-face-labels" aria-hidden="true">
        <span>FACE ARRIÈRE · POUCE</span>
        <span>FACE AVANT</span>
      </div>
      <div className="recorder-visual" role="group" aria-label="Schéma de la flûte à bec">
        <div className="recorder-body" aria-hidden="true" />
        <div className="thumb-rail">
          {renderHole(value.thumb, "thumb", "Trou arrière du pouce", expected?.thumb)}
        </div>
        <div className="front-rail">
          {value.front.map((state, index) => (
            <div className="front-hole-row" key={index}>
              {renderHole(state, index as HoleTarget, `Trou frontal ${index + 1}`, expected?.front[index])}
              <span>{index + 1}</span>
            </div>
          ))}
        </div>
        <div className="recorder-bell" aria-hidden="true" />
      </div>
      <div className="hole-legend" aria-label="Légende des trous">
        <span><i className="legend-dot closed" /> Couvert</span>
        <span><i className="legend-dot open" /> Ouvert</span>
        <span><i className="legend-dot half" /> À moitié</span>
      </div>
      {interactive && <p className="diagram-hint">Touchez un trou ou utilisez les touches 1 à 7 (clavier numérique inclus) pour changer son état : couvert → à moitié → ouvert.</p>}
    </div>
  );
}
