import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Play, Sparkles, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface FreeroundsBannerProps {
  onPlayGame: (game: any) => void;
  allGames: any[];
}

interface BonusStatus {
  balance: number;
  bonus_balance: number;
  active_wagers: {
    id: number;
    game_code: string;
    operator: string;
    wager_multiplier: number;
    win_amount: number;
    wager_required: number;
    wager_completed: number;
    progress: number;
    status: string;
  }[];
}

export default function FreeroundsBanner({ onPlayGame, allGames }: FreeroundsBannerProps) {
  const { token, isAuthenticated } = useAuthStore();
  const [freerounds, setFreerounds] = useState<any[]>([]);
  const [bonusStatus, setBonusStatus] = useState<BonusStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const fetchData = async () => {
      try {
        const [frRes, bonusRes] = await Promise.all([
          fetch('/api/slots/freerounds', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/slots/bonus-status', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        const frData = await frRes.json();
        const bonusData = await bonusRes.json();

        if (frData.success && frData.data?.length > 0) {
          setFreerounds(frData.data);
        }
        if (bonusData.success && bonusData.data) {
          setBonusStatus(bonusData.data);
        }
      } catch {
        // Silently fail
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [token, isAuthenticated]);

  const hasFreerounds = freerounds.length > 0;
  const hasWagers = bonusStatus && bonusStatus.active_wagers.length > 0;
  const hasBonusBalance = bonusStatus && bonusStatus.bonus_balance > 0;

  if (dismissed || (!hasFreerounds && !hasWagers && !hasBonusBalance)) return null;

  const findGame = (gameCode: string) => {
    return allGames.find(g => g.gameCode === gameCode || g.pageCode === gameCode || g.id === gameCode);
  };

  const totalSpins = freerounds.reduce((sum, fr) => sum + parseInt(fr.FreespinsLeft || fr.Count || '0', 10), 0);
  const firstFr = freerounds[0];
  const gameCodes = firstFr?.Games || [];
  const firstGameCode = Array.isArray(gameCodes) ? gameCodes[0] : gameCodes;
  const matchedGame = firstGameCode ? findGame(firstGameCode) : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6 space-y-3"
      >
        {/* Freerounds Banner */}
        {hasFreerounds && (
          <div className="relative overflow-hidden rounded-2xl border border-aurex-gold-500/30 bg-gradient-to-r from-purple-900/40 via-aurex-obsidian-800 to-aurex-gold-500/10">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-2 left-[10%] w-1 h-1 bg-aurex-gold-500 rounded-full animate-ping" />
              <div className="absolute top-4 right-[20%] w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-3 left-[30%] w-1 h-1 bg-aurex-gold-500 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
              <div className="absolute top-6 left-[60%] w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
            </div>

            <div className="relative flex items-center justify-between p-4 sm:p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-aurex-gold-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-aurex-gold-500/20">
                  <Gift className="w-7 h-7 sm:w-8 sm:h-8 text-aurex-obsidian-900" />
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-aurex-gold-500" />
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      У вас {totalSpins} фриспинов!
                    </h3>
                  </div>
                  <p className="text-aurex-platinum-400 text-sm mt-0.5">
                    {matchedGame
                      ? `Бесплатные вращения на ${matchedGame.name}`
                      : `Бесплатные вращения доступны`
                    }
                    {firstFr?.ExpireDate && (
                      <span className="text-aurex-gold-500/70 ml-2">
                        &bull; до {new Date(firstFr.ExpireDate).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {matchedGame && (
                  <button
                    onClick={() => onPlayGame({ ...matchedGame, mode: 'real' })}
                    className="hidden sm:flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-aurex-gold-500 to-yellow-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-lg hover:shadow-aurex-gold-500/30 transition-all"
                  >
                    <Play className="w-5 h-5" />
                    <span>Играть</span>
                  </button>
                )}
                <button
                  onClick={() => setDismissed(true)}
                  className="p-2 text-aurex-platinum-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {matchedGame && (
              <div className="sm:hidden px-4 pb-4">
                <button
                  onClick={() => onPlayGame({ ...matchedGame, mode: 'real' })}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-aurex-gold-500 to-yellow-600 text-aurex-obsidian-900 font-bold rounded-xl"
                >
                  <Play className="w-5 h-5" />
                  <span>Играть</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Wager Progress Banner — only show when there are actual wins to wager */}
        {hasWagers && bonusStatus && bonusStatus.active_wagers
          .filter(w => w.wager_required > 0 && w.win_amount > 0)
          .map(wager => (
          <div
            key={wager.id}
            className="relative overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-900/20 via-aurex-obsidian-800 to-orange-500/10"
          >
            <div className="relative p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm sm:text-base">
                      Бонусный баланс: {bonusStatus.bonus_balance.toLocaleString('ru-RU')} ₽
                    </h4>
                    <p className="text-aurex-platinum-400 text-xs sm:text-sm">
                      Вейджер x{wager.wager_multiplier} &bull; {wager.game_code}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-orange-400 font-bold text-sm sm:text-base">{wager.progress}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-aurex-obsidian-900 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${wager.progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-500"
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-aurex-platinum-500">
                <span>Отыграно: {wager.wager_completed.toLocaleString('ru-RU')} ₽</span>
                <span>Нужно: {wager.wager_required.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
