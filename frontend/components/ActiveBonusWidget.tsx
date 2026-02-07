import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, 
  Percent, 
  Clock, 
  X, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Trophy,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface ActiveBonus {
  id: number;
  type: string;
  amount: number;
  wageringRequired: number;
  wageringCompleted: number;
  progress: number;
  status: string;
  expiresAt: string;
}

export default function ActiveBonusWidget() {
  const { token } = useAuthStore();
  const [bonuses, setBonuses] = useState<ActiveBonus[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchBonuses();
      // Обновляем каждые 30 секунд
      const interval = setInterval(fetchBonuses, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchBonuses = async () => {
    try {
      const res = await fetch('/api/bonuses/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBonuses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch bonuses:', error);
    }
    setIsLoading(false);
  };

  const cancelBonus = async (bonusId: number) => {
    if (!confirm('Отменить бонус? Бонусный баланс будет аннулирован.')) return;
    
    try {
      const res = await fetch(`/api/bonuses/${bonusId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchBonuses();
      }
    } catch (error) {
      console.error('Failed to cancel bonus:', error);
    }
  };

  const formatBonusType = (type: string) => {
    const types: Record<string, string> = {
      'deposit_1': '1-й депозит',
      'deposit_2': '2-й депозит',
      'deposit_3': '3-й депозит',
      'deposit_4': '4-й депозит',
      'reload': 'Reload',
      'cashback': 'Кэшбэк',
      'loyalty_shop': 'Магазин VIP',
      'admin_bonus': 'Бонус от казино',
      'promo': 'Промокод'
    };
    return types[type] || type;
  };

  const formatTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Истёк';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}д ${hours}ч`;
    return `${hours}ч`;
  };

  if (isLoading || bonuses.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="bg-gradient-to-r from-aurex-obsidian-800 via-purple-900/30 to-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-aurex-gold-500/5 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aurex-gold-500 to-amber-600 flex items-center justify-center">
              <Gift className="w-5 h-5 text-aurex-obsidian-900" />
            </div>
            <div className="text-left">
              <div className="text-white font-bold">Активные бонусы</div>
              <div className="text-sm text-aurex-platinum-400">
                {bonuses.length} {bonuses.length === 1 ? 'бонус' : 'бонусов'} в отыгрыше
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-aurex-platinum-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-aurex-platinum-400" />
          )}
        </button>

        {/* Bonuses List */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-aurex-gold-500/20"
            >
              <div className="p-4 space-y-4">
                {bonuses.map((bonus) => (
                  <div
                    key={bonus.id}
                    className="bg-aurex-obsidian-900/50 rounded-xl p-4 border border-aurex-gold-500/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-aurex-gold-500" />
                          <span className="text-white font-medium">
                            {formatBonusType(bonus.type)}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-aurex-gold-400 mt-1">
                          ₽{(bonus.amount || 0).toLocaleString('ru-RU')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-aurex-platinum-400 text-sm">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatTimeLeft(bonus.expiresAt)}</span>
                        </div>
                        <button
                          onClick={() => cancelBonus(bonus.id)}
                          className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center space-x-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Отменить</span>
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-aurex-platinum-400">Прогресс отыгрыша</span>
                        <span className="text-white font-medium">
                          {(bonus.progress || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="relative h-3 bg-aurex-obsidian-700 rounded-full overflow-hidden">
                          <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(bonus.progress || 0, 100)}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className={`absolute inset-y-0 left-0 rounded-full ${
                            bonus.progress >= 100
                              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                              : 'bg-gradient-to-r from-aurex-gold-500 to-amber-400'
                          }`}
                        />
                        {/* Glow effect */}
                        <div 
                          className="absolute inset-y-0 left-0 bg-aurex-gold-500/30 blur-sm rounded-full"
                          style={{ width: `${Math.min(bonus.progress || 0, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-aurex-platinum-500">
                        <span>
                          ₽{(bonus.wageringCompleted || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                        </span>
                        <span>
                          ₽{(bonus.wageringRequired || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>

                    {/* Completion message */}
                        {(bonus.progress || 0) >= 100 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-3 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center space-x-2"
                      >
                        <Trophy className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-medium">
                          Бонус отыгран! Деньги на балансе
                        </span>
                      </motion.div>
                    )}
                  </div>
                ))}

                {/* Info */}
                <div className="flex items-start space-x-2 p-3 bg-aurex-obsidian-900/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-aurex-platinum-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-aurex-platinum-500">
                    Делайте ставки чтобы отыграть бонус. Прогресс обновляется автоматически с каждой ставкой.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
