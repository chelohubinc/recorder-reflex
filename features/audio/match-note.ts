/**
 * A note is accepted only when its nearest semitone is the target and it is
 * sufficiently close to equal temperament. Cents are measured from that semitone.
 */
export function isMatchingRecorderNote(
  detectedMidi: number,
  cents: number,
  targetMidi: number,
  toleranceCents = 45,
): boolean {
  return Number.isInteger(detectedMidi) &&
    Number.isInteger(targetMidi) &&
    Number.isFinite(cents) &&
    Number.isFinite(toleranceCents) &&
    toleranceCents >= 0 &&
    detectedMidi === targetMidi &&
    Math.abs(cents) <= toleranceCents;
}
