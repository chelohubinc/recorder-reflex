import { describe, expect, it } from "vitest";
import { NOTES } from "@/features/music/data/notes";
import { emptyProgress } from "@/lib/progress";
import { calculateProgressStatistics } from "./statistics";

describe("calculateProgressStatistics", () => {
  it("separates completed-question accuracy from attempt timing", () => {
    const progress = emptyProgress();
    progress.answers = [
      { id: "a1", questionId: "q1", sessionId: "s1", noteId: "C5", correct: true, reactionTimeMs: 1200, attemptCount: 2, createdAt: "2026-01-01T00:00:00Z" },
      { id: "a2", questionId: "q2", sessionId: "s1", noteId: "D5", correct: false, reactionTimeMs: 2600, attemptCount: 1, createdAt: "2026-01-01T00:00:01Z" },
    ];
    progress.attempts = [
      { id: "t1", questionId: "q1", sessionId: "s1", noteId: "C5", correct: false, reactionTimeMs: 700, createdAt: "2026-01-01T00:00:00Z" },
      { id: "t2", questionId: "q1", sessionId: "s1", noteId: "C5", correct: true, reactionTimeMs: 500, createdAt: "2026-01-01T00:00:01Z" },
    ];
    progress.sessions = [
      { id: "s1", startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:00:03Z", status: "completed", totalQuestions: 10, completedQuestions: 2 },
    ];

    const stats = calculateProgressStatistics(progress, NOTES);
    expect(stats.accuracy).toBe(50);
    expect(stats.averageQuestionReactionMs).toBe(1900);
    expect(stats.averageCorrectReactionMs).toBe(1200);
    expect(stats.averageAttemptReactionMs).toBe(600);
    expect(stats.sessionsStarted).toBe(1);
    expect(stats.sessionsCompleted).toBe(1);
  });

  it("preserves historical sessions separately from new session statuses", () => {
    const progress = emptyProgress();
    progress.legacySessionCount = 7;
    expect(calculateProgressStatistics(progress, NOTES).sessionsStarted).toBe(7);
    expect(calculateProgressStatistics(progress, NOTES).sessionsCompleted).toBe(0);
  });
});
