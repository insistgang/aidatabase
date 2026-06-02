import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Heart, RotateCcw, Sparkles } from 'lucide-react';

interface VictoryModalProps {
  isOpen: boolean;
  score: number;
  lives: number;
  playerName: string;
  onReset: () => void;
}

const sparklePositions = [
  { x: '24%', y: '18%' },
  { x: '68%', y: '16%' },
  { x: '82%', y: '42%' },
  { x: '18%', y: '48%' },
  { x: '36%', y: '78%' },
  { x: '72%', y: '72%' },
];

export function VictoryModal({ isOpen, score, lives, playerName, onReset }: VictoryModalProps) {
  if (!isOpen) return null;

  const titles = [
    { min: 0, title: '航海新手', color: '#94a3b8' },
    { min: 100, title: '见习水手', color: '#22c55e' },
    { min: 200, title: '资深航海士', color: '#3b82f6' },
    { min: 350, title: '灯塔守护者', color: '#d4a843' },
    { min: 500, title: '迷雾征服者', color: '#a855f7' },
  ];

  const earnedTitle = [...titles].reverse().find((t) => score >= t.min) || titles[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="relative w-full max-w-lg game-card p-8 text-center"
        >
          {/* Sparkles animation */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            {sparklePositions.map((position, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  x: position.x,
                  y: position.y,
                  opacity: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.3,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              >
                <Sparkles size={20} className="text-[#d4a843]" />
              </motion.div>
            ))}
          </div>

          {/* Trophy */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="mb-5"
          >
            <div className="w-24 h-24 mx-auto rounded-full bg-[#d4a843]/20 flex items-center justify-center">
              <Trophy size={48} className="text-[#d4a843]" />
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-[#d4a843] mb-2"
          >
            恭喜通关!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[#94a3b8] mb-6"
          >
            {playerName ? `${playerName}，` : ''}你成功抵达了智慧灯塔!
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="game-card-inner p-5 rounded-xl mb-6"
          >
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Star size={20} className="mx-auto mb-2 text-[#d4a843] fill-[#d4a843]" />
                <div className="text-lg font-bold" style={{ color: earnedTitle.color }}>
                  {earnedTitle.title}
                </div>
                <div className="text-xs text-[#94a3b8]">获得称号</div>
              </div>
              <div>
                <Trophy size={20} className="mx-auto mb-2 text-[#d4a843]" />
                <div className="text-lg font-bold text-[#d4a843]">{score}</div>
                <div className="text-xs text-[#94a3b8]">总得分</div>
              </div>
              <div>
                <Heart size={20} className="mx-auto mb-2 text-red-400 fill-red-400" />
                <div className="text-lg font-bold text-[#e2e8f0]">{lives}</div>
                <div className="text-xs text-[#94a3b8]">剩余生命</div>
              </div>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={onReset}
            className="w-full py-3.5 rounded-lg font-medium bg-[#d4a843] text-[#0f1729] hover:bg-[#e8c868] active:scale-[0.98] flex items-center justify-center gap-2 transition-all duration-200"
          >
            <RotateCcw size={16} />
            重新开始冒险
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
