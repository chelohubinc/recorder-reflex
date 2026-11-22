"use client";

import { nextHoleState, type Fingering, type HoleState, type HoleTarget } from "@/features/music/types/fingering";

interface Props { value: Fingering; onChange: (value: Fingering) => void; interactive?: boolean; expected?: Fingering; halfAllowed?: readonly HoleTarget[]; }
const stateLabel = (state: HoleState) => state === "closed" ? "fermé" : state === "half" ? "à moitié couvert" : "ouvert";

export function RecorderDiagram({ value, onChange, interactive = true, expected, halfAllowed = ["thumb"] }: Props) {
  function setHole(target: HoleTarget, state: HoleState) {
    if (!interactive) return;
    if (target === "thumb") onChange({ ...value, thumb: state });
    else { const front = [...value.front] as Fingering["front"]; front[target] = state; onChange({ ...value, front }); }
  }
  function hole(state: HoleState, target: HoleTarget, label: string, expectedState?: HoleState) {
    const feedback = expectedState && expectedState !== state ? " hole-wrong" : expectedState ? " hole-right" : "";
    const cycle = nextHoleState(state, halfAllowed.includes(target));
    return <button key={String(target)} type="button" disabled={!interactive} aria-label={`${label}, ${stateLabel(state)}${interactive ? ", modifier" : ""}`} title={`${label}: ${stateLabel(state)}`} onClick={() => setHole(target, cycle)} className={`recorder-hole ${state}${feedback}${interactive ? " clickable" : ""}`}><span className="sr-only">{label}</span></button>;
  }
  return <div className="recorder-wrap"><div className="recorder-visual" role="group" aria-label="Schéma interactif du doigté">
    <div className="recorder-body"/><div className="thumb-rail"><span className="hole-caption">FACE ARRIÈRE · POUCE</span>{hole(value.thumb,"thumb","Trou arrière du pouce",expected?.thumb)}</div>
    <div className="front-rail"><span className="hole-caption face-front-label">FACE AVANT</span>{value.front.map((state,index)=><div className="front-hole-row" key={index}>{hole(state,index as HoleTarget,`Trou frontal ${index+1}`,expected?.front[index])}<span>{index+1}</span></div>)}</div>
    <div className="recorder-bell"/>
  </div><div className="hole-legend"><span><i className="legend-dot closed"/> Couvert</span><span><i className="legend-dot open"/> Ouvert</span><span><i className="legend-dot half"/> À moitié</span></div>{interactive && <p className="diagram-hint">Touchez un trou pour changer son état.</p>}</div>;
}
