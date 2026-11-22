/**
 * Build a reproducible sequence when an injected random source is provided.
 * Consecutive questions never repeat the same note when at least two notes exist.
 */
export function generateQuestionSequence(
  noteIds: readonly string[],
  count = 10,
  random: () => number = Math.random,
): string[] {
  if (noteIds.length === 0) throw new Error("At least one note is required.");
  if (!Number.isInteger(count) || count < 1) throw new Error("Question count must be a positive integer.");

  const sequence: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const previous = sequence[index - 1];
    const pool = noteIds.length > 1 && previous
      ? noteIds.filter((noteId) => noteId !== previous)
      : [...noteIds];
    const value = random();
    const randomIndex = Math.min(pool.length - 1, Math.max(0, Math.floor(value * pool.length)));
    sequence.push(pool[randomIndex]);
  }

  return sequence;
}
