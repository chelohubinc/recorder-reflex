import type { Fingering, HoleState, MusicalNote } from "../types/fingering";
import { frequencyFromMidi } from "../types/fingering";

export const GERMAN_SOPRANO_FINGERING_SOURCE = {
  label: "Yamaha — Soprano recorder fingering chart (German-style)",
  url: "https://www.yamaha.com/en/musical_instrument_guide/recorder/play/play002.html",
} as const;

// The upper-register fingerings use the German soprano chart's C/D second-octave positions.
// Front-hole numbers are 1–7 from the mouthpiece down; arrays store those numbers minus one.
const finger = (id: string, thumb: HoleState, closed: number[]): Fingering => ({
  id, system: "german", thumb,
  front: [1, 2, 3, 4, 5, 6, 7].map((hole) => closed.includes(hole) ? "closed" : "open") as Fingering["front"],
});

const definitions = [
  { id: "C5", name: "Do", octave: 5, midi: 72, difficulty: 1, fingering: finger("german-C5", "closed", [1,2,3,4,5,6,7]) },
  { id: "D5", name: "Ré", octave: 5, midi: 74, difficulty: 1, fingering: finger("german-D5", "closed", [1,2,3,4,5,6]) },
  { id: "E5", name: "Mi", octave: 5, midi: 76, difficulty: 1, fingering: finger("german-E5", "closed", [1,2,3,4,5]) },
  { id: "F5", name: "Fa", octave: 5, midi: 77, difficulty: 2, fingering: finger("german-F5", "closed", [1,2,3,4]) },
  { id: "G5", name: "Sol", octave: 5, midi: 79, difficulty: 2, fingering: finger("german-G5", "closed", [1,2,3]) },
  { id: "A5", name: "La", octave: 5, midi: 81, difficulty: 2, fingering: finger("german-A5", "closed", [1,2]) },
  { id: "B5", name: "Si", octave: 5, midi: 83, difficulty: 3, fingering: finger("german-B5", "closed", [1]) },
  { id: "C6", name: "Do", octave: 6, midi: 84, difficulty: 3, fingering: finger("german-C6", "half", [1,4,5]) },
  { id: "D6", name: "Ré", octave: 6, midi: 86, difficulty: 4, fingering: finger("german-D6", "half", [1,3,4,6,7]) },
] as const;

export const NOTES: MusicalNote[] = definitions.map((note) => ({
  ...note,
  internationalName: note.id,
  frequency: frequencyFromMidi(note.midi),
  fingeringSource: GERMAN_SOPRANO_FINGERING_SOURCE.label,
}));
export function getNoteById(id: string): MusicalNote | undefined { return NOTES.find((note) => note.id === id); }
