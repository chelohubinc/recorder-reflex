import { describe, expect, it } from "vitest";
import { describePitch, detectPitch } from "./pitch-detection";

function sine(frequency: number, sampleRate = 48_000, length = 4096): Float32Array {
  return Float32Array.from(
    { length },
    (_, index) => 0.25 * Math.sin((2 * Math.PI * frequency * index) / sampleRate),
  );
}

describe("detectPitch", () => {
  it.each([
    ["C5", 523.251],
    ["D5", 587.330],
    ["A5", 880],
    ["C6", 1046.502],
    ["D6", 1174.659],
  ])("detects %s from a clean sine wave", (_name, frequency) => {
    const result = detectPitch(sine(frequency), 48_000);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBeCloseTo(frequency, 0);
    expect(result!.clarity).toBeGreaterThan(0.9);
  });

  it("returns null for silence", () => {
    expect(detectPitch(new Float32Array(4096), 48_000)).toBeNull();
  });

  it("rejects invalid sample rates and invalid options", () => {
    expect(detectPitch(sine(440), 0)).toBeNull();
    expect(detectPitch(sine(440), Number.NaN)).toBeNull();
    expect(detectPitch(sine(440), 48_000, { minHz: 900, maxHz: 500 })).toBeNull();
  });

  it("rejects frequencies outside the configured recorder range", () => {
    expect(detectPitch(sine(220), 48_000)).toBeNull();
  });
});

describe("describePitch", () => {
  it("maps A4 to MIDI 69 with no cents offset", () => {
    expect(describePitch(440)).toEqual({
      midi: 69,
      name: "La",
      octave: 4,
      cents: 0,
    });
  });

  it("rejects non-positive and non-finite frequencies", () => {
    expect(() => describePitch(0)).toThrow(RangeError);
    expect(() => describePitch(Number.NaN)).toThrow(RangeError);
  });
});
