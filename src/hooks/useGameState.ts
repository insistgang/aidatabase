import { useState, useCallback, useEffect, useMemo } from 'react';
import type { GameState, LevelStatus, QuizResult, GamePhase, Question } from '@/types/game';
import { levels } from '@/data/levels';
import { getQuestionsByIds, getQuestionsByLevel } from '@/data/questions';
import { trackLearningEvent } from '@/lib/learningAnalytics';

const STORAGE_KEY = 'kolm_game_state';

function loadState(): Partial<GameState> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function saveState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

const initialLevelStatus: LevelStatus[] = levels.map((_l, i) =>
  i === 0 ? 'available' : 'locked'
);

const defaultState: GameState = {
  playerName: '',
  currentLevel: 1,
  lives: 5,
  score: 0,
  levelStatus: [...initialLevelStatus],
  activeQuestionIds: [],
  levelStartLives: 5,
  levelStartScore: 0,
  currentQuestionIndex: 0,
  gamePhase: 'map',
  quizResults: [],
  initialized: false,
};

function createInitialState(): GameState {
  const saved = loadState();

  const state = {
    ...defaultState,
    ...saved,
  };

  const activeQuestionIds = Array.isArray(state.activeQuestionIds)
    ? state.activeQuestionIds
    : [];
  const restoredState: GameState = {
    ...state,
    activeQuestionIds,
  };

  if (
    (restoredState.gamePhase === 'quiz' || restoredState.gamePhase === 'result') &&
    activeQuestionIds.length === 0
  ) {
    return {
      ...restoredState,
      currentQuestionIndex: 0,
      gamePhase: 'map',
      quizResults: [],
    };
  }

  return restoredState;
}

