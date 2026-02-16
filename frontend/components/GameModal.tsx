import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
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
  const [gameHtml, setGameHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showClose, setShowClose] = useState(true);
  const { user } = useAuthStore();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock body scroll and set viewport-fit when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Ensure viewport-fit=cover for iOS safe areas
      const meta = document.querySelector('meta[name="viewport"]');
      const origContent = meta?.getAttribute('content') || '';
      if (meta && !origContent.includes('viewport-fit=cover')) {
        meta.setAttribute('content', origContent + ',viewport-fit=cover');
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Auto-hide close button after 3s, show on tap/move
  useEffect(() => {
    if (!isOpen) return;
    setShowClose(true);

    const startHideTimer = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowClose(false), 3000);
    };

    const handleInteraction = () => {
      setShowClose(true);
      startHideTimer();
    };

    startHideTimer();
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
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
        const currency = (user as any)?.currency || 'RUB';
        const resp = await axios.post('/api/slots/start-game', {
          gameCode: game.id,
          systemId: (game as any).systemId,
          currency,
          language: 'ru',
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

  // Write HTML into a sandboxed iframe
  useEffect(() => {
    if (!isOpen || !gameHtml || !iframeRef.current) return;
    const iframe = iframeRef.current;
    
    const doc = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>
html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}
body{
  padding-top:env(safe-area-inset-top,0);
  padding-bottom:env(safe-area-inset-bottom,0);
  padding-left:env(safe-area-inset-left,0);
  padding-right:env(safe-area-inset-right,0);
  box-sizing:border-box;
}
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

    iframe.srcdoc = doc;
  }, [isOpen, gameHtml]);

  if (!isOpen || !game) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Full-screen game iframe */}
      <div className="w-full h-full relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">Загрузка игры...</p>
              <p className="text-gray-600 text-xs mt-1">{game?.name}</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6 max-w-md">
              <div className="text-red-500 text-5xl mb-4">⚠</div>
              <p className="text-white font-bold text-lg mb-2">Не удалось загрузить игру</p>
              <p className="text-gray-400 text-sm mb-6">{loadError}</p>
              <button onClick={onClose} className="px-8 py-3 bg-yellow-500 text-black rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors">
                Назад к играм
              </button>
            </div>
          </div>
        ) : gameHtml ? (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; camera; microphone; display-capture; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="no-referrer-when-downgrade"
            title={game?.name || 'Game'}
          />
        ) : null}

        {/* Floating close button — auto-hides after 3s, shows on mouse/touch */}
        <button 
          onClick={onClose}
          className={`
            fixed top-3 left-3 z-[60] 
            w-10 h-10 rounded-full 
            bg-black/60 backdrop-blur-sm border border-white/20
            flex items-center justify-center
            hover:bg-red-600/80 hover:border-red-500/50
            transition-all duration-300
            ${showClose ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
          `}
          title="Закрыть игру (Esc)"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
