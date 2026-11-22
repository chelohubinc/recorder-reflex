import { describe, expect, it } from "vitest";
import {
  areFingeringsEqual,
  frequencyFromMidi,
  halfHolesFor,
  nextHoleState,
  type Fingering,
  type HoleState,
} from "./fingering";

const sample: Fingering = {
  id: "sample",
  system: "german",
  thumb: "closed",
  front: ["open", "closed", "half", "open", "closed", "open", "open"],
};

describe("fingering model", () => {
  it("supports exactly the three hole states", () => {
    const states: HoleState[] = ["open", "closed", "half"];
    expect(states).toHaveLength(3);
    expect(new Set(states).size).toBe(3);
    expect(sample.front).toContain("half");
  });

  it("compares the thumb and all seven front holes", () => {
    expect(areFingeringsEqual(sample, { ...sample, id: "other" })).toBe(true);
    expect(areFingeringsEqual(sample, { ...sample, thumb: "half" })).toBe(false);
    expect(areFingeringsEqual(sample, { ...sample, front: ["open", "closed", "closed", "open", "closed", "open", "open"] })).toBe(false);
  });

  it("only cycles through half when that hole is allowed", () => {
    expect(nextHoleState("open", false)).toBe("closed");
    expect(nextHoleState("closed", false)).toBe("open");
    expect(nextHoleState("closed", true)).toBe("half");
    expect(nextHoleState("half", true)).toBe("open");
  });

  it("derives half-hole interaction targets from the fingering", () => {
    expect(halfHolesFor(sample)).toEqual([2]);
    expect(halfHolesFor({ ...sample, thumb: "half" })).toEqual(["thumb", 2]);
  });

  it("calculates equal-tempered MIDI frequencies", () => {
    expect(frequencyFromMidi(69)).toBe(440);
    expect(frequencyFromMidi(72)).toBeCloseTo(523.251, 2);
  });
});
