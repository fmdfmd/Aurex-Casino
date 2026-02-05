import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
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
  Play
} from 'lucide-react';
import Layout from '../../components/Layout';
import AuthGuard from '../../components/AuthGuard';
import GameCard from '../../components/GameCard';
import GameModal from '../../components/GameModal';
import { useGamesQuery } from '../../hooks/useGames';
import { useTranslation } from '../../hooks/useTranslation';

const categories = [
  { id: 'all', nameKey: 'games.allGames', count: 0 },
  { id: 'slots', nameKey: 'games.slots', count: 0 },
  { id: 'jackpot', nameKey: 'games.jackpot', count: 0 },
  { id: 'new', nameKey: 'games.new', count: 0 },
  { id: 'popular', nameKey: 'games.popular', count: 0 },
  { id: 'table', nameKey: 'games.table', count: 0 },
  { id: 'live', nameKey: 'games.liveCasino', count: 0 },
];

const sortOptions = [
  { id: 'name', name: 'По алфавиту', icon: List },
  { id: 'popularity', name: 'По популярности', icon: TrendingUp },
  { id: 'rating', name: 'По рейтингу', icon: Star },
  { id: 'newest', name: 'Сначала новые', icon: Clock },
];

export default function GamesPage() {
  const { t } = useTranslation();
  const { data: gamesData, isLoading } = useGamesQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popularity');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [minRTP, setMinRTP] = useState(90);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);

  // Fetch providers from API
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch('/api/config/providers');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Handle both string[] and {id, name, logo}[] formats
          const providerNames = data.data.map((p: any) => 
            typeof p === 'string' ? p : p.name
          );
          setProviders(providerNames);
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      }
    };
    fetchProviders();
  }, []);
  
  // Game Modal state
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [gameMode, setGameMode] = useState<'demo' | 'real'>('demo');
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);

  // Game handlers
  const handleGamePlay = (gameData: any) => {
    setSelectedGame(gameData);
    setGameMode(gameData.mode || 'demo');
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
      // This would need to be implemented based on actual game categories
      // For now, we'll just show all games
    }

    // Provider filter
    if (selectedProviders.length > 0) {
      filtered = filtered.filter(game => 
        selectedProviders.includes(game.provider)
      );
    }

    // RTP filter
    filtered = filtered.filter(game => 
      (game.rtp || 96) >= minRTP
    );

    // Sort games
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'popularity':
        // Sort by popularity field (deterministic, no Math.random)
        filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rtp || 96) - (a.rtp || 96));
        break;
      case 'newest':
        filtered.reverse();
        break;
    }

    return filtered;
  }, [allGames, searchTerm, selectedCategory, selectedProviders, sortBy, minRTP]);

  const handleProviderToggle = (provider: string) => {
    setSelectedProviders(prev => 
      prev.includes(provider) 
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedProviders([]);
    setMinRTP(90);
    setOnlyFavorites(false);
  };

  return (
    <AuthGuard>
      <Head>
        <title>Imperial Game Collection - AUREX</title>
        <meta name="description" content="Эксклюзивная коллекция премиальных игр в AUREX. Более 2500 игр от ведущих мировых провайдеров. Высокий RTP, Imperial Jackpots." />
      </Head>
      <Layout>
        {/* Hero Block with Background */}
        <div 
          className="relative h-96 md:h-[500px] pt-20"
          style={{
            backgroundImage: 'url(/images/games-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />
          <div className="relative z-10 h-full flex items-center">
            <div className="max-w-7xl mx-auto px-4 w-full">
              <h1 className="text-4xl md:text-6xl font-black mb-4 text-white drop-shadow-2xl" style={{ fontFamily: 'Cinzel, serif' }}>
                Imperial Game Collection
              </h1>
              <p className="text-xl md:text-2xl text-aurex-platinum-300">
                Эксклюзивная коллекция из более чем <span className="text-aurex-gold-500 font-bold">2,500</span> премиальных игр
              </p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-aurex-obsidian-900 min-h-screen pb-12">
          <div className="max-w-7xl mx-auto px-4 relative z-10 -mt-8">

            {/* Search and Filters */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder={t('games.search')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-dark-100 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-casino-gold transition-colors"
                    />
                  </div>
                </div>

                {/* Filters Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center space-x-2 px-4 py-3 bg-dark-100 border border-gray-700 rounded-lg text-white hover:border-casino-gold transition-colors"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  <span>Фильтры</span>
                </button>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-dark-100 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-casino-gold transition-colors"
                >
                  {sortOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>

                {/* View Mode */}
                <div className="flex rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-casino-gold text-black' 
                        : 'bg-dark-100 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-casino-gold text-black' 
                        : 'bg-dark-100 text-gray-400 hover:text-white'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-casino-gold text-black'
                        : 'bg-dark-100 text-gray-300 hover:text-white hover:bg-dark-200'
                    }`}
                  >
                    {t(category.nameKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters Sidebar */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="lg:hidden mb-8 bg-dark-100 border border-gray-700 rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Фильтры</h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Providers Filter */}
                  <div className="mb-6">
                    <h4 className="text-white font-medium mb-3">{t('games.providers')}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {providers.map(provider => (
                        <label
                          key={provider}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProviders.includes(provider)}
                            onChange={() => handleProviderToggle(provider)}
                            className="sr-only"
                          />
                          <div className="custom-checkbox">
                            <div className="checkbox-mark"></div>
                          </div>
                          <span className="text-gray-300 text-sm">{provider}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* RTP Filter */}
                  <div className="mb-6">
                    <h4 className="text-white font-medium mb-3">
                      {t('games.minRtp')}: {minRTP}%
                    </h4>
                    <input
                      type="range"
                      min="90"
                      max="99"
                      value={minRTP}
                      onChange={(e) => setMinRTP(Number(e.target.value))}
                      className="w-full accent-casino-gold"
                    />
                  </div>

                  {/* Clear Filters */}
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {t('games.clearFilters')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-8">
              {/* Filters Sidebar (Desktop) */}
              <div className="hidden lg:block w-64 flex-shrink-0">
                <div className="bg-dark-100 border border-gray-700 rounded-lg p-6 sticky top-24">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Фильтры</h3>
                    <button
                      onClick={clearFilters}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Очистить
                    </button>
                  </div>

                  {/* Providers Filter */}
                  <div className="mb-6">
                    <h4 className="text-white font-medium mb-3">{t('games.providers')}</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {providers.map(provider => (
                        <label
                          key={provider}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-dark-200 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProviders.includes(provider)}
                            onChange={() => handleProviderToggle(provider)}
                            className="sr-only"
                          />
                          <div className="custom-checkbox">
                            <div className="checkbox-mark"></div>
                          </div>
                          <span className="text-gray-300 text-sm">{provider}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* RTP Filter */}
                  <div className="mb-6">
                    <h4 className="text-white font-medium mb-3">
                      {t('games.minRtp')}: {minRTP}%
                    </h4>
                    <input
                      type="range"
                      min="90"
                      max="99"
                      value={minRTP}
                      onChange={(e) => setMinRTP(Number(e.target.value))}
                      className="w-full accent-casino-gold"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>90%</span>
                      <span>99%</span>
                    </div>
                  </div>

                  {/* Favorites Filter */}
                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyFavorites}
                        onChange={(e) => setOnlyFavorites(e.target.checked)}
                        className="sr-only"
                      />
                      <div className="custom-checkbox">
                        <div className="checkbox-mark"></div>
                      </div>
                      <span className="text-gray-300">Только избранные</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Games Grid */}
              <div className="flex-1">
                {/* Results count */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-gray-300">
                    {t('games.gamesFound')}: <span className="text-white font-bold">{filteredGames.length}</span>
                  </p>
                </div>

                {/* Loading */}
                {isLoading && (
                  <div className={`grid gap-6 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                      : 'grid-cols-1'
                  }`}>
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="shimmer h-64 rounded-lg"></div>
                    ))}
                  </div>
                )}

                {/* Games */}
                {!isLoading && (
                  <div className={`grid gap-6 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                      : 'grid-cols-1 md:grid-cols-2'
                  }`}>
                    {filteredGames.map((game, index) => (
                      <div
                        key={game.id || index}
                        className="animate-fade-in"
                        style={{ animationDelay: index < 20 ? `${index * 30}ms` : '0ms' }}
                      >
                        <GameCard 
                          game={game} 
                          showRTP={true}
                          showProvider={viewMode === 'list'}
                          onPlay={handleGamePlay}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* No results */}
                {!isLoading && filteredGames.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Игры не найдены</h3>
                    <p className="text-gray-400 mb-4">
                      Попробуйте изменить параметры поиска или фильтры
                    </p>
                    <button
                      onClick={clearFilters}
                      className="px-6 py-3 bg-casino-gold text-black rounded-lg font-bold hover:bg-casino-gold-dark transition-colors"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </div>
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
    </AuthGuard>
  );
}