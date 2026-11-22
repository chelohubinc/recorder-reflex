import type { Fingering, HoleState, MusicalNote, FingeringReference } from "../types/fingering";
import { frequencyFromMidi } from "../types/fingering";

export const FINGERING_REFERENCES = {
  yamahaGerman: {
    id: "yamaha-german-soprano",
    label: "Yamaha — Soprano recorder (German) fingering chart",
    url: "https://www.yamaha.com/en/musical_instrument_guide/common/images/recorder/fingering_german.pdf",
  },
  woodwindGuide: {
    id: "woodwind-guide-third-octave",
    label: "The Woodwind Fingering Guide — Recorder, third octave",
    url: "https://www.wfg.woodwind.org/recorder/rec_bas_3.html",
    note: "The chart identifies C6 as thumb partially open with front holes 1, 4 and 5; D6 as thumb partially open with front holes 1, 3, 4 and 6.",
  },
} satisfies Record<string, FingeringReference>;

function createFingering(
  id: string,
  thumb: HoleState,
  closedFrontHoles: number[],
  halfFrontHoles: number[] = [],
): Fingering {
  const front = [1, 2, 3, 4, 5, 6, 7].map((hole) => {
    if (halfFrontHoles.includes(hole)) return "half";
    return closedFrontHoles.includes(hole) ? "closed" : "open";
  }) as Fingering["front"];

  return { id: `german-${id}`, system: "german", thumb, front };
}

type NoteDefinition = {
  id: string;
  name: string;
  octave: number;
  midi: number;
  difficulty: 1 | 2 | 3 | 4;
  fingering: Fingering;
  fingeringSources: FingeringReference[];
};

const yamaha = FINGERING_REFERENCES.yamahaGerman;
const upperRegister = [yamaha, FINGERING_REFERENCES.woodwindGuide];

const definitions: NoteDefinition[] = [
  { id: "C5", name: "Do", octave: 5, midi: 72, difficulty: 1, fingering: createFingering("C5", "closed", [1, 2, 3, 4, 5, 6, 7]), fingeringSources: [yamaha] },
  { id: "D5", name: "Ré", octave: 5, midi: 74, difficulty: 1, fingering: createFingering("D5", "closed", [1, 2, 3, 4, 5, 6]), fingeringSources: [yamaha] },
  { id: "E5", name: "Mi", octave: 5, midi: 76, difficulty: 1, fingering: createFingering("E5", "closed", [1, 2, 3, 4, 5]), fingeringSources: [yamaha] },
  { id: "F5", name: "Fa", octave: 5, midi: 77, difficulty: 2, fingering: createFingering("F5", "closed", [1, 2, 3, 4]), fingeringSources: [yamaha] },
  { id: "G5", name: "Sol", octave: 5, midi: 79, difficulty: 2, fingering: createFingering("G5", "closed", [1, 2, 3]), fingeringSources: [yamaha] },
  { id: "A5", name: "La", octave: 5, midi: 81, difficulty: 2, fingering: createFingering("A5", "closed", [1, 2]), fingeringSources: [yamaha] },
  { id: "B5", name: "Si", octave: 5, midi: 83, difficulty: 3, fingering: createFingering("B5", "closed", [1]), fingeringSources: [yamaha] },
  { id: "C6", name: "Do", octave: 6, midi: 84, difficulty: 3, fingering: createFingering("C6", "half", [1, 4, 5]), fingeringSources: upperRegister },
  { id: "D6", name: "Ré", octave: 6, midi: 86, difficulty: 4, fingering: createFingering("D6", "half", [1, 3, 4, 6]), fingeringSources: upperRegister },
];

export const NOTES: MusicalNote[] = definitions.map((note) => ({
  ...note,
  internationalName: note.id,
  frequency: frequencyFromMidi(note.midi),
}));

export function getNoteById(id: string): MusicalNote | undefined {
  return NOTES.find((note) => note.id === id);
}
