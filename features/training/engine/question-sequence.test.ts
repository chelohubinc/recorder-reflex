import { describe, expect, it } from "vitest";
import { generateQuestionSequence } from "./question-sequence";

describe("generateQuestionSequence", () => {
  it("returns the requested number of notes", () => {
    expect(generateQuestionSequence(["C5", "D5", "E5"], 10)).toHaveLength(10);
  });

  it("does not repeat adjacent notes when more than one note is available", () => {
    const sequence = generateQuestionSequence(["C5", "D5", "E5"], 30, () => 0);
    for (let index = 1; index < sequence.length; index += 1) {
      expect(sequence[index]).not.toBe(sequence[index - 1]);
    }
  });

  it("supports a single-note exercise", () => {
    expect(generateQuestionSequence(["C5"], 3)).toEqual(["C5", "C5", "C5"]);
  });

  it("rejects empty note lists and invalid lengths", () => {
    expect(() => generateQuestionSequence([], 5)).toThrow();
    expect(() => generateQuestionSequence(["C5"], 0)).toThrow();
  });
});