export function useGameState() {
  const [state, setState] = useState<GameState>(() => createInitialState());

  const currentQuestions = useMemo<Question[]>(
    () => getQuestionsByIds(state.activeQuestionIds),
    [state.activeQuestionIds]
  );

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const setPlayerName = useCallback((name: string) => {
    setState(prev => ({ ...prev, playerName: name }));
  }, []);

  const initializeGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      initialized: true,
      levelStatus: [...initialLevelStatus],
      currentLevel: 1,
      lives: 5,
      score: 0,
      activeQuestionIds: [],
      levelStartLives: 5,
      levelStartScore: 0,
      gamePhase: 'map' as GamePhase,
      quizResults: [],
    }));
    void trackLearningEvent({
      eventType: 'game_started',
      studentName: state.playerName,
    });
  }, [state.playerName]);

  const startLevel = useCallback((levelId: number) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;

    const count = level.questionsNeeded;
    const questions = getQuestionsByLevel(levelId, count);

    void trackLearningEvent({
      eventType: 'level_started',
      studentName: state.playerName,
      levelId,
      levelName: level.name,
      totalQuestions: questions.length,
      metadata: {
        question_ids: questions.map((question) => question.id).join(','),
      },
    });

    setState(prev => ({
      ...prev,
      currentLevel: levelId,
      gamePhase: 'quiz' as GamePhase,
      currentQuestionIndex: 0,
      quizResults: [],
      activeQuestionIds: questions.map((question) => question.id),
      levelStartLives: prev.lives,
      levelStartScore: prev.score,
    }));
  }, [state.playerName]);

  const answerQuestion = useCallback((questionIndex: number, selectedAnswer: number, timeTaken: number) => {
    setState(prev => {
      const question = currentQuestions[questionIndex];
      if (!question) return prev;
      if (prev.quizResults.some(result => result.questionId === question.id)) return prev;

      const correct = selectedAnswer === question.correctAnswer;
      const practiceRun = prev.levelStatus[prev.currentLevel - 1] === 'completed';
      const result: QuizResult = {
        questionId: question.id,
        correct,
        timeTaken,
      };

      const newLives = correct || practiceRun ? prev.lives : prev.lives - 1;
      const pointsEarned = correct && !practiceRun
        ? (question.type === 'boss' ? 20 : 10) + Math.max(0, Math.floor(60 - timeTaken))
        : 0;

      const newResults = [...prev.quizResults, result];
      const nextLives = Math.max(0, newLives);
      const nextScore = prev.score + pointsEarned;

      void trackLearningEvent({
        eventType: 'answer',
        studentName: prev.playerName,
        levelId: prev.currentLevel,
        levelName: levels.find((level) => level.id === prev.currentLevel)?.name,
        questionId: question.id,
        selectedAnswer,
        correct,
        timeTaken,
        score: nextScore,
        lives: nextLives,
        metadata: {
          question_index: questionIndex + 1,
          question_type: question.type,
          difficulty: question.difficulty,
          practice_run: practiceRun,
        },
      });

      return {
        ...prev,
        lives: nextLives,
        score: nextScore,
        quizResults: newResults,
      };
    });
  }, [currentQuestions]);

  const nextQuestion = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentQuestionIndex + 1;
      if (nextIndex >= prev.activeQuestionIds.length) {
        // Quiz complete, check if passed
        const correctCount = prev.quizResults.filter(r => r.correct).length;
        const level = levels.find(lvl => lvl.id === prev.currentLevel);
        const needed = level?.questionsNeeded ?? 3;
        const passed = correctCount >= needed;
        const levelName = level?.name || '';

        if (passed) {
          const newStatus = [...prev.levelStatus];
          const levelIndex = prev.currentLevel - 1;
          const alreadyCompleted = newStatus[levelIndex] === 'completed';
          newStatus[levelIndex] = 'completed';
          if (prev.currentLevel < levels.length) {
            newStatus[prev.currentLevel] =
              newStatus[prev.currentLevel] === 'completed' ? 'completed' : 'available';
          }
          const nextLives = alreadyCompleted ? prev.lives : prev.lives + 1;
          void trackLearningEvent({
            eventType: 'level_result',
            studentName: prev.playerName,
            levelId: prev.currentLevel,
            levelName,
            correctCount,
            totalQuestions: prev.activeQuestionIds.length,
            passed: true,
            score: prev.score,
            lives: nextLives,
          });
          return {
            ...prev,
            gamePhase: 'result' as GamePhase,
            levelStatus: newStatus,
            lives: nextLives, // First clear bonus
          };
        } else {
          void trackLearningEvent({
            eventType: 'level_result',
            studentName: prev.playerName,
            levelId: prev.currentLevel,
            levelName,
            correctCount,
            totalQuestions: prev.activeQuestionIds.length,
            passed: false,
            score: prev.score,
            lives: prev.lives,
          });
          return {
            ...prev,
            gamePhase: 'result' as GamePhase,
          };
        }
      }
      return {
        ...prev,
        currentQuestionIndex: nextIndex,
      };
    });
  }, []);

  const returnToMap = useCallback(() => {
    setState(prev => {
      // Check if all levels completed
      const allCompleted = prev.levelStatus.every(s => s === 'completed');
      const abandonedQuiz = prev.gamePhase === 'quiz';
      const lives = abandonedQuiz ? prev.levelStartLives : prev.lives;
      const score = abandonedQuiz ? prev.levelStartScore : prev.score;
      if (allCompleted) {
        void trackLearningEvent({
          eventType: 'victory',
          studentName: prev.playerName,
          score,
          lives,
        });
      }
      return {
        ...prev,
        lives,
        score,
        gamePhase: allCompleted ? 'victory' : 'map',
        currentQuestionIndex: 0,
        quizResults: [],
        activeQuestionIds: [],
        levelStartLives: lives,
        levelStartScore: score,
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ ...defaultState });
  }, []);

  const getCurrentQuestion = useCallback(() => {
    return currentQuestions[state.currentQuestionIndex] || null;
  }, [currentQuestions, state.currentQuestionIndex]);

  const getQuizSummary = useCallback(() => {
    const correctCount = state.quizResults.filter(r => r.correct).length;
    const totalQuestions = currentQuestions.length;
    const level = levels.find(l => l.id === state.currentLevel);
    const passed = correctCount >= (level?.questionsNeeded ?? 3);
    return {
      correctCount,
      totalQuestions,
      passed,
      score: state.score,
      lives: state.lives,
      levelId: state.currentLevel,
      levelName: level?.name || '',
    };
  }, [state.quizResults, state.currentLevel, state.score, state.lives, currentQuestions]);

  return {
    state,
    setPlayerName,
    initializeGame,
    startLevel,
    answerQuestion,
    nextQuestion,
    returnToMap,
    resetGame,
    getCurrentQuestion,
    getQuizSummary,
    currentQuestions,
  };
}
