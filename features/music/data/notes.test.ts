import { describe, expect, it } from "vitest";
import { NOTES, FINGERING_REFERENCES } from "./notes";
import { frequencyFromMidi, type Fingering, type HoleState } from "../types/fingering";

/**
 * Independent reference fixture transcribed from the published charts.
 * Hole numbers are front holes 1–7, top to bottom. "0" is the rear thumb.
 * The exercise's octave labels use scientific pitch notation (C5 = MIDI 72).
 */
const expected: Array<{ id: string; thumb: HoleState; closed: number[]; half?: number[] }> = [
  { id: "C5", thumb: "closed", closed: [1, 2, 3, 4, 5, 6, 7] },
  { id: "D5", thumb: "closed", closed: [1, 2, 3, 4, 5, 6] },
  { id: "E5", thumb: "closed", closed: [1, 2, 3, 4, 5] },
  { id: "F5", thumb: "closed", closed: [1, 2, 3, 4] },
  { id: "G5", thumb: "closed", closed: [1, 2, 3] },
  { id: "A5", thumb: "closed", closed: [1, 2] },
  { id: "B5", thumb: "closed", closed: [1] },
  { id: "C6", thumb: "half", closed: [1, 4, 5] },
  { id: "D6", thumb: "half", closed: [1, 3, 4, 6] },
];

function closedFrontHoles(fingering: Fingering): number[] {
  return fingering.front.flatMap((state, index) => state === "closed" ? [index + 1] : []);
}

function halfFrontHoles(fingering: Fingering): number[] {
  return fingering.front.flatMap((state, index) => state === "half" ? [index + 1] : []);
}

describe("German soprano reference", () => {
  it("contains exactly the nine natural notes from C5 through D6", () => {
    expect(NOTES.map((note) => note.id)).toEqual(expected.map((note) => note.id));
    expect(new Set(NOTES.map((note) => note.id)).size).toBe(9);
  });

  it.each(expected)("defines $id with its documented hole positions", (fixture) => {
    const note = NOTES.find((entry) => entry.id === fixture.id);
    expect(note).toBeDefined();
    expect(note!.fingering.system).toBe("german");
    expect(note!.fingering.thumb).toBe(fixture.thumb);
    expect(closedFrontHoles(note!.fingering)).toEqual(fixture.closed);
    expect(halfFrontHoles(note!.fingering)).toEqual(fixture.half ?? []);
    expect(note!.fingering.front).toHaveLength(7);
    expect(note!.midi).toBe(expectedMidi[fixture.id]);
    expect(note!.frequency).toBeCloseTo(frequencyFromMidi(note!.midi), 8);
    expect(note!.fingeringSources.length).toBeGreaterThan(0);
    expect(note!.fingeringSources.every((source) => source.url.startsWith("https://"))).toBe(true);
  });

  it("documents the specific German chart and the upper-register cross-check", () => {
    expect(FINGERING_REFERENCES.yamahaGerman.url).toContain("fingering_german.pdf");
    expect(FINGERING_REFERENCES.woodwindGuide.url).toContain("rec_bas_3.html");
  });

  it("has a defined seven-hole fingering for every exercise note", () => {
    expect(NOTES.every((note) => note.fingering && note.fingering.front.length === 7)).toBe(true);
  });
});

const expectedMidi: Record<string, number> = {
  C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83, C6: 84, D6: 86,
};
