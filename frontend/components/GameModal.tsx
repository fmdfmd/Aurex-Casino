import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, Play, DollarSign } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: any;
  mode: 'demo' | 'real';
  onModeChange: (mode: 'demo' | 'real') => void;
}

export default function GameModal({ isOpen, onClose, game, mode, onModeChange }: GameModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameHtml, setGameHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    const run = async () => {
      if (!game || !isOpen) return;
      setIsLoading(true);
      setGameHtml('');

      try {
        const currency = (user as any)?.currency || 'RUB';
        const resp = await axios.post('/api/slots/start-game', {
          gameCode: game.id,
          systemId: (game as any).systemId,
          currency,
          language: 'en',
          mode
        });

        const html = resp.data?.data?.html;
        if (!html) throw new Error('No HTML fragment received');

        setGameHtml(html);
      } catch (e: any) {
        console.error('Failed to start game:', e);
        toast.error(e?.response?.data?.error || e?.message || 'Не удалось запустить игру');
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [game, mode, isOpen, user]);

  // Inject HTML and execute scripts (Fundist AuthHTML returns HTML fragment with scripts)
  useEffect(() => {
    if (!isOpen || !gameHtml) return;
    const el = containerRef.current;
    if (!el) return;

    // Reset
    el.innerHTML = gameHtml;

    // Recreate scripts so they execute
    const scripts = Array.from(el.querySelectorAll('script'));
    for (const oldScript of scripts) {
      const s = document.createElement('script');
      for (const attr of Array.from(oldScript.attributes)) {
        s.setAttribute(attr.name, attr.value);
      }
      if (oldScript.textContent) s.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(s, oldScript);
    }
  }, [isOpen, gameHtml]);

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
          {!isLoading && gameHtml ? (
            <div ref={containerRef} className="w-full h-full" />
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