import { motion } from 'framer-motion';

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.4 }}
      className="text-center py-8 mt-4"
    >
      <p className="text-base text-[#e2e8f0] mb-1">
        数海航标 - 让数据库学习更清晰
      </p>
      <p className="text-xs text-[#64748b] mb-2">
        宿迁学院数理学院 计算机教学团队
      </p>
    </motion.footer>
  );
}
