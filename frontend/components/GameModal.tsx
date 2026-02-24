import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X, ShieldAlert } from 'lucide-react';
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
      document.body.classList.add('game-active');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('game-active');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('game-active');
    };
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
        const payload: any = {
          gameCode: game.pageCode || game.id,
          systemId: (game as any).systemId,
          language: 'ru',
          mode
        };
        if (mode === 'real') {
          payload.currency = (user as any)?.currency || 'RUB';
        }
        const resp = await axios.post('/api/slots/start-game', payload);

        const html = resp.data?.data?.html;
        if (!html) throw new Error('Сервер не вернул HTML-фрагмент');

        const frameResp = await axios.post('/api/slots/game-frame', { html });
        const token = frameResp.data?.token;
        if (!token) throw new Error('Не удалось создать игровую сессию');

        setGameFrameUrl(`/api/slots/game-frame/${token}`);
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
      setShowVpnHint(false);
    }
  }, [isOpen]);

  // VPN hint: show after 10s if game iframe is open (in case it fails to load)
  const [showVpnHint, setShowVpnHint] = useState(false);
  const vpnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (vpnTimerRef.current) clearTimeout(vpnTimerRef.current);
    if (gameFrameUrl) {
      vpnTimerRef.current = setTimeout(() => setShowVpnHint(true), 10000);
    } else {
      setShowVpnHint(false);
    }
    return () => { if (vpnTimerRef.current) clearTimeout(vpnTimerRef.current); };
  }, [gameFrameUrl]);

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
          <>
            <iframe
              className="absolute inset-0 w-full h-full border-0"
              src={gameFrameUrl}
              allow="autoplay; fullscreen; camera; microphone; encrypted-media; clipboard-write; web-share"
              allowFullScreen
            />
            {showVpnHint && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-slide-up max-w-sm w-[calc(100%-2rem)]">
                <div className="flex items-center gap-3 bg-gray-900/95 backdrop-blur-md border border-yellow-500/30 rounded-xl px-4 py-3 shadow-lg shadow-black/40">
                  <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0" />
                  <p className="text-xs text-gray-300 leading-snug">
                    <span className="text-white font-semibold">Игра не загружается?</span>{' '}
                    Попробуйте включить VPN
                  </p>
                  <button
                    onClick={() => setShowVpnHint(false)}
                    className="p-1 text-gray-500 hover:text-white transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
