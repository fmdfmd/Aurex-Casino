import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  SlidersHorizontal,
  TrendingUp,
  Star,
  Clock,
  X,
  Play,
  Flame,
  Gamepad2,
  Trophy,
  Zap,
  ChevronRight
} from 'lucide-react';
import Layout from '../../components/Layout';
import GameCard from '../../components/GameCard';
import GameModal from '../../components/GameModal';
import PromoBannerSlider from '../../components/PromoBannerSlider';
import { useGamesQuery } from '../../hooks/useGames';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/authStore';

import GameCategorySection from '../../components/GameCategorySection';
import { toast } from 'react-hot-toast';

const categories = [
  { id: 'all', nameKey: 'games.allGames', icon: Grid3X3 },
  { id: 'slots', nameKey: 'games.slots', icon: Gamepad2 },
  { id: 'live', nameKey: 'games.liveCasino', icon: Zap },
  { id: 'sport', nameKey: 'games.sport', icon: Trophy },
  { id: 'table', nameKey: 'games.table', icon: List },
  { id: 'crash', nameKey: 'games.crash', icon: TrendingUp },
  { id: 'popular', nameKey: 'games.popular', icon: Flame },
];

const sortOptions = [
  { id: 'popularity', name: 'По популярности', icon: TrendingUp },
  { id: 'newest', name: 'Сначала новые', icon: Clock },
  { id: 'rating', name: 'По рейтингу', icon: Star },
  { id: 'name', name: 'По алфавиту', icon: List },
];

