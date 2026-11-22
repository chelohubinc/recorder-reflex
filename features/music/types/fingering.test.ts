import { describe, expect, it } from "vitest";
import {
  areFingeringsEqual,
  frequencyFromMidi,
  halfHolesFor,
  nextHoleState,
  type Fingering,
} from "./fingering";

const sample: Fingering = {
  id: "sample",
  system: "german",
  thumb: "closed",
  front: ["open", "closed", "half", "open", "closed", "open", "open"],
};

describe("fingering model", () => {
  it("compares the thumb and all seven front holes", () => {
    expect(areFingeringsEqual(sample, { ...sample, id: "other" })).toBe(true);
    expect(areFingeringsEqual(sample, { ...sample, thumb: "half" })).toBe(false);
    expect(areFingeringsEqual(sample, {
      ...sample,
      front: ["open", "closed", "closed", "open", "closed", "open", "open"],
    })).toBe(false);
  });

  it("cycles through three states only when half is allowed", () => {
    expect(nextHoleState("open", false)).toBe("closed");
    expect(nextHoleState("closed", false)).toBe("open");
    expect(nextHoleState("closed", true)).toBe("half");
    expect(nextHoleState("half", true)).toBe("open");
  });

  it("returns every half-covered hole, including the rear thumb", () => {
    expect(halfHolesFor(sample)).toEqual([2]);
    expect(halfHolesFor({ ...sample, thumb: "half" })).toEqual(["thumb", 2]);
  });

  it("calculates equal-tempered MIDI frequencies", () => {
    expect(frequencyFromMidi(69)).toBe(440);
    expect(frequencyFromMidi(72)).toBeCloseTo(523.251, 2);
  });
});
