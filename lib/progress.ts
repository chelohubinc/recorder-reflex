export interface AnswerRecord { noteId: string; correct: boolean; reactionTimeMs: number; createdAt: string; }
export interface Progress { answers: AnswerRecord[]; sessions: number; }
const KEY = "recorder-reflex-progress-v1";
export function getProgress(): Progress {
  try { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) as Progress : { answers: [], sessions: 0 }; }
  catch { return { answers: [], sessions: 0 }; }
}
export function saveAnswer(answer: AnswerRecord): void {
  const previous = getProgress();
  const next = { answers: [...previous.answers, answer].slice(-500), sessions: previous.sessions };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Keep the current exercise playable if storage is unavailable. */ }
}
export function startSession(): void {
  const previous = getProgress();
  try { localStorage.setItem(KEY, JSON.stringify({ ...previous, sessions: previous.sessions + 1 })); } catch { /* Session remains usable without persistence. */ }
}
