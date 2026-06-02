import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Question } from '@/types/game';
import { X, Heart, Clock, CheckCircle, XCircle, ArrowRight, Trophy } from 'lucide-react';

interface QuizModalProps {
  isOpen: boolean;
  questions: Question[];
  currentQuestionIndex: number;
  lives: number;
  score: number;
  onAnswer: (questionIndex: number, selectedAnswer: number, timeTaken: number) => void;
  onNext: () => void;
  onClose: () => void;
  quizResults: { questionId: number; correct: boolean; timeTaken: number }[];
  levelName: string;
}

const TIME_LIMIT = 60;

export function QuizModal({
  isOpen,
  questions,
  currentQuestionIndex,
  lives,
  score,
  onAnswer,
  onNext,
  onClose,
  quizResults,
  levelName,
}: QuizModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const currentQuestion = questions[currentQuestionIndex] || null;
  const currentQuestionId = currentQuestion?.id;
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const currentResult = quizResults[currentQuestionIndex];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // The parent keys this component by question, so local answer state resets on remount.
  useEffect(() => {
    if (isOpen && currentQuestionId) {
      startTimeRef.current = Date.now();
    }
    return clearTimer;
  }, [isOpen, currentQuestionId, clearTimer]);

  // Timer
  useEffect(() => {
    if (!isOpen || hasAnswered || !currentQuestionId) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          // Auto-submit on timeout
          setHasAnswered(true);
          setShowResult(true);
          onAnswer(currentQuestionIndex, -1, TIME_LIMIT);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isOpen, hasAnswered, currentQuestionId, currentQuestionIndex, onAnswer, clearTimer]);

  const handleSelectAnswer = (index: number) => {
    if (hasAnswered) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null || !currentQuestion) return;
    clearTimer();
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    setHasAnswered(true);
    setShowResult(true);
    onAnswer(currentQuestionIndex, selectedAnswer, timeTaken);
  };

  const handleNext = () => {
    setShowResult(false);
    onNext();
  };

  if (!isOpen || !currentQuestion) return null;

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const timePercent = (timeLeft / TIME_LIMIT) * 100;
  const isTimeLow = timeLeft <= 10;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto game-card"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#1e3a5f]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#d4a843]">{levelName}</h2>
                <p className="text-xs text-[#94a3b8]">
                  第 {currentQuestionIndex + 1} / {questions.length} 题
                  {currentQuestion.type === 'boss' && (
                    <span className="ml-2 text-[#ef4444] font-medium">Boss题</span>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[#1a2d4a] transition-colors"
              >
                <X size={20} className="text-[#94a3b8]" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-[#1a2d4a] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#d4a843] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <Heart size={14} className="text-red-400 fill-red-400" />
                <span className="text-sm text-[#e2e8f0]">{lives}</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy size={14} className="text-[#d4a843]" />
                <span className="text-sm text-[#e2e8f0]">{score}</span>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="px-5 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className={isTimeLow ? 'text-[#ef4444]' : 'text-[#94a3b8]'} />
              <span className={`text-sm font-mono ${isTimeLow ? 'text-[#ef4444] font-bold' : 'text-[#94a3b8]'}`}>
                {timeLeft}秒
              </span>
              {isTimeLow && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-xs text-[#ef4444]"
                >
                  时间紧迫!
                </motion.span>
              )}
            </div>
            <div className="h-1.5 bg-[#1a2d4a] rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isTimeLow ? 'bg-[#ef4444]' : 'bg-[#4ade80]'}`}
                animate={{ width: `${timePercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="p-5">
            <div className="mb-4">
              <p className="text-base text-[#e2e8f0] leading-relaxed">{currentQuestion.question}</p>
              {currentQuestion.code && (
                <pre className="mt-3 p-3 bg-[#0f1729] rounded-lg text-sm font-mono text-[#e8c868] overflow-x-auto">
                  {currentQuestion.code}
                </pre>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQuestion.options.map((option, index) => {
                let optionClass = 'game-card-inner border border-transparent hover:border-[#d4a843]/50 cursor-pointer';
                if (showResult) {
                  if (index === currentQuestion.correctAnswer) {
                    optionClass = 'bg-green-500/20 border-green-500/50';
                  } else if (index === selectedAnswer && !currentResult?.correct) {
                    optionClass = 'bg-red-500/20 border-red-500/50';
                  } else {
                    optionClass = 'game-card-inner border border-transparent opacity-60';
                  }
                } else if (selectedAnswer === index) {
                  optionClass = 'bg-[#d4a843]/20 border-[#d4a843]';
                }

                return (
                  <motion.div
                    key={index}
                    whileHover={!hasAnswered ? { scale: 1.01 } : {}}
                    whileTap={!hasAnswered ? { scale: 0.99 } : {}}
                    onClick={() => handleSelectAnswer(index)}
                    className={`p-3.5 rounded-lg flex items-center gap-3 transition-all duration-200 ${optionClass}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        showResult && index === currentQuestion.correctAnswer
                          ? 'bg-green-500 text-white'
                          : showResult && index === selectedAnswer && !currentResult?.correct
                          ? 'bg-red-500 text-white'
                          : selectedAnswer === index
                          ? 'bg-[#d4a843] text-[#0f1729]'
                          : 'bg-[#1e3a5f] text-[#94a3b8]'
                      }`}
                    >
                      {showResult && index === currentQuestion.correctAnswer ? (
                        <CheckCircle size={14} />
                      ) : showResult && index === selectedAnswer && !currentResult?.correct ? (
                        <XCircle size={14} />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </div>
                    <span className="text-sm text-[#e2e8f0]">{option}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Result explanation */}
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 bg-[#1a2d4a] rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {currentResult?.correct ? (
                      <>
                        <CheckCircle size={18} className="text-[#4ade80]" />
                        <span className="text-sm font-medium text-[#4ade80]">回答正确!</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={18} className="text-[#ef4444]" />
                        <span className="text-sm font-medium text-[#ef4444]">回答错误</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8]">{currentQuestion.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex gap-3 mt-5">
              {!hasAnswered ? (
                <button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                  className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                    selectedAnswer !== null
                      ? 'bg-[#d4a843] text-[#0f1729] hover:bg-[#e8c868] active:scale-[0.98]'
                      : 'bg-[#1a2d4a] text-[#64748b] cursor-not-allowed'
                  }`}
                >
                  提交答案
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 rounded-lg font-medium text-sm bg-[#d4a843] text-[#0f1729] hover:bg-[#e8c868] active:scale-[0.98] flex items-center justify-center gap-2 transition-all duration-200"
                >
                  {isLastQuestion ? '查看结果' : '下一题'}
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
