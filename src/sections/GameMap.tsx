import { motion } from 'framer-motion';
import { levels, mapPath } from '@/data/levels';
import type { LevelStatus } from '@/types/game';
import { Anchor, Check, Compass, Lock, MapPin, Skull } from 'lucide-react';

interface GameMapProps {
  levelStatus: LevelStatus[];
  onLevelClick: (levelId: number) => void;
}

const statusConfig = {
  available: {
    ring: '#4ade80',
    glow: 'rgba(74, 222, 128, 0.48)',
    label: '待挑战',
    dot: '#4ade80',
    panel: 'border-[#4ade80]/45 bg-[#12342c]/90',
    text: 'text-[#dffbea]',
    subText: 'text-[#9ae6b4]',
    icon: Anchor,
  },
  completed: {
    ring: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.32)',
    label: '已完成',
    dot: '#22c55e',
    panel: 'border-[#22c55e]/35 bg-[#102d28]/85',
    text: 'text-[#ecfdf5]',
    subText: 'text-[#86efac]',
    icon: Check,
  },
  boss: {
    ring: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.42)',
    label: 'Boss关',
    dot: '#ef4444',
    panel: 'border-[#ef4444]/40 bg-[#34151d]/90',
    text: 'text-[#fee2e2]',
    subText: 'text-[#fca5a5]',
    icon: Skull,
  },
  locked: {
    ring: '#64748b',
    glow: 'rgba(100, 116, 139, 0.12)',
    label: '未解锁',
    dot: '#64748b',
    panel: 'border-[#64748b]/25 bg-[#111827]/70',
    text: 'text-[#94a3b8]',
    subText: 'text-[#64748b]',
    icon: Lock,
  },
};

const labelPlacement: Record<number, 'top' | 'right' | 'bottom' | 'left'> = {
  1: 'top',
  2: 'top',
  3: 'bottom',
  4: 'top',
  5: 'bottom',
  6: 'top',
  7: 'bottom',
  8: 'top',
  9: 'left',
};

const labelPositionClass = {
  top: 'left-1/2 bottom-[calc(100%+0.85rem)] -translate-x-1/2 text-center',
  right: 'left-[calc(100%+0.9rem)] top-1/2 -translate-y-1/2 text-left',
  bottom: 'left-1/2 top-[calc(100%+0.85rem)] -translate-x-1/2 text-center',
  left: 'right-[calc(100%+0.9rem)] top-1/2 -translate-y-1/2 text-right',
};

const legendItems = [
  {
    key: 'available',
    label: '待挑战',
    color: statusConfig.available.dot,
  },
  {
    key: 'completed',
    label: '已完成',
    color: statusConfig.completed.dot,
  },
  {
    key: 'boss',
    label: 'Boss关',
    color: statusConfig.boss.dot,
  },
  {
    key: 'locked',
    label: '未解锁',
    color: statusConfig.locked.dot,
  },
];

function getRouteProgress(levelStatus: LevelStatus[]) {
  const lastVisibleIndex = levelStatus.reduce(
    (lastIndex, status, index) => (status === 'locked' ? lastIndex : index),
    0
  );

  return Math.max(0.06, lastVisibleIndex / Math.max(1, levels.length - 1));
}

function getNodeConfig(level: (typeof levels)[0], status: LevelStatus) {
  if (level.type === 'boss' && status !== 'locked' && status !== 'completed') {
    return statusConfig.boss;
  }

  return statusConfig[status];
}

function StatusBadge({ status, level }: { status: LevelStatus; level: (typeof levels)[0] }) {
  const config = getNodeConfig(level, status);
  const label = level.type === 'boss' && status !== 'locked' && status !== 'completed'
    ? statusConfig.boss.label
    : config.label;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-medium text-[#cbd5e1]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.dot }} />
      {label}
    </span>
  );
}

