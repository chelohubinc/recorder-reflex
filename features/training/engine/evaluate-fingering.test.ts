import { describe, expect, it } from "vitest";
import { NOTES } from "@/features/music/data/notes";
import { evaluateFingering } from "./evaluate-fingering";

describe("evaluateFingering", () => {
  it("reports a wrong attempt and accepts a corrected fingering", () => {
    const expected = NOTES.find((note) => note.id === "G5")!.fingering;
    const wrong = {
      ...expected,
      front: ["closed", "closed", "open", "open", "open", "open", "open"] as typeof expected.front,
    };

    const first = evaluateFingering(wrong, expected);
    expect(first.correct).toBe(false);
    expect(first.mismatchedHoles).toContain(2);

    const corrected = evaluateFingering(expected, expected);
    expect(corrected.correct).toBe(true);
    expect(corrected.mismatchedHoles).toEqual([]);
  });

  it("compares the rear thumb independently from the seven front holes", () => {
    const expected = NOTES.find((note) => note.id === "C6")!.fingering;
    const candidate = { ...expected, thumb: "closed" as const };
    expect(evaluateFingering(candidate, expected).mismatchedHoles).toEqual(["thumb"]);
  });
});