export default function GamesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: gamesData, isLoading } = useGamesQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popularity');
  const [showFilters, setShowFilters] = useState(false);
  const [showProviders, setShowProviders] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [providerSearch, setProviderSearch] = useState('');
  
  // Extract real providers from loaded games (most accurate)
  useEffect(() => {
    if (!allGames || allGames.length === 0) return;
    
    const providerMap: Record<string, number> = {};
    allGames.forEach((game: any) => {
      const name = game.provider;
      if (name && name !== 'Unknown') {
        providerMap[name] = (providerMap[name] || 0) + 1;
      }
    });
    
    // Sort by game count descending
    const sorted = Object.entries(providerMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    
    setProviders(sorted);
  }, [allGames]);
  
  // Game Modal state
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [gameMode, setGameMode] = useState<'demo' | 'real'>('real');
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);

  // Game handlers
  const handleGamePlay = (gameData: any) => {
    setSelectedGame(gameData);
    // Default to 'real' for logged-in users, 'demo' for guests
    setGameMode(gameData.mode || (isAuthenticated ? 'real' : 'demo'));
    setIsGameModalOpen(true);
  };

  const handleGameModalClose = () => {
    setIsGameModalOpen(false);
    setSelectedGame(null);
  };

  const handleGameModeChange = (mode: 'demo' | 'real') => {
    setGameMode(mode);
  };

  // Extract games from API response
  const allGames = useMemo(() => {
    if (!gamesData?.data?.games) {
      return [];
    }
    return gamesData.data.games;
  }, [gamesData]);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let filtered = [...allGames];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(game => 
        game.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      // Basic category filtering logic
      if (selectedCategory === 'new') filtered = filtered.filter(g => g.isNew);
      else if (selectedCategory === 'popular') filtered = filtered.slice(0, 200); // Already sorted by popularity from backend
      else if (selectedCategory === 'jackpot') filtered = filtered.filter(g => g.jackpot);
      // For 'slots', 'live', 'table' - we would need actual category data from API
      // For now, assume 'slots' is default if not specified, 'live' has 'live' in provider or name
      else if (selectedCategory === 'slots') filtered = filtered.filter(g => g.category === 'slots');
      else if (selectedCategory === 'live') filtered = filtered.filter(g => g.category === 'live');
      else if (selectedCategory === 'table') filtered = filtered.filter(g => g.category === 'table');
      else if (selectedCategory === 'sport') filtered = filtered.filter(g => g.category === 'sport');
      else if (selectedCategory === 'crash') filtered = filtered.filter(g => g.category === 'crash');
    }

    // Provider filter
    if (selectedProviders.length > 0) {
      filtered = filtered.filter(game => 
        selectedProviders.includes(game.provider)
      );
    }

    // Sort games
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'popularity':
        // Already sorted by backend (provider tier + Fundist sort)
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rtp || 0) - (a.rtp || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
    }

    return filtered;
  }, [allGames, searchTerm, selectedCategory, selectedProviders, sortBy]);

  const handleProviderToggle = (provider: string) => {
    setSelectedProviders(prev => 
      prev.includes(provider) 
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  };

  // Infinite scroll: show games in batches of 40
  const GAMES_PER_PAGE = 40;
  const [visibleCount, setVisibleCount] = useState(GAMES_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(GAMES_PER_PAGE);
  }, [searchTerm, selectedCategory, selectedProviders, sortBy]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredGames.length) {
          setVisibleCount(prev => Math.min(prev + GAMES_PER_PAGE, filteredGames.length));
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleCount, filteredGames.length]);

  const visibleGames = useMemo(() => filteredGames.slice(0, visibleCount), [filteredGames, visibleCount]);

  // Section Data: top games are first 20 from backend (curated), slot games for the "all games" section
  const topGames = useMemo(() => allGames.slice(0, 20), [allGames]);
  const slotGames = useMemo(() => allGames.filter(g => g.category === 'slots'), [allGames]);

  const handleSportClick = (e: React.MouseEvent) => {
    handleCategoryClick(e, 'sport');
  };

  const handleCategoryClick = (e: React.MouseEvent, category: string) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Войдите, чтобы начать играть!', {
        style: {
          background: '#1F2937',
          color: '#fff',
          border: '1px solid #D4AF37',
        },
        icon: '🔒',
      });
      setTimeout(() => router.push('/login'), 1500);
      return;
    }
    setSelectedCategory(category);
    window.scrollTo({ top: 600, behavior: 'smooth' });
  };

  return (
    <>
      <Head>
        <title>Игры - AUREX Casino</title>
      </Head>
      <Layout>
        <div className="bg-aurex-obsidian-900 min-h-screen pb-20 relative overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 opacity-30 bg-cover bg-center bg-fixed"
            style={{ backgroundImage: 'url(/images/games-bg.jpg)' }}
          ></div>

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-aurex-obsidian-900/50 to-aurex-obsidian-900"></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* 1. Promo Slider (Hero) */}
            <div className="pt-20">
              <PromoBannerSlider />
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-8">

            {/* NEW: Dragon Money Style Category Sections (Wide blocks with game previews) */}
            {!searchTerm && selectedCategory === 'all' && selectedProviders.length === 0 && (
              <div className="space-y-6 mb-12">
                
                {/* SLOTS - Wide Block */}
                <GameCategorySection
                  title="Слоты"
                  onlineCount={1773}
                  href="#"
                  onClick={(e) => handleCategoryClick(e, 'slots')}
                  backgroundImage="/images/slots-bg.jpg"
                  gameImages={[
                    '/images/games/slots/big-bamboo.png',
                    '/images/games/slots/gates-of-olympus.png',
                    '/images/games/slots/sweet-bonanza.png',
                    '/images/games/slots/chaos-crew.png'
                  ]}
                  buttonText="Играть"
                />

                {/* LIVE DEALERS - Wide Block */}
                <GameCategorySection
                  title="Live Dealers"
                  onlineCount={1773}
                  href="#"
                  onClick={(e) => handleCategoryClick(e, 'live')}
                  backgroundImage="/images/live-bg.jpg"
                  gameImages={[
                    '/images/games/live/lightning-roulette.png',
                    '/images/games/live/crazy-time.png',
                    '/images/games/live/blackjack.png',
                    '/images/games/live/monopoly.png'
                  ]}
                  buttonText="Играть"
                />

                {/* SPORT - Wide Block */}
                <GameCategorySection
                  title="Спорт"
                  onlineCount={1773}
                  href="#"
                  onClick={handleSportClick}
                  backgroundImage="/images/sport-bg.jpg"
                  gameImages={[
                    '/images/games/sport/football.png',
                    '/images/games/sport/basketball.png',
                    '/images/games/sport/tennis.png',
                    '/images/games/sport/hockey.png'
                  ]}
                  buttonText="Играть"
                />

              </div>
            )}

            {/* PROVIDER SELECTOR — always visible */}
            <div className="mb-6">
              <button
                onClick={() => setShowProviders(!showProviders)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
                  showProviders || selectedProviders.length > 0
                    ? 'bg-aurex-gold-500/10 border-aurex-gold-500/30 text-aurex-gold-500'
                    : 'bg-aurex-obsidian-800 border-white/10 text-aurex-platinum-400 hover:text-white hover:border-white/20'
                }`}
              >
                <Filter className="w-4 h-4" />
                Провайдеры
                {selectedProviders.length > 0 && (
                  <span className="bg-aurex-gold-500 text-black text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
                    {selectedProviders.length}
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showProviders ? 'rotate-90' : ''}`} />
              </button>

              {/* Selected providers pills */}
              {selectedProviders.length > 0 && !showProviders && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedProviders.map(p => (
                    <button
                      key={p}
                      onClick={() => handleProviderToggle(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-aurex-gold-500/15 border border-aurex-gold-500/30 rounded-lg text-xs text-aurex-gold-500 font-medium hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400 transition-colors"
                    >
                      {p}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedProviders([])}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    Сбросить все
                  </button>
                </div>
              )}

              <AnimatePresence>
                {showProviders && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-4 bg-aurex-obsidian-800/80 backdrop-blur-sm rounded-xl border border-white/10">
                      {/* Search within providers */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Найти провайдера..."
                          value={providerSearch}
                          onChange={(e) => setProviderSearch(e.target.value)}
                          className="w-full bg-aurex-obsidian-900 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                        {providers
                          .filter(p => !providerSearch || p.toLowerCase().includes(providerSearch.toLowerCase()))
                          .map(p => {
                            const count = allGames.filter(g => g.provider === p).length;
                            const isSelected = selectedProviders.includes(p);
                            return (
                              <button
                                key={p}
                                onClick={() => handleProviderToggle(p)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all ${
                                  isSelected
                                    ? 'bg-aurex-gold-500 text-black font-bold shadow-lg shadow-aurex-gold-500/10'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span className="truncate">{p}</span>
                                <span className={`ml-1 text-[10px] ${isSelected ? 'text-black/60' : 'text-gray-600'}`}>{count}</span>
                              </button>
                            );
                          })}
                      </div>
                      {selectedProviders.length > 0 && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                          <span className="text-xs text-gray-500">Выбрано: {selectedProviders.length} провайдер(ов)</span>
                          <button
                            onClick={() => { setSelectedProviders([]); setShowProviders(false); }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Сбросить
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* TOP GAMES section — shown on default view */}
            {!searchTerm && selectedCategory === 'all' && selectedProviders.length === 0 && topGames.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Flame className="w-6 h-6 text-casino-gold" />
                    <h2 className="text-2xl font-bold text-white">Топ игры</h2>
                    <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">HOT</span>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('popular')}
                    className="flex items-center gap-1 text-sm text-aurex-gold-500 hover:text-aurex-gold-400 transition-colors"
                  >
                    Все популярные <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4">
                  {topGames.map((game, i) => (
                    <GameCard key={game.id || i} game={game} onPlay={handleGamePlay} />
                  ))}
                </div>
              </div>
            )}

            {/* ALL SLOT GAMES section — shown on default view with infinite scroll */}
            {!searchTerm && selectedCategory === 'all' && selectedProviders.length === 0 && slotGames.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Gamepad2 className="w-6 h-6 text-casino-gold" />
                    <h2 className="text-2xl font-bold text-white">Все слоты</h2>
                    <span className="text-aurex-platinum-500 text-sm font-normal">({slotGames.length})</span>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('slots')}
                    className="flex items-center gap-1 text-sm text-aurex-gold-500 hover:text-aurex-gold-400 transition-colors"
                  >
                    Фильтр и поиск <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {slotGames.slice(0, visibleCount).map((game, i) => (
                    <GameCard key={game.id || i} game={game} onPlay={handleGamePlay} />
                  ))}
                </div>
                {visibleCount < slotGames.length && (
                  <div ref={loadMoreRef} className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurex-gold-500"></div>
                  </div>
                )}
              </div>
            )}
            
            {/* 2. Category Navigation (Dragon Style Tabs) - ONLY show when user selected a category */}
            {(searchTerm || selectedCategory !== 'all' || selectedProviders.length > 0) && (
              <div className="sticky top-20 z-30 bg-aurex-obsidian-900/95 backdrop-blur-md py-4 border-b border-white/5 mb-8 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-xl md:border md:top-24">
              <div className="flex items-center justify-between gap-4 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
                <div className="flex gap-2">
                  {categories.map(cat => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                          isActive 
                            ? 'bg-aurex-gold-500 text-aurex-obsidian-900 shadow-lg shadow-aurex-gold-500/20 scale-105' 
                            : 'bg-aurex-obsidian-800 text-aurex-platinum-400 hover:bg-aurex-obsidian-700 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-aurex-obsidian-900' : 'text-aurex-gold-500'}`} />
                        {t(cat.nameKey)}
                      </button>
                    );
                  })}
                </div>

                {/* Search & Filter Toggles */}
                <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                  <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Поиск игры..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-aurex-obsidian-800 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-aurex-gold-500/50 focus:outline-none w-48 lg:w-64 transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2.5 rounded-lg border border-white/10 transition-colors ${showFilters ? 'bg-aurex-gold-500 text-black' : 'bg-aurex-obsidian-800 text-gray-400 hover:text-white'}`}
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Search (visible only on mobile) */}
              <div className="mt-4 md:hidden relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Поиск игры..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-aurex-obsidian-800 border border-white/10 rounded-lg pl-9 pr-4 py-3 text-sm text-white focus:border-aurex-gold-500/50 focus:outline-none"
                />
              </div>

              {/* Expanded Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-white/10">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                          <h4 className="text-white font-bold mb-3 text-sm">Сортировка</h4>
                          <div className="space-y-2">
                            {sortOptions.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => setSortBy(opt.id)}
                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${sortBy === opt.id ? 'bg-white/10 text-aurex-gold-500' : 'text-gray-400 hover:text-white'}`}
                              >
                                <opt.icon className="w-4 h-4" />
                                {opt.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-3">
                          <h4 className="text-white font-bold mb-3 text-sm">Провайдеры</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                            {providers.map(p => (
                              <button
                                key={p}
                                onClick={() => handleProviderToggle(p)}
                                className={`px-3 py-2 rounded-lg text-xs text-left truncate transition-colors ${selectedProviders.includes(p) ? 'bg-aurex-gold-500 text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* 3. Game Sections - REMOVED per user request */}
            
            {/* Show ONLY filtered results when user searches/filters */}
            {searchTerm || selectedCategory !== 'all' || selectedProviders.length > 0 ? (
              /* Filtered Results View */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Результаты поиска <span className="text-aurex-platinum-400 text-lg font-normal ml-2">({filteredGames.length})</span>
                  </h2>
                </div>
                
                {filteredGames.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {visibleGames.map((game, i) => (
                        <GameCard key={game.id || i} game={game} onPlay={handleGamePlay} />
                      ))}
                    </div>
                    {/* Infinite scroll sentinel */}
                    {visibleCount < filteredGames.length && (
                      <div ref={loadMoreRef} className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurex-gold-500"></div>
                      </div>
                    )}
                    {visibleCount >= filteredGames.length && filteredGames.length > GAMES_PER_PAGE && (
                      <div className="text-center py-6 text-aurex-platinum-500 text-sm">
                        Показано {filteredGames.length} игр
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 bg-aurex-obsidian-800/50 rounded-2xl border border-white/5">
                    <Search className="w-16 h-16 text-aurex-platinum-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Игры не найдены</h3>
                    <p className="text-aurex-platinum-400">Попробуйте изменить параметры поиска</p>
                    <button 
                      onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setSelectedProviders([]); }}
                      className="mt-6 px-6 py-2 bg-aurex-gold-500 text-black rounded-lg font-bold hover:bg-aurex-gold-400 transition-colors"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            </div>
          </div>
        </div>
      </Layout>
      
      {/* Game Modal */}
      <GameModal
        isOpen={isGameModalOpen}
        onClose={handleGameModalClose}
        game={selectedGame}
        mode={gameMode}
        onModeChange={handleGameModeChange}
      />
    </>
  );
}