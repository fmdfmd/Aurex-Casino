import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Users, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface CategoryCardProps {
  title: string;
  onlineCount: number;
  href: string;
  gradient: string;
  image?: string; // Main background image or character
  buttonText?: string;
  games?: Array<{ id: string | number; image?: string; name: string }>; // Small thumbnails
  isSport?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export default function CategoryCard({
  title,
  onlineCount,
  href,
  gradient,
  image,
  buttonText = 'Играть',
  games = [],
  isSport = false,
  onClick
}: CategoryCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-3xl ${gradient} border border-white/5 shadow-xl group h-full min-h-[280px] flex flex-col`}>
      {/* Background Pattern/Overlay */}
      <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none"></div>
      
      {/* Content Container */}
      <div className="relative z-10 p-6 flex flex-col h-full justify-between">
        
        {/* Header: Title & Online Count */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-3xl font-black text-white mb-2 tracking-tight drop-shadow-md" style={{ fontFamily: 'Cinzel, serif' }}>
              {title}
            </h3>
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full w-fit border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
              <span className="text-xs font-medium text-green-400">{onlineCount.toLocaleString()} игроков</span>
            </div>
          </div>

          {/* Play Button (Top Right on Desktop) */}
          <Link href={href} onClick={onClick}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex items-center gap-2 bg-aurex-gold-500 hover:bg-aurex-gold-400 text-aurex-obsidian-900 font-bold px-6 py-2.5 rounded-xl transition-colors shadow-lg shadow-aurex-gold-500/20"
            >
              {buttonText} <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </div>

        {/* Main Image (Character/Theme) */}
        {image && (
          <div className={`absolute ${isSport ? 'right-0 bottom-0 w-3/4 h-full opacity-80' : 'right-[-20px] top-10 w-48 h-48 md:w-64 md:h-64'} pointer-events-none transition-transform duration-500 group-hover:scale-105`}>
             {/* Using a placeholder div if no actual image file is provided yet, or Image component if path is valid */}
             {image.startsWith('/') ? (
                <Image src={image} alt={title} fill className="object-contain object-bottom" />
             ) : (
                <div className="w-full h-full bg-contain bg-no-repeat bg-bottom" style={{ backgroundImage: `url(${image})` }}></div>
             )}
          </div>
        )}

        {/* Games Row (Bottom) - Only for Slots/Live */}
        {!isSport && games.length > 0 && (
          <div className="mt-auto pt-12 relative z-20">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
              {games.slice(0, 4).map((game, idx) => (
                <Link href={`/games/play/${game.id}`} key={idx} className="flex-shrink-0 w-24 md:w-28 group/game">
                  <div className="aspect-[3/4] relative rounded-xl overflow-hidden border border-white/10 shadow-lg bg-aurex-obsidian-800">
                    {game.image ? (
                      <Image 
                        src={game.image} 
                        alt={game.name} 
                        fill 
                        className="object-cover transition-transform duration-300 group-hover/game:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <span className="text-[10px] text-center p-1">{game.name}</span>
                      </div>
                    )}
                    {/* Hover Play Icon */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/game:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-aurex-gold-500 flex items-center justify-center text-black">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] md:text-xs text-center mt-2 text-gray-400 truncate group-hover/game:text-white transition-colors">{game.name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sport Specific Content */}
        {isSport && (
           <div className="mt-auto pt-8 relative z-20">
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/5 max-w-sm">
                 <div className="flex items-center justify-between mb-2 text-sm text-gray-300">
                    <span>⚽️ Premier League</span>
                    <span className="text-red-500 animate-pulse">● LIVE</span>
                 </div>
                 <div className="flex justify-between items-center font-bold text-white">
                    <span>Real Madrid</span>
                    <span className="text-aurex-gold-500 text-lg">2 - 1</span>
                    <span>Barcelona</span>
                 </div>
                 <div className="flex gap-2 mt-3 text-xs font-mono text-gray-400">
                    <span className="bg-white/10 px-2 py-1 rounded">1: 2.45</span>
                    <span className="bg-white/10 px-2 py-1 rounded">X: 3.10</span>
                    <span className="bg-white/10 px-2 py-1 rounded">2: 2.85</span>
                 </div>
              </div>
           </div>
        )}

        {/* Mobile Play Button (Bottom) */}
        <Link href={href} onClick={onClick} className="md:hidden mt-4 w-full">
          <button className="w-full bg-aurex-gold-500 text-aurex-obsidian-900 font-bold py-3 rounded-xl shadow-lg">
            {buttonText}
          </button>
        </Link>

      </div>
    </div>
  );
}