function LevelLabel({
  level,
  status,
}: {
  level: (typeof levels)[0];
  status: LevelStatus;
}) {
  const config = getNodeConfig(level, status);
  const placement = labelPlacement[level.id] ?? 'bottom';
  const visibility = status === 'locked'
    ? 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
    : 'opacity-100';
  const compact = status === 'locked' ? 'scale-95' : '';

  return (
    <div
      className={`pointer-events-none absolute z-20 hidden w-[9.25rem] rounded-lg border px-3 py-2 shadow-xl backdrop-blur-md transition duration-200 md:block ${labelPositionClass[placement]} ${config.panel} ${visibility} ${compact}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`text-sm font-semibold leading-tight ${config.text}`}>{level.name}</div>
        <div className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-[#e2e8f0]">
          {String(level.id).padStart(2, '0')}
        </div>
      </div>
      <div className={`mt-1 text-[11px] leading-snug ${config.subText}`}>{level.description}</div>
      <div className="mt-2">
        <StatusBadge level={level} status={status} />
      </div>
    </div>
  );
}

function LevelNode({
  level,
  status,
  onClick,
  index,
}: {
  level: (typeof levels)[0];
  status: LevelStatus;
  onClick: () => void;
  index: number;
}) {
  const config = getNodeConfig(level, status);
  const Icon = config.icon;
  const isClickable = status === 'available' || status === 'completed';
  const isBoss = level.type === 'boss';

  return (
    <motion.button
      type="button"
      aria-label={`${level.name}，${config.label}`}
      disabled={!isClickable}
      initial={{ scale: 0.72, opacity: 0 }}
      animate={{ scale: 1, opacity: status === 'locked' ? 0.72 : 1 }}
      transition={{ delay: 0.35 + index * 0.07, type: 'spring', stiffness: 210, damping: 18 }}
      className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 outline-none ${
        isClickable ? 'cursor-pointer' : 'cursor-default'
      } group`}
      style={{ left: `${level.position.x}%`, top: `${level.position.y}%` }}
      onClick={isClickable ? onClick : undefined}
      whileHover={isClickable ? { scale: 1.08 } : {}}
      whileTap={isClickable ? { scale: 0.96 } : {}}
    >
      <span
        className={`absolute inset-0 rounded-full ${status === 'available' ? 'animate-pulse-glow' : ''} ${
          isBoss && status !== 'locked' && status !== 'completed' ? 'animate-pulse-glow-red' : ''
        }`}
        style={{ margin: '-10px' }}
      />

      <span
        className={`relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] bg-[#101b2d]/95 shadow-2xl backdrop-blur-md md:h-16 md:w-16 ${
          isClickable ? 'hover:brightness-110' : ''
        }`}
        style={{
          borderColor: config.ring,
          boxShadow: `0 0 0 6px rgba(15, 23, 41, 0.7), 0 0 28px ${config.glow}`,
        }}
      >
        <span className="absolute inset-1 rounded-full border border-white/10" />
        {status === 'available' ? (
          <span className="relative text-lg font-black" style={{ color: config.ring }}>
            {level.id}
          </span>
        ) : (
        <>
          <Icon size={isBoss ? 23 : 21} color={config.ring} strokeWidth={2.5} />
          {status === 'locked' && (
            <span className="absolute -right-1 -top-1 rounded-full border border-[#1f3550] bg-[#0b1526] px-1.5 py-0.5 text-[10px] font-bold text-[#94a3b8]">
              {level.id}
            </span>
          )}
        </>
      )}
      </span>

      <LevelLabel level={level} status={status} />
    </motion.button>
  );
}

function MapDecoration() {
  return (
    <>
      <div className="absolute inset-0 bg-[#071120]/25" />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(226, 232, 240, 0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(226, 232, 240, 0.18) 1px, transparent 1px)',
          backgroundSize: '76px 76px',
          transform: 'rotate(-8deg) scale(1.15)',
        }}
      />
      <div
        className="absolute bottom-6 right-8 hidden h-32 w-32 rounded-full border border-[#d4a843]/25 opacity-50 md:block"
        aria-hidden="true"
      >
        <Compass size={70} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#d4a843]/35" />
      </div>
    </>
  );
}

function RouteLayer({ progress }: { progress: number }) {
  return (
    <svg
      className="absolute inset-0 z-10 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="routeActiveGradient" x1="0%" y1="85%" x2="100%" y2="20%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="52%" stopColor="#d4a843" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={mapPath}
        fill="none"
        stroke="rgba(148, 163, 184, 0.22)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d={mapPath}
        fill="none"
        stroke="rgba(15, 23, 42, 0.65)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="1.3 2.2"
      />
      <motion.path
        d={mapPath}
        fill="none"
        stroke="url(#routeActiveGradient)"
        strokeWidth="1.55"
        strokeLinecap="round"
        filter="url(#routeGlow)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: progress }}
        transition={{ duration: 1.15, ease: 'easeOut' }}
      />
    </svg>
  );
}

export function GameMap({ levelStatus, onLevelClick }: GameMapProps) {
  const routeProgress = getRouteProgress(levelStatus);

  return (
    <motion.section
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="game-card flex-1 overflow-hidden p-5 md:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={20} className="text-[#d4a843]" />
            <h2 className="text-lg md:text-xl font-semibold text-[#d4a843]">
              数据海洋·AI智学领航
            </h2>
          </div>
          <p className="text-xs md:text-sm text-[#94a3b8]">
            从迷茫港口出发，穿越知识海洋，抵达智慧灯塔
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-[#1e3a5f] bg-[#0f1729]/55 px-3 py-1.5 text-xs text-[#94a3b8] md:flex">
          <Compass size={14} className="text-[#d4a843]" />
          知识航线
        </div>
      </div>

      <div className="relative min-h-[430px] overflow-hidden rounded-xl border border-[#203856] bg-[#0b1526] shadow-inner md:min-h-[470px]">
        <div
          className="absolute inset-0 opacity-55"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}assets/map-bg.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'saturate(0.9) contrast(1.08)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#081326]/95 via-[#102847]/76 to-[#071120]/92" />
        <MapDecoration />
        <RouteLayer progress={routeProgress} />

        <div className="absolute inset-0 z-20">
          {levels.map((level, index) => (
            <LevelNode
              key={level.id}
              level={level}
              status={levelStatus[index] ?? 'locked'}
              onClick={() => onLevelClick(level.id)}
              index={index}
            />
          ))}
        </div>

        <div className="absolute left-4 right-4 top-4 z-40 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-[#081326]/70 px-3 py-2 backdrop-blur-md md:right-auto">
          {legendItems.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5 px-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-[#cbd5e1]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
