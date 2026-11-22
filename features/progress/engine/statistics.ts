import type { MusicalNote } from "@/features/music/types/fingering";
import type { Progress } from "@/lib/progress";

export interface NoteStatistics {
  noteId: string;
  questions: number;
  correct: number;
  accuracy: number;
  mastered: boolean;
}

export interface ProgressStatistics {
  questionsCompleted: number;
  correctQuestions: number;
  accuracy: number;
  totalAttempts: number;
  averageQuestionReactionMs: number;
  averageCorrectReactionMs: number;
  averageAttemptReactionMs: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  sessionsInProgress: number;
  masteredNotes: number;
  notes: NoteStatistics[];
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function calculateProgressStatistics(progress: Progress, notes: readonly MusicalNote[]): ProgressStatistics {
  const correctAnswers = progress.answers.filter((answer) => answer.correct);
  const noteStatistics = notes.map((note) => {
    const answers = progress.answers.filter((answer) => answer.noteId === note.id);
    const correct = answers.filter((answer) => answer.correct).length;
    const accuracy = answers.length ? Math.round((correct / answers.length) * 100) : 0;
    return {
      noteId: note.id,
      questions: answers.length,
      correct,
      accuracy,
      mastered: answers.length >= 3 && correct / answers.length >= 0.8,
    };
  });

  return {
    questionsCompleted: progress.answers.length,
    correctQuestions: correctAnswers.length,
    accuracy: progress.answers.length ? Math.round((correctAnswers.length / progress.answers.length) * 100) : 0,
    totalAttempts: progress.attempts.length,
    averageQuestionReactionMs: Math.round(average(progress.answers.map((answer) => answer.reactionTimeMs))),
    averageCorrectReactionMs: Math.round(average(correctAnswers.map((answer) => answer.reactionTimeMs))),
    averageAttemptReactionMs: Math.round(average(progress.attempts.map((attempt) => attempt.reactionTimeMs))),
    sessionsStarted: progress.legacySessionCount + progress.sessions.length,
    sessionsCompleted: progress.sessions.filter((session) => session.status === "completed").length,
    sessionsInProgress: progress.sessions.filter((session) => session.status === "in-progress").length,
    masteredNotes: noteStatistics.filter((note) => note.mastered).length,
    notes: noteStatistics,
  };
}
