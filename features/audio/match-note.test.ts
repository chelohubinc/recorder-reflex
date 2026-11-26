import { describe, expect, it } from "vitest";
import { isMatchingRecorderNote } from "./match-note";

describe("isMatchingRecorderNote", () => {
  it("accepts the target note inside the cents tolerance", () => {
    expect(isMatchingRecorderNote(72, 12, 72)).toBe(true);
    expect(isMatchingRecorderNote(72, -44, 72)).toBe(true);
  });

  it("rejects the wrong semitone and an out-of-tune target", () => {
    expect(isMatchingRecorderNote(74, 0, 72)).toBe(false);
    expect(isMatchingRecorderNote(72, 46, 72)).toBe(false);
    expect(isMatchingRecorderNote(72, -46, 72)).toBe(false);
  });

  it("rejects invalid values", () => {
    expect(isMatchingRecorderNote(Number.NaN, 0, 72)).toBe(false);
    expect(isMatchingRecorderNote(72, Number.NaN, 72)).toBe(false);
    expect(isMatchingRecorderNote(72, 0, 72, -1)).toBe(false);
  });
});
