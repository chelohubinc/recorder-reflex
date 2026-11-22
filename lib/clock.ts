/** Monotonic browser clock for elapsed-time measurements. Call from effects or event handlers only. */
export function monotonicNow(): number {
  return performance.now();
}
