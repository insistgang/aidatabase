import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, Heart, ArrowRight, RotateCcw, Star, Lock } from 'lucide-react';

interface ResultModalProps {
  isOpen: boolean;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  score: number;
  lives: number;
  levelName: string;
  onReturnToMap: () => void;
  onRetry: () => void;
}

export function ResultModal({
  isOpen,
  correctCount,
  totalQuestions,
  passed,
  score,
  lives,
  levelName,
  onReturnToMap,
  onRetry,
}: ResultModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md game-card p-6 text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="mb-4"
          >
            {passed ? (
              <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Star size={40} className="text-[#d4a843] fill-[#d4a843]" />
              </div>
            ) : (
              <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle size={40} className="text-[#ef4444]" />
              </div>
            )}
          </motion.div>

          {/* Title */}
          <h2 className={`text-2xl font-bold mb-2 ${passed ? 'text-[#d4a843]' : 'text-[#ef4444]'}`}>
            {passed ? '关卡通过!' : '关卡失败'}
          </h2>
          <p className="text-sm text-[#94a3b8] mb-4">{levelName}</p>

          {/* Stats */}
          <div className="game-card-inner p-4 rounded-xl mb-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle size={14} className="text-[#4ade80]" />
                </div>
                <div className="text-xl font-bold text-[#e2e8f0]">
                  {correctCount}/{totalQuestions}
                </div>
                <div className="text-xs text-[#94a3b8]">正确率</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy size={14} className="text-[#d4a843]" />
                </div>
                <div className="text-xl font-bold text-[#d4a843]">{score}</div>
                <div className="text-xs text-[#94a3b8]">总得分</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Heart size={14} className="text-red-400 fill-red-400" />
                </div>
                <div className="text-xl font-bold text-[#e2e8f0]">{lives}</div>
                <div className="text-xs text-[#94a3b8]">剩余生命</div>
              </div>
            </div>
          </div>

          {/* Next action */}
          <div className="flex gap-3">
            <button
              onClick={onReturnToMap}
              className="flex-1 py-3 rounded-lg font-medium text-sm bg-[#d4a843] text-[#0f1729] hover:bg-[#e8c868] active:scale-[0.98] flex items-center justify-center gap-2 transition-all duration-200"
            >
              <ArrowRight size={16} />
              {passed ? '继续航行' : '返回地图'}
            </button>
            {!passed && (
              <button
                onClick={onRetry}
                className="flex-1 py-3 rounded-lg font-medium text-sm bg-[#1e3a5f] text-[#e2e8f0] hover:bg-[#264a70] active:scale-[0.98] flex items-center justify-center gap-2 transition-all duration-200"
              >
                <RotateCcw size={16} />
                重新挑战
              </button>
            )}
          </div>

          {passed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 text-xs text-[#4ade80] flex items-center justify-center gap-1"
            >
              <Lock size={12} />
              <span>下一关卡已解锁</span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
