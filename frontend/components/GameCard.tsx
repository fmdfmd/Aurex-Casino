import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Heart, Star, DollarSign } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface Game {
  id: string | number;
  name: string;
  provider: string;
  image?: string;
  imageUrl?: string;
  rtp?: number;
  category?: string;
  isNew?: boolean;
  isHot?: boolean;
  jackpot?: number;
  popularity?: number;
  mode?: 'demo' | 'real';
}

interface GameCardProps {
  game: Game;
  onPlay?: (game: Game & { mode?: 'demo' | 'real' }) => void;
  onFavorite?: (game: Game) => void;
  isFavorite?: boolean;
  showRTP?: boolean;
  showProvider?: boolean;
}

// Генерируем красивые градиенты для игр без изображений (детерминированно)
const getGameGradient = (gameId: string | number) => {
  const gradients = [
    'from-purple-600 to-pink-600',
    'from-blue-600 to-cyan-600', 
    'from-green-600 to-emerald-600',
    'from-yellow-600 to-orange-600',
    'from-red-600 to-rose-600',
    'from-indigo-600 to-purple-600',
    'from-cyan-600 to-blue-600',
    'from-emerald-600 to-teal-600'
  ];
  // Используем стабильную функцию для выбора градиента
  const hash = typeof gameId === 'string' 
    ? String(gameId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : Number(gameId) || 0;
  return gradients[Math.abs(hash) % gradients.length];
};

export default function GameCard({ game, onPlay, onFavorite, isFavorite = false }: GameCardProps) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);

  const handlePlay = () => {
    if (onPlay) {
      onPlay(game);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFavorite) {
      onFavorite(game);
    }
  };

  const imageUrl = game.image || game.imageUrl;
  const gradient = getGameGradient(game.id);

  return (
    <div className="game-card bg-dark-100 rounded-lg overflow-hidden group cursor-pointer border border-gray-800 hover:border-casino-gold transition-all duration-300"
         onClick={handlePlay}>
      {/* Game Image */}
      <div className={`relative aspect-[3/4] bg-gradient-to-br ${gradient}`}>
        {!imageError && imageUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={imageUrl}
              alt={game.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              onError={() => setImageError(true)}
              unoptimized
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center p-4">
              <div className="text-5xl mb-3">🎰</div>
              <div className="text-sm font-bold leading-tight">{game.name}</div>
              <div className="text-xs opacity-75 mt-1">{game.provider}</div>
            </div>
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (onPlay) onPlay({ ...game, mode: 'demo' });
                }}
                className="bg-casino-gold text-black px-4 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-casino-gold-dark transition-colors transform hover:scale-105 flex-1"
              >
                <Play className="w-4 h-4" />
                {t('games.demo')}
              </button>
              <button 
                onClick={() => {
                  if (onPlay) onPlay({ ...game, mode: 'real' });
                }}
                className="bg-casino-purple text-white px-4 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-casino-purple-dark transition-colors transform hover:scale-105 flex-1"
              >
                <Play className="w-4 h-4" />
                {t('games.play')}
              </button>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {game.isNew && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
              ✨ NEW
            </span>
          )}
          {game.isHot && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
              🔥 HOT
            </span>
          )}
          {game.jackpot && (
            <span className="bg-casino-gold text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
              💰 {(game.jackpot / 1000000).toFixed(1)}M₽
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={handleFavorite}
          className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-75 transition-all backdrop-blur-sm"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white hover:text-red-300'}`} />
        </button>
      </div>

      {/* Game Info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-sm mb-2 truncate">{game.name}</h3>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="truncate">{game.provider}</span>
          {game.rtp && (
            <div className="flex items-center gap-1 text-casino-gold">
              <Star className="w-3 h-3 fill-current" />
              <span className="font-medium">{game.rtp}%</span>
            </div>
          )}
        </div>
        {game.popularity && (
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div 
                className="bg-casino-gold h-1 rounded-full transition-all duration-500" 
                style={{ width: `${game.popularity}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">{t('games.popularity')}: {game.popularity}%</div>
          </div>
        )}
      </div>
    </div>
  );
}