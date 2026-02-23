import React, { useState, useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
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
  const [gameFrameUrl, setGameFrameUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const run = async () => {
      if (!game || !isOpen) return;
      setIsLoading(true);
      setGameFrameUrl('');
      setLoadError('');

      try {
        const currency = (user as any)?.currency || 'RUB';
        const resp = await axios.post('/api/slots/start-game', {
          gameCode: game.pageCode || game.id,
          systemId: (game as any).systemId,
          currency,
          language: 'ru',
          mode
        });

        const html = resp.data?.data?.html;
        if (!html) throw new Error('Сервер не вернул HTML-фрагмент');

        const frameResp = await axios.post('/api/slots/game-frame', { html });
        const token = frameResp.data?.token;
        if (!token) throw new Error('Не удалось создать игровую сессию');

        const frameUrl = `/api/slots/game-frame/${token}`;

        if (html.includes('check') && html.includes('wscenter') && html.includes("createElement('iframe')")) {
          window.open(frameUrl, '_blank');
          setLoadError('__opened__');
        } else {
          setGameFrameUrl(frameUrl);
        }
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

  useEffect(() => {
    if (!isOpen) {
      setGameFrameUrl('');
      setLoadError('');
    }
  }, [isOpen]);

  if (!isOpen || !game) return null;

  return (
    <div 
      className="fixed left-0 right-0 bottom-0 z-40 bg-black flex flex-col"
      style={{ top: '64px' }}
    >
      {/* Thin bar: back + name + close */}
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

      {/* Game content area */}
      <div className="flex-1 relative min-h-0 bg-black">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">Загрузка игры...</p>
            </div>
          </div>
        ) : loadError === '__opened__' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6 max-w-md">
              <div className="text-yellow-500 text-5xl mb-4">🎮</div>
              <p className="text-white font-bold text-lg mb-2">Игра открыта в новой вкладке</p>
              <p className="text-gray-400 text-sm mb-6">Если вкладка не открылась, разрешите всплывающие окна для этого сайта</p>
              <button onClick={onClose} className="px-8 py-3 bg-yellow-500 text-black rounded-xl font-bold text-sm">
                Назад к играм
              </button>
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
        ) : gameFrameUrl ? (
          <iframe
            className="absolute inset-0 w-full h-full border-0"
            src={gameFrameUrl}
            allow="autoplay; fullscreen; camera; microphone; encrypted-media; clipboard-write; web-share"
            allowFullScreen
          />
        ) : null}
      </div>
    </div>
  );
}
