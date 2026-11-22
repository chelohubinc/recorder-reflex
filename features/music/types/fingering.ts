export type FingeringSystem = "german";
export type HoleState = "open" | "closed" | "half";
export type FrontHoleIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type HoleTarget = "thumb" | FrontHoleIndex;

export interface Fingering {
  id: string;
  system: FingeringSystem;
  /** Thumb hole on the rear face of the recorder. */
  thumb: HoleState;
  /** Seven front holes, numbered 1–7 from top to bottom. */
  front: [HoleState, HoleState, HoleState, HoleState, HoleState, HoleState, HoleState];
}

export interface FingeringReference {
  id: string;
  label: string;
  url: string;
  note?: string;
}

export interface MusicalNote {
  id: string;
  name: string;
  internationalName: string;
  octave: number;
  midi: number;
  frequency: number;
  fingering: Fingering;
  fingeringSources: FingeringReference[];
  difficulty: 1 | 2 | 3 | 4;
}

export function frequencyFromMidi(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function areFingeringsEqual(a: Fingering, b: Fingering): boolean {
  return a.thumb === b.thumb && a.front.every((hole, index) => hole === b.front[index]);
}

export function halfHolesFor(fingering: Fingering): HoleTarget[] {
  const result: HoleTarget[] = [];
  if (fingering.thumb === "half") result.push("thumb");
  fingering.front.forEach((state, index) => {
    if (state === "half") result.push(index as FrontHoleIndex);
  });
  return result;
}

/** Cycle open → closed → half → open, omitting half where it is not allowed. */
export function nextHoleState(state: HoleState, allowHalf: boolean): HoleState {
  if (state === "open") return "closed";
  if (state === "closed") return allowHalf ? "half" : "open";
  return "open";
}
