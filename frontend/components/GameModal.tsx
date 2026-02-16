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
  const [loadError, setLoadError] = useState('');
  const { user } = useAuthStore();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // On mobile, go fullscreen by default for better UX
      const isMobile = window.innerWidth < 768;
      if (isMobile) setIsFullscreen(true);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'F11') { e.preventDefault(); setIsFullscreen(f => !f); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch game HTML from backend
  useEffect(() => {
    const run = async () => {
      if (!game || !isOpen) return;
      setIsLoading(true);
      setGameHtml('');
      setLoadError('');

      try {
        const currency = (user as any)?.currency || 'USD';
        const resp = await axios.post('/api/slots/start-game', {
          gameCode: game.id,
          systemId: (game as any).systemId,
          currency,
          language: 'en',
          mode
        });

        const html = resp.data?.data?.html;
        if (!html) throw new Error('Сервер не вернул HTML-фрагмент');
        setGameHtml(html);
      } catch (e: any) {
        console.error('Failed to start game:', e);
        const msg = e?.response?.data?.error || e?.message || 'Не удалось запустить игру';
        setLoadError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [game, mode, isOpen, user]);

  // Write HTML into a sandboxed iframe (avoids CSP issues, works on mobile)
  useEffect(() => {
    if (!isOpen || !gameHtml || !iframeRef.current) return;
    const iframe = iframeRef.current;
    
    // Build a full HTML document for the iframe
    // Force any inner iframes/divs/objects to fill the entire viewport
    const doc = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}
iframe,object,embed,div.game-container,.game-frame{
  width:100%!important;height:100%!important;
  position:absolute!important;top:0!important;left:0!important;
  border:0!important;
}
body>iframe,body>div,body>object,body>embed{
  width:100%!important;height:100%!important;
  position:absolute!important;top:0!important;left:0!important;
  border:0!important;
}
</style>
</head><body>${gameHtml}</body></html>`;

    // Use srcdoc for inline HTML — bypasses CSP restrictions on script-src
    iframe.srcdoc = doc;
  }, [isOpen, gameHtml]);

  // Golden Drops — only during real play
  useEffect(() => {
    if (!isOpen || mode !== 'real' || !user) return;
    const interval = setInterval(() => {
      if (typeof (window as any).triggerGoldenDrop === 'function') {
        (window as any).triggerGoldenDrop();
      }
    }, 120000);
    return () => clearInterval(interval);
  }, [isOpen, mode, user]);

  const toggleFullscreen = () => setIsFullscreen(f => !f);
  const handleModeSwitch = (newMode: 'demo' | 'real') => onModeChange(newMode);

  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className={`
        flex flex-col bg-black overflow-hidden transition-all duration-200
        ${isFullscreen 
          ? 'fixed inset-0' 
          : 'fixed inset-0 md:inset-4 md:rounded-lg'
        }
      `}>
        {/* Header — compact on mobile */}
        <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 bg-gray-900/95 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm md:text-lg font-bold text-white truncate">{game?.name || 'Игра'}</h2>
            <span className="text-xs text-gray-500 hidden md:inline">{game?.provider || ''}</span>
          </div>
          
          {/* Mode Switch — smaller on mobile */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <div className="flex bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => handleModeSwitch('demo')}
                className={`px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                  mode === 'demo' ? 'bg-yellow-500 text-black' : 'text-gray-400'
                }`}
              >
                Демо
              </button>
              <button
                onClick={() => handleModeSwitch('real')}
                className={`px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                  mode === 'real' ? 'bg-purple-600 text-white' : 'text-gray-400'
                }`}
              >
                Реальные
              </button>
            </div>

            <button onClick={toggleFullscreen} className="p-1.5 md:p-2 text-gray-400 hover:text-white hidden md:block">
              {isFullscreen ? <Minimize2 className="w-4 h-4 md:w-5 md:h-5" /> : <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
            <button onClick={onClose} className="p-1.5 md:p-2 text-gray-400 hover:text-white">
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* Game Frame — takes all remaining space */}
        <div className="flex-1 relative bg-black min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500 mx-auto mb-3"></div>
                <p className="text-gray-400 text-sm">Загрузка игры...</p>
              </div>
            </div>
          ) : loadError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <div className="text-red-500 text-4xl mb-3">⚠</div>
                <p className="text-white font-bold mb-1">Не удалось загрузить игру</p>
                <p className="text-gray-400 text-sm mb-4">{loadError}</p>
                <button onClick={onClose} className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-bold text-sm">
                  Закрыть
                </button>
              </div>
            </div>
          ) : gameHtml ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
              allow="autoplay; fullscreen"
              title={game?.name || 'Game'}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}