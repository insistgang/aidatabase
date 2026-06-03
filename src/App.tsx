import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Header } from '@/sections/Header';
import { GameMap } from '@/sections/GameMap';
import { InfoPanel } from '@/sections/InfoPanel';
import { Footer } from '@/sections/Footer';
import { QuizModal } from '@/components/QuizModal';
import { ResultModal } from '@/components/ResultModal';
import { VictoryModal } from '@/components/VictoryModal';
import { useGameState } from '@/hooks/useGameState';
import { levels } from '@/data/levels';
import { allQuestions } from '@/data/questions';
import { trackLearningEvent } from '@/lib/learningAnalytics';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Route, Routes } from 'react-router';

const AdminDashboard = lazy(() =>
  import('@/pages/AdminDashboard').then((module) => ({
    default: module.AdminDashboard,
  }))
);

function GameApp() {
  const game = useGameState();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void trackLearningEvent({
      eventType: 'visit',
      metadata: {
        page: window.location.pathname,
      },
    });
  }, []);

  const handleLevelClick = useCallback(
    (levelId: number) => {
      const levelIndex = levels.findIndex((l) => l.id === levelId);
      const status = game.state.levelStatus[levelIndex];

      if (status === 'locked') {
        setToast('请先通关前置关卡');
        setTimeout(() => setToast(null), 2000);
        return;
      }

      if (status === 'completed') {
        // Allow replay
        game.startLevel(levelId);
        return;
      }

      game.startLevel(levelId);
    },
    [game]
  );

  const handleReturnToMap = useCallback(() => {
    game.returnToMap();
  }, [game]);

  const handleRetry = useCallback(() => {
    game.startLevel(game.state.currentLevel);
  }, [game]);

  const quizSummary = game.getQuizSummary();

  const showQuiz = game.state.gamePhase === 'quiz';
  const showResult =
    game.state.gamePhase === 'result' && game.state.quizResults.length > 0;
  const showVictory = game.state.gamePhase === 'victory';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(26, 58, 95, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(26, 58, 95, 0.1) 0%, transparent 50%),
          linear-gradient(180deg, #0f1729 0%, #0d1425 50%, #0f1729 100%)
        `,
      }}
    >
      {/* Subtle ocean texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}assets/ocean-bg.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="flex-1 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto w-full">
          <Header />

          {/* Game area */}
          <div className="flex flex-col lg:flex-row gap-5 pb-4">
            <GameMap
              levelStatus={game.state.levelStatus}
              onLevelClick={handleLevelClick}
            />
            <InfoPanel
              playerName={game.state.playerName}
              onPlayerNameChange={game.setPlayerName}
              onStartNew={game.initializeGame}
              questionCount={allQuestions.length}
              lives={game.state.lives}
              score={game.state.score}
              initialized={game.state.initialized}
            />
          </div>

          <Footer />
        </div>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-[#162236] border border-[#1e3a5f] text-[#e2e8f0] px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2"
          >
            <AlertTriangle size={16} className="text-[#d4a843]" />
            <span className="text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz Modal */}
      {showQuiz && (
        <QuizModal
          key={`${game.state.activeQuestionIds.join('-')}-${game.state.currentQuestionIndex}`}
          isOpen={showQuiz}
          questions={game.currentQuestions}
          currentQuestionIndex={game.state.currentQuestionIndex}
          lives={game.state.lives}
          score={game.state.score}
          onAnswer={game.answerQuestion}
          onNext={game.nextQuestion}
          onClose={handleReturnToMap}
          quizResults={game.state.quizResults}
          levelName={
            levels.find((l) => l.id === game.state.currentLevel)?.name || ''
          }
        />
      )}

      {/* Result Modal */}
      <ResultModal
        isOpen={showResult}
        correctCount={quizSummary.correctCount}
        totalQuestions={quizSummary.totalQuestions}
        passed={quizSummary.passed}
        score={quizSummary.score}
        lives={quizSummary.lives}
        levelName={quizSummary.levelName}
        onReturnToMap={handleReturnToMap}
        onRetry={handleRetry}
      />

      {/* Victory Modal */}
      <VictoryModal
        isOpen={showVictory}
        score={game.state.score}
        lives={game.state.lives}
        playerName={game.state.playerName}
        onReset={game.resetGame}
      />

      {/* Game Over check */}
      <AnimatePresence>
        {game.state.lives <= 0 && game.state.gamePhase !== 'victory' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="relative w-full max-w-sm game-card p-6 text-center"
            >
              <h2 className="text-2xl font-bold text-[#ef4444] mb-2">
                游戏结束
              </h2>
              <p className="text-sm text-[#94a3b8] mb-4">
                生命值已耗尽，重新开始你的航海之旅吧
              </p>
              <button
                onClick={game.resetGame}
                className="w-full py-3 rounded-lg font-medium bg-[#d4a843] text-[#0f1729] hover:bg-[#e8c868] transition-all duration-200"
              >
                重新开始
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <Suspense
            fallback={
              <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
                <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-sm shadow-sm">
                  正在加载后台...
                </div>
              </div>
            }
          >
            <AdminDashboard />
          </Suspense>
        }
      />
      <Route path="*" element={<GameApp />} />
    </Routes>
  );
}
