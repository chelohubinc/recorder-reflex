import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeQuestion,
  completeSession,
  getProgress,
  PROGRESS_STORAGE_KEY,
  recordAttempt,
  startSession,
} from "./progress";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const storage = new MemoryStorage();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", storage);
});

describe("progress persistence", () => {
  it("migrates v1 answers and session count without discarding history", () => {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      answers: [{ noteId: "C5", correct: true, reactionTimeMs: 1500, createdAt: "2026-01-01T00:00:00Z" }],
      sessions: 7,
    }));

    const progress = getProgress();
    expect(progress.schemaVersion).toBe(2);
    expect(progress.answers).toHaveLength(1);
    expect(progress.answers[0].noteId).toBe("C5");
    expect(progress.legacySessionCount).toBe(7);
    expect(progress.sessions).toHaveLength(0);
  });

  it("associates each attempt and completed question with a session", () => {
    const sessionId = startSession(10, "2026-01-01T00:00:00Z");
    recordAttempt({
      sessionId, questionId: "q1", noteId: "C5", correct: false,
      reactionTimeMs: 900, createdAt: "2026-01-01T00:00:01Z",
    });
    recordAttempt({
      sessionId, questionId: "q1", noteId: "C5", correct: true,
      reactionTimeMs: 400, createdAt: "2026-01-01T00:00:02Z",
    });
    completeQuestion({
      sessionId, questionId: "q1", noteId: "C5", correct: true,
      reactionTimeMs: 1300, attemptCount: 2, createdAt: "2026-01-01T00:00:02Z",
    });
    completeQuestion({
      sessionId, questionId: "q1", noteId: "C5", correct: true,
      reactionTimeMs: 1300, attemptCount: 2, createdAt: "2026-01-01T00:00:02Z",
    });
    completeSession(sessionId, "2026-01-01T00:00:03Z");

    const progress = getProgress();
    expect(progress.attempts).toHaveLength(2);
    expect(progress.answers).toHaveLength(1);
    expect(progress.answers[0].attemptCount).toBe(2);
    expect(progress.answers[0].sessionId).toBe(sessionId);
    expect(progress.sessions[0].completedQuestions).toBe(1);
    expect(progress.sessions[0].status).toBe("completed");
  });
});
