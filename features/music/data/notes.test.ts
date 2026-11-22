import { describe, expect, it } from "vitest";
import { NOTES } from "./notes";
import { frequencyFromMidi, type Fingering, type HoleState } from "../types/fingering";

const expected: Array<[string, HoleState, number[]]> = [
  ["C5", "closed", [1,2,3,4,5,6,7]],
  ["D5", "closed", [1,2,3,4,5,6]],
  ["E5", "closed", [1,2,3,4,5]],
  ["F5", "closed", [1,2,3,4]],
  ["G5", "closed", [1,2,3]],
  ["A5", "closed", [1,2]],
  ["B5", "closed", [1]],
  ["C6", "half", [1,4,5]],
  ["D6", "half", [1,3,4,6,7]],
];

function closedHoles(fingering: Fingering): number[] {
  return fingering.front.flatMap((state, index) => state === "closed" ? [index + 1] : []);
}

describe("German soprano reference", () => {
  it("contains exactly the nine natural notes from C5 through D6", () => {
    expect(NOTES.map((note) => note.id)).toEqual(expected.map(([id]) => id));
    expect(new Set(NOTES.map((note) => note.id)).size).toBe(9);
  });

  it.each(expected)("defines %s with the charted thumb and front holes", (id, thumb, closed) => {
    const note = NOTES.find((entry) => entry.id === id);
    expect(note).toBeDefined();
    expect(note!.fingering.system).toBe("german");
    expect(note!.fingering.id).toBe(`german-${id}`);
    expect(note!.fingering.thumb).toBe(thumb);
    expect(closedHoles(note!.fingering)).toEqual(closed);
    expect(note!.fingering.front.every((state) => state === "open" || state === "closed")).toBe(true);
    expect(note!.fingering.front).toHaveLength(7);
    expect(note!.fingering.front.every((state) => ["open", "closed", "half"].includes(state))).toBe(true);
    expect(note!.midi).toBe(expectedMidi[id]);
    expect(note!.frequency).toBeCloseTo(frequencyFromMidi(note!.midi), 8);
    expect(note!.fingeringSource).toContain("Yamaha");
  });

  it("has a defined fingering for every exercise note", () => {
    expect(NOTES.every((note) => note.fingering && note.fingering.front.length === 7)).toBe(true);
  });
});

const expectedMidi: Record<string, number> = { C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83, C6: 84, D6: 86 };
