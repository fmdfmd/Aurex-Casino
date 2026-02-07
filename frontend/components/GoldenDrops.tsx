import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Gift, Star, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface GoldenDrop {
  id: string;
  type: 'freespins' | 'bonus' | 'cashback' | 'multiplier';
  value: string;
  description: string;
  icon: string;
}

const dropTypes: GoldenDrop[] = [
  { id: '1', type: 'freespins', value: '10 FS', description: 'Бесплатные вращения', icon: '🎰' },
  { id: '2', type: 'freespins', value: '25 FS', description: 'Бесплатные вращения', icon: '🎰' },
  { id: '3', type: 'freespins', value: '50 FS', description: 'Супер фриспины', icon: '💫' },
  { id: '4', type: 'bonus', value: '₽500', description: 'Бонус на баланс', icon: '💰' },
  { id: '5', type: 'bonus', value: '₽1,000', description: 'Бонус на баланс', icon: '💎' },
  { id: '6', type: 'cashback', value: '5%', description: 'Дополнительный кэшбэк', icon: '🔄' },
  { id: '7', type: 'multiplier', value: 'x2', description: 'Множитель выигрыша', icon: '⚡' },
];

export default function GoldenDrops() {
  const { isAuthenticated, user } = useAuthStore();
  const [isDropActive, setIsDropActive] = useState(false);
  const [currentDrop, setCurrentDrop] = useState<GoldenDrop | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  // Случайное выпадение дропа
  const triggerDrop = useCallback(() => {
    if (!isAuthenticated || isDropActive) return;

    // Случайный выбор награды (взвешенный)
    const weights = [30, 25, 10, 20, 10, 3, 2]; // Вероятности
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    let selectedIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    setCurrentDrop(dropTypes[selectedIndex]);
    setIsDropActive(true);

    // Создаём частицы для эффекта
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticles(newParticles);
  }, [isAuthenticated, isDropActive]);

  // Golden Drops — будет работать через backend API (Slotegrator callback)
  // Пока отключено: дроп должен подтверждаться сервером и реально зачисляться на баланс
  // TODO: Подключить к backend POST /api/golden-drops/claim после интеграции слотов
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Заглушка — дроп не срабатывает до подключения backend
    (window as any).triggerGoldenDrop = () => {
      // Disabled until backend integration
      console.log('[GoldenDrops] Trigger disabled — waiting for backend API');
    };

    return () => {
      delete (window as any).triggerGoldenDrop;
    };
  }, [isAuthenticated]);

  const handleReveal = () => {
    setIsRevealing(true);
    
    setTimeout(() => {
      setIsRevealing(false);
      toast.success(
        `Golden Drop! Вы получили ${currentDrop?.value}`,
        { 
          icon: currentDrop?.icon,
          duration: 5000,
          style: {
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            color: '#fff',
            border: '1px solid #D4AF37',
          }
        }
      );
      setIsDropActive(false);
      setCurrentDrop(null);
    }, 2000);
  };

  const handleClose = () => {
    setIsDropActive(false);
    setCurrentDrop(null);
  };

  if (!isDropActive || !currentDrop) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop with particles */}
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md">
          {/* Animated particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-2 bg-aurex-gold-500 rounded-full"
              initial={{ 
                x: `${particle.x}vw`, 
                y: '100vh',
                opacity: 0,
                scale: 0
              }}
              animate={{ 
                y: `${particle.y}vh`,
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{ 
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                repeat: Infinity,
                repeatDelay: Math.random() * 2
              }}
              style={{
                boxShadow: '0 0 10px #D4AF37, 0 0 20px #D4AF37'
              }}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-aurex-platinum-400 hover:text-white transition-colors"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Main content */}
        <div className="relative z-10 text-center">
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-3 mb-4"
            >
              <Sparkles className="w-8 h-8 text-aurex-gold-500" />
              <span className="text-3xl md:text-4xl font-black text-aurex-gold-500 drop-shadow-lg">
                GOLDEN DROPS
              </span>
              <Sparkles className="w-8 h-8 text-aurex-gold-500" />
            </motion.div>
            <p className="text-aurex-platinum-400 text-lg">
              Поздравляем! Вам выпала случайная награда!
            </p>
          </motion.div>

          {/* Prize Box */}
          {!isRevealing ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8, delay: 0.4 }}
              className="relative cursor-pointer group"
              onClick={handleReveal}
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 bg-aurex-gold-500 rounded-3xl blur-3xl opacity-30"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              {/* Box */}
              <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-aurex-gold-500 via-aurex-gold-400 to-aurex-gold-600 rounded-3xl shadow-aurex-gold"
                  animate={{ 
                    rotateY: [0, 10, -10, 0],
                    rotateX: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 360]
                      }}
                      transition={{ 
                        scale: { duration: 1.5, repeat: Infinity },
                        rotate: { duration: 10, repeat: Infinity, ease: 'linear' }
                      }}
                    >
                      <Gift className="w-24 h-24 md:w-32 md:h-32 text-aurex-obsidian-900" />
                    </motion.div>
                  </div>
                  
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-3xl"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  />
                </motion.div>
              </div>

              <motion.p
                className="mt-8 text-white text-xl font-bold"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Нажмите, чтобы открыть!
              </motion.p>
            </motion.div>
          ) : (
            // Revealing animation
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-9xl mb-6"
              >
                {currentDrop.icon}
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="text-5xl md:text-6xl font-black text-aurex-gold-500 mb-4 drop-shadow-lg">
                  {currentDrop.value}
                </div>
                <div className="text-xl text-aurex-platinum-300">
                  {currentDrop.description}
                </div>
              </motion.div>

              {/* Celebration particles */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-4 h-4 rounded-full"
                  style={{
                    background: ['#D4AF37', '#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4'][i % 5],
                    left: '50%',
                    top: '50%',
                  }}
                  initial={{ x: 0, y: 0, scale: 0 }}
                  animate={{ 
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 1.5,
                    delay: 0.3 + i * 0.05
                  }}
                />
              ))}
            </motion.div>
          )}

          {/* Stats */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex justify-center gap-8"
          >
            <div className="text-center">
              <div className="text-aurex-gold-500 text-2xl font-bold">Golden</div>
              <div className="text-aurex-platinum-500 text-sm">Drops</div>
            </div>
            <div className="text-center">
              <div className="text-aurex-gold-500 text-2xl font-bold">AUREX</div>
              <div className="text-aurex-platinum-500 text-sm">Empire</div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
