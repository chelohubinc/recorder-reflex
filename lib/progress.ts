export type SessionStatus = "in-progress" | "completed" | "abandoned";

export interface AnswerRecord {
  id: string;
  questionId: string;
  sessionId: string | null;
  noteId: string;
  correct: boolean;
  reactionTimeMs: number;
  attemptCount: number;
  createdAt: string;
}

export interface AttemptRecord {
  id: string;
  questionId: string;
  sessionId: string | null;
  noteId: string;
  correct: boolean;
  /** Time spent since the previous submission for this question. */
  reactionTimeMs: number;
  createdAt: string;
}

export interface TrainingSession {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: SessionStatus;
  totalQuestions: number;
  completedQuestions: number;
}

export interface Progress {
  schemaVersion: 2;
  answers: AnswerRecord[];
  attempts: AttemptRecord[];
  sessions: TrainingSession[];
  /** Historical v1 counter; exact session dates/statuses were not stored. */
  legacySessionCount: number;
}

export interface NewAttempt {
  questionId: string;
  sessionId: string;
  noteId: string;
  correct: boolean;
  reactionTimeMs: number;
  createdAt: string;
}

export interface CompletedQuestion {
  questionId: string;
  sessionId: string;
  noteId: string;
  correct: boolean;
  reactionTimeMs: number;
  attemptCount: number;
  createdAt: string;
}

export const PROGRESS_STORAGE_KEY = "recorder-reflex-progress-v1";
const PROGRESS_EVENT = "recorder-reflex-progress-changed";

export function emptyProgress(): Progress {
  return { schemaVersion: 2, answers: [], attempts: [], sessions: [], legacySessionCount: 0 };
}

function createId(prefix: string): string {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeStorageRead(): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(PROGRESS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function notifyProgressChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  }
}

function persist(progress: Progress): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
      notifyProgressChanged();
    }
  } catch {
    // The current exercise remains usable when browser storage is unavailable.
  }
}

function migrateLegacyProgress(value: Record<string, unknown>): Progress {
  const legacyAnswers = Array.isArray(value.answers) ? value.answers : [];
  const answers: AnswerRecord[] = legacyAnswers.flatMap((item, index) => {
    if (!isRecord(item) || typeof item.noteId !== "string") return [];
    const createdAt = typeof item.createdAt === "string" ? item.createdAt : new Date(0).toISOString();
    const reactionTimeMs = typeof item.reactionTimeMs === "number" ? Math.max(0, item.reactionTimeMs) : 0;
    const correct = item.correct === true;
    return [{
      id: `legacy-answer-${index}`,
      questionId: `legacy-question-${index}`,
      sessionId: null,
      noteId: item.noteId,
      correct,
      reactionTimeMs,
      attemptCount: 1,
      createdAt,
    }];
  });

  const attempts: AttemptRecord[] = answers.map((answer) => ({
    id: `legacy-attempt-${answer.id}`,
    questionId: answer.questionId,
    sessionId: null,
    noteId: answer.noteId,
    correct: answer.correct,
    reactionTimeMs: answer.reactionTimeMs,
    createdAt: answer.createdAt,
  }));

  const legacySessionCount = typeof value.sessions === "number"
    ? Math.max(0, Math.floor(value.sessions))
    : 0;

  return { ...emptyProgress(), answers, attempts, legacySessionCount };
}

export function getProgress(): Progress {
  const raw = safeStorageRead();
  if (!raw) return emptyProgress();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return emptyProgress();

    if (parsed.schemaVersion === 2) {
      return {
        schemaVersion: 2,
        answers: Array.isArray(parsed.answers) ? parsed.answers as AnswerRecord[] : [],
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts as AttemptRecord[] : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions as TrainingSession[] : [],
        legacySessionCount: typeof parsed.legacySessionCount === "number" ? parsed.legacySessionCount : 0,
      };
    }

    // Preserve v1 answers and its historical session count without inventing dates.
    const migrated = migrateLegacyProgress(parsed);
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(migrated));
    } catch {
      // Migration is retried on the next read if storage is temporarily unavailable.
    }
    return migrated;
  } catch {
    return emptyProgress();
  }
}

export function startSession(totalQuestions = 10, startedAt = new Date().toISOString()): string {
  const progress = getProgress();
  const id = createId("session");
  progress.sessions.push({
    id,
    startedAt,
    completedAt: null,
    status: "in-progress",
    totalQuestions,
    completedQuestions: 0,
  });
  persist(progress);
  return id;
}

export function recordAttempt(attempt: NewAttempt): void {
  const progress = getProgress();
  progress.attempts.push({ ...attempt, id: createId("attempt") });
  progress.attempts = progress.attempts.slice(-2000);
  persist(progress);
}

export function completeQuestion(question: CompletedQuestion): void {
  const progress = getProgress();
  if (progress.answers.some((answer) => answer.questionId === question.questionId)) return;

  progress.answers.push({ ...question, id: createId("answer") });
  progress.answers = progress.answers.slice(-1000);

  const session = progress.sessions.find((item) => item.id === question.sessionId);
  if (session) {
    session.completedQuestions = Math.min(session.totalQuestions, session.completedQuestions + 1);
  }
  persist(progress);
}

export function completeSession(sessionId: string, completedAt = new Date().toISOString()): void {
  const progress = getProgress();
  const session = progress.sessions.find((item) => item.id === sessionId);
  if (!session || session.status !== "in-progress") return;
  session.status = "completed";
  session.completedAt = completedAt;
  persist(progress);
}

export function abandonSession(sessionId: string, completedAt = new Date().toISOString()): void {
  const progress = getProgress();
  const session = progress.sessions.find((item) => item.id === sessionId);
  if (!session || session.status !== "in-progress") return;
  session.status = "abandoned";
  session.completedAt = completedAt;
  persist(progress);
}

export function subscribeToProgress(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key === PROGRESS_STORAGE_KEY || event.key === null) listener();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(PROGRESS_EVENT, listener);
  window.addEventListener("focus", listener);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PROGRESS_EVENT, listener);
    window.removeEventListener("focus", listener);
  };
}
