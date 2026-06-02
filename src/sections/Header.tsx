import { motion } from 'framer-motion';

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="text-center py-8"
    >
      <motion.img
        src="/assets/sailboat.png"
        alt="帆船"
        className="w-16 h-16 mx-auto mb-4 drop-shadow-lg"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
      />
      <motion.h1
        className="text-4xl md:text-5xl font-bold mb-2 animate-shimmer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        数海航标
      </motion.h1>
      <motion.p
        className="text-lg md:text-xl text-[#e2e8f0] mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        数据海洋·AI智学领航
      </motion.p>
      <motion.p
        className="text-sm text-[#94a3b8]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        数据库学习挑战 · 驱散学业迷茫 · 点亮知识灯塔
      </motion.p>
    </motion.header>
  );
}
