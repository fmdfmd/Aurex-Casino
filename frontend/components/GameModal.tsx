import React, { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Play, DollarSign } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: any;
  mode: 'demo' | 'real';
  onModeChange: (mode: 'demo' | 'real') => void;
}

export default function GameModal({ isOpen, onClose, game, mode, onModeChange }: GameModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameUrl, setGameUrl] = useState('');
  const { user } = useAuthStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'F11') {
        e.preventDefault();
        setIsFullscreen(!isFullscreen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  useEffect(() => {
    if (game && isOpen) {
      // Формируем URL для игры
      const slotsApiBase = process.env.NEXT_PUBLIC_SLOTS_API_URL || 'https://int.apichannel.cloud';
      const baseUrl = `${slotsApiBase}/games/${game.gameUrl}`;
      
      // Определяем user_id и auth_token в зависимости от режима
      let userId = 'aurex_demo_001'; // По умолчанию демо
      let authToken = 'demo';
      
      if (mode === 'demo') {
        userId = 'aurex_demo_001'; // B2B ID демо пользователя
        authToken = 'demo';
      } else if (user) {
        // В реальном режиме используем данные текущего пользователя
        userId = user.odid || user.id;
        authToken = 'real_token_' + user.id;
      }
      
      const operatorId = process.env.NEXT_PUBLIC_OPERATOR_ID || '40282';
      const params = new URLSearchParams({
        operator_id: operatorId,
        user_id: userId,
        auth_token: authToken,
        currency: 'RUB',
        lang: 'ru',
        mode: mode === 'demo' ? 'demo' : 'real',
        callback_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/game-callback/`
      });
      
      setGameUrl(`${baseUrl}?${params.toString()}`);
    }
  }, [game, mode, isOpen, user]);

  // Golden Drops - выпадает только во время РЕАЛЬНОЙ игры (не демо)
  useEffect(() => {
    if (!isOpen || mode !== 'real' || !user) return;

    // Проверяем шанс Golden Drop каждые 2 минуты активной игры
    const interval = setInterval(() => {
      if (typeof (window as any).triggerGoldenDrop === 'function') {
        (window as any).triggerGoldenDrop();
      }
    }, 120000); // 2 минуты

    return () => clearInterval(interval);
  }, [isOpen, mode, user]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleModeSwitch = (newMode: 'demo' | 'real') => {
    onModeChange(newMode);
  };

  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
      <div className={`
        bg-dark-200 rounded-lg overflow-hidden transition-all duration-300
        ${isFullscreen 
          ? 'fixed inset-4' 
          : 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[80vh] max-w-6xl'
        }
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-dark-100 border-b border-gray-800">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-white">{game?.name || 'Игра'}</h2>
            <span className="text-sm text-gray-400">{game?.provider || ''}</span>
          </div>
          
          {/* Mode Switch */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-dark-300 rounded-lg p-1">
              <button
                onClick={() => handleModeSwitch('demo')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'demo'
                    ? 'bg-casino-gold text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Play className="w-4 h-4 inline mr-1" />
                Демо
              </button>
              <button
                onClick={() => handleModeSwitch('real')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'real'
                    ? 'bg-casino-purple text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-1" />
                Реальные
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Свернуть' : 'На весь экран'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Game Frame */}
        <div className="flex-1 relative" style={{ height: isFullscreen ? 'calc(100vh - 200px)' : 'calc(80vh - 120px)' }}>
          {gameUrl ? (
            <iframe
              src={gameUrl}
              className="w-full h-full border-0"
              allow="fullscreen; autoplay; encrypted-media"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
              title={`${game.name} - ${mode === 'demo' ? 'Демо' : 'Реальные деньги'}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-casino-gold mx-auto mb-4"></div>
                <p className="text-gray-400">Загрузка игры...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-dark-100 border-t border-gray-800">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-gray-400">
              {game?.rtp && <span>RTP: {game.rtp}%</span>}
              {game?.lines && <span>Линии: {game.lines}</span>}
              {mode === 'demo' && (
                <span className="text-casino-gold">🎮 Демо режим - бесплатно</span>
              )}
              {mode === 'real' && (
                <span className="text-casino-purple">💰 Реальные деньги</span>
              )}
            </div>
            <div className="text-gray-500">
              ESC - закрыть • F11 - полный экран
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}