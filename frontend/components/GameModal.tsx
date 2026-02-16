import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft } from 'lucide-react';
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
  const { user } = useAuthStore();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Lock body scroll when game is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Keyboard: Escape to close
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

  // Write HTML into iframe via srcdoc
  useEffect(() => {
    if (!isOpen || !gameHtml || !iframeRef.current) return;
    const iframe = iframeRef.current;
    
    const doc = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
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

    iframe.srcdoc = doc;
  }, [isOpen, gameHtml]);

  if (!isOpen || !game) return null;

  return (
    <div 
      className="fixed left-0 right-0 bottom-0 z-40 bg-black flex flex-col"
      style={{ top: '64px' }}
    >
      {/* Thin game bar with back button and game name */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900/95 border-b border-gray-800 shrink-0">
        <button 
          onClick={onClose}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-medium">Назад</span>
        </button>
        <span className="text-xs text-gray-500 truncate max-w-[50%]">{game?.name}</span>
        <button 
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Game iframe — fills all remaining space below the bar */}
      <div className="flex-1 relative min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">Загрузка игры...</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6 max-w-md">
              <div className="text-red-500 text-5xl mb-4">⚠</div>
              <p className="text-white font-bold text-lg mb-2">Не удалось загрузить</p>
              <p className="text-gray-400 text-sm mb-6">{loadError}</p>
              <button onClick={onClose} className="px-8 py-3 bg-yellow-500 text-black rounded-xl font-bold text-sm">
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
      </div>
    </div>
  );
}
