import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Play, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface FreeroundsBannerProps {
  onPlayGame: (game: any) => void;
  allGames: any[];
}

export default function FreeroundsBanner({ onPlayGame, allGames }: FreeroundsBannerProps) {
  const { token, isAuthenticated } = useAuthStore();
  const [freerounds, setFreerounds] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const fetchFreerounds = async () => {
      try {
        const response = await fetch('/api/slots/freerounds', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.data?.length > 0) {
          setFreerounds(data.data);
        }
      } catch {
        // Silently fail - no freerounds is fine
      }
    };

    fetchFreerounds();
    // Check every 60 seconds
    const interval = setInterval(fetchFreerounds, 60000);
    return () => clearInterval(interval);
  }, [token, isAuthenticated]);

  if (dismissed || freerounds.length === 0) return null;

  // Try to find the matching game in allGames
  const findGame = (gameCode: string) => {
    return allGames.find(g =>
      g.gameCode === gameCode || g.id === gameCode
    );
  };

  const totalSpins = freerounds.reduce((sum, fr) => sum + (fr.FreespinsLeft || fr.Count || 0), 0);
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
        className="mb-6"
      >
        <div className="relative overflow-hidden rounded-2xl border border-aurex-gold-500/30 bg-gradient-to-r from-purple-900/40 via-aurex-obsidian-800 to-aurex-gold-500/10">
          {/* Sparkle effects */}
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

          {/* Mobile play button */}
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
      </motion.div>
    </AnimatePresence>
  );
}
