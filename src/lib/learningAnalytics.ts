type EventType =
  | 'visit'
  | 'game_started'
  | 'level_started'
  | 'answer'
  | 'level_result'
  | 'victory';

interface LearningEventPayload {
  eventType: EventType;
  studentName?: string;
  levelId?: number;
  levelName?: string;
  questionId?: number;
  selectedAnswer?: number;
  correct?: boolean;
  timeTaken?: number;
  score?: number;
  lives?: number;
  correctCount?: number;
  totalQuestions?: number;
  passed?: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

const SESSION_KEY = 'aidatabase_learning_session_id';
const configuredApiBaseUrl = import.meta.env.VITE_LEARNING_API_BASE_URL;

export const learningApiBaseUrl =
  configuredApiBaseUrl === undefined
    ? '/learning-api'
    : configuredApiBaseUrl.replace(/\/$/, '');

export function learningApiUrl(path: string) {
  if (!learningApiBaseUrl) return null;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${learningApiBaseUrl}${normalizedPath}`;
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getLearningSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = createSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export async function trackLearningEvent(payload: LearningEventPayload) {
  const eventsUrl = learningApiUrl('/events');
  if (!eventsUrl) return;

  try {
    await fetch(eventsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: payload.eventType,
        session_id: getLearningSessionId(),
        student_name: payload.studentName?.trim() || null,
        level_id: payload.levelId ?? null,
        level_name: payload.levelName ?? null,
        question_id: payload.questionId ?? null,
        selected_answer: payload.selectedAnswer ?? null,
        correct: payload.correct ?? null,
        time_taken: payload.timeTaken ?? null,
        score: payload.score ?? null,
        lives: payload.lives ?? null,
        correct_count: payload.correctCount ?? null,
        total_questions: payload.totalQuestions ?? null,
        passed: payload.passed ?? null,
        metadata: payload.metadata ?? null,
      }),
      keepalive: payload.eventType === 'visit',
    });
  } catch {
    // Analytics should never interrupt the learning flow.
  }
}
