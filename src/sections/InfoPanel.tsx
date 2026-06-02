import { motion } from 'framer-motion';
import { User, Anchor, BookOpen, Info, Clock, Trophy, Skull, Heart } from 'lucide-react';

interface InfoPanelProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onStartNew: () => void;
  questionCount: number;
  lives: number;
  score: number;
  initialized: boolean;
}

export function InfoPanel({
  playerName,
  onPlayerNameChange,
  onStartNew,
  questionCount,
  lives,
  score,
  initialized,
}: InfoPanelProps) {
  return (
    <div className="w-full lg:w-[360px] flex flex-col gap-4">
      {/* Player Info Card */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
        className="game-card p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <User size={18} className="text-[#d4a843]" />
          <h3 className="text-base font-semibold text-[#d4a843]">航海者信息</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">航海者名称</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => onPlayerNameChange(e.target.value)}
              placeholder="请输入你的名字"
              className="w-full bg-[#1e3a5f] border border-[#1e3a5f] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:border-[#d4a843] transition-colors"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Heart size={14} className="text-red-400 fill-red-400" />
              <span className="text-sm text-[#e2e8f0]">生命: <span className="font-bold text-red-400">{lives}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy size={14} className="text-[#d4a843]" />
              <span className="text-sm text-[#e2e8f0]">得分: <span className="font-bold text-[#d4a843]">{score}</span></span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Game Control Card */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}
        className="game-card p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Anchor size={18} className="text-[#d4a843]" />
          <h3 className="text-base font-semibold text-[#d4a843]">游戏控制</h3>
        </div>
        <button
          onClick={onStartNew}
          className="game-btn w-full flex items-center justify-center gap-2"
        >
          <Anchor size={16} />
          <span>{initialized ? '重新开始旅程' : '开始新旅程'}</span>
        </button>
      </motion.div>

      {/* Question Bank Status Card */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
        className="game-card p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={18} className="text-[#d4a843]" />
          <h3 className="text-base font-semibold text-[#d4a843]">题库状态</h3>
        </div>
        <div className="game-card-inner rounded-lg px-3 py-3 flex items-center justify-between">
          <span className="text-sm text-[#e2e8f0]">题库已就绪</span>
          <span className="text-sm font-bold text-[#4ade80]">{questionCount}题</span>
        </div>
      </motion.div>

      {/* Game Rules Card */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.4, ease: 'easeOut' }}
        className="game-card p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Info size={18} className="text-[#d4a843]" />
          <h3 className="text-base font-semibold text-[#d4a843]">游戏规则</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Clock size={14} className="text-[#94a3b8]" />
              <h4 className="text-sm font-medium text-[#e2e8f0]">答题机制</h4>
            </div>
            <ul className="text-xs text-[#94a3b8] space-y-1 pl-6">
              <li>每题60秒作答时间</li>
              <li>答错扣1颗生命值</li>
              <li>超时视为答错</li>
              <li>正确进入下一题</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Trophy size={14} className="text-[#94a3b8]" />
              <h4 className="text-sm font-medium text-[#e2e8f0]">奖励机制</h4>
            </div>
            <ul className="text-xs text-[#94a3b8] space-y-1 pl-6">
              <li>每关通过+1生命</li>
              <li>答题得分累计</li>
              <li>通关获得称号</li>
              <li>可重复挑战</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Skull size={14} className="text-[#ef4444]" />
              <h4 className="text-sm font-medium text-[#e2e8f0]">Boss关</h4>
            </div>
            <ul className="text-xs text-[#94a3b8] space-y-1 pl-6">
              <li>每关后出现Boss关</li>
              <li>3道高难度题目</li>
              <li>通关解锁下一关</li>
              <li>失败需重新挑战</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
