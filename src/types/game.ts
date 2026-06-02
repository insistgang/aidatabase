export type LevelStatus = 'locked' | 'available' | 'completed';
export type GamePhase = 'map' | 'quiz' | 'result' | 'victory';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'normal' | 'boss';

export interface Level {
  id: number;
  name: string;
  description: string;
  type: 'normal' | 'boss';
  status: LevelStatus;
  position: { x: number; y: number }; // percentage positions for map
  questionsNeeded: number; // questions to pass
}

export interface Question {
  id: number;
  levelId: number;
  question: string;
  code?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: Difficulty;
  type: QuestionType;
}

export interface GameState {
  playerName: string;
  currentLevel: number;
  lives: number;
  score: number;
  levelStatus: LevelStatus[];
  activeQuestionIds: number[];
  levelStartLives: number;
  levelStartScore: number;
  currentQuestionIndex: number;
  gamePhase: GamePhase;
  quizResults: QuizResult[];
  initialized: boolean;
}

export interface QuizResult {
  questionId: number;
  correct: boolean;
  timeTaken: number;
}

export interface LevelResult {
  levelId: number;
  passed: boolean;
  score: number;
  correctCount: number;
  totalQuestions: number;
}
