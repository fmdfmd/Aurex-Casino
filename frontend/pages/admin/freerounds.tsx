import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Send,
  RefreshCw,
  Users,
  Gamepad2,
  Clock,
  CheckCircle,
  X,
  ChevronDown,
  DollarSign,
  Info
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  email: string;
  balance: number;
}

interface Game {
  id: string;
  name: string;
  provider: string;
  merchantId: string;
  merchantName: string;
  image: string;
}

const OPERATOR_MAP: Record<string, { name: string; label: string }> = {
  '960': { name: 'PragmaticPlay', label: 'Pragmatic Play' },
  '850': { name: 'HacksawGaming', label: 'Hacksaw Gaming' },
  '911': { name: 'PushGaming', label: 'Push Gaming' },
  '901': { name: 'BGaming', label: 'BGaming' },
  '421': { name: 'NetEntOSS', label: 'NetEnt' },
  '944': { name: 'PlaynGo', label: "Play'n GO" },
  '939': { name: 'PGSoft', label: 'PG Soft' },
  '953': { name: 'Yggdrasil', label: 'Yggdrasil' },
  '940': { name: 'EvoPlay', label: 'EvoPlay' },
  '920': { name: 'Thunderkick', label: 'Thunderkick' },
  '976': { name: 'Habanero', label: 'Habanero' },
  '773': { name: 'Spribe', label: 'Spribe' },
  '955': { name: 'GameArt', label: 'GameArt' },
  '898': { name: 'Kaga', label: 'KA Gaming' },
  '973': { name: 'Endorphina', label: 'Endorphina' },
  '991': { name: 'BetSoft', label: 'Betsoft' },
  '941': { name: 'Wazdan', label: 'Wazdan' },
  '938': { name: 'NoLimitCity', label: 'Nolimit City' },
  '935': { name: 'RelaxGaming', label: 'Relax Gaming' },
  '956': { name: 'Belatra', label: 'Belatra' },
  '924': { name: '3OaksGaming', label: '3 Oaks Gaming' },
  '845': { name: 'Platipus', label: 'Platipus' },
  '925': { name: 'ELKStudios', label: 'ELK Studios' },
  '846': { name: 'Slotmill', label: 'Slotmill' },
  '914': { name: 'BeeFee', label: 'BeeFee' },
  '338': { name: 'BigTimeGamingOSS', label: 'Big Time Gaming' },
  '943': { name: 'PlaysonDirect', label: 'Playson' },
  '969': { name: 'Quickspin', label: 'Quickspin' },
  '963': { name: 'ISoftBet', label: 'iSoftBet' },
  '926': { name: 'Igrosoft', label: 'Igrosoft' },
  '949': { name: 'AmaticDirect', label: 'Amatic' },
};

// Approximate RUB bet per spin for common BetLevels (based on Pragmatic Play 20-line slots)
const BET_PRESETS = [
  { label: '~20 ₽', betLevel: 1, approxRub: 20 },
  { label: '~40 ₽', betLevel: 2, approxRub: 40 },
  { label: '~100 ₽', betLevel: 5, approxRub: 100 },
  { label: '~200 ₽', betLevel: 10, approxRub: 200 },
  { label: '~500 ₽', betLevel: 25, approxRub: 500 },
  { label: '~1 000 ₽', betLevel: 50, approxRub: 1000 },
  { label: '~2 000 ₽', betLevel: 100, approxRub: 2000 },
];

export default function AdminFreeroundsPage() {
  const { token } = useAuthStore();

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Games
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameSearch, setGameSearch] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showGameDropdown, setShowGameDropdown] = useState(false);

  // Params
  const [count, setCount] = useState('50');
  const [selectedBetPreset, setSelectedBetPreset] = useState(0); // index into BET_PRESETS
  const [expireDays, setExpireDays] = useState('7');
  const [wagerMultiplier, setWagerMultiplier] = useState('0');

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Load users
  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/users?limit=500', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        const list = d.data?.users || (Array.isArray(d.data) ? d.data : []);
        setUsers(list);
      })
      .catch(() => {});
  }, [token]);

  // Load games
  useEffect(() => {
    fetch('/api/slots/games')
      .then(r => r.json())
      .then(d => {
        // API can return: array directly, { data: [...] }, or { data: { games: [...] } }
        let rawGames: any[] = [];
        if (Array.isArray(d)) {
          rawGames = d;
        } else if (d?.data) {
          if (Array.isArray(d.data)) {
            rawGames = d.data;
          } else if (d.data?.games && Array.isArray(d.data.games)) {
            rawGames = d.data.games;
          }
        }

        const supported = rawGames.filter((g: any) => {
          const mid = String(g.systemId || g.merchantId || '');
          return OPERATOR_MAP[mid];
        });
        setAllGames(supported.map((g: any) => ({
          id: g.id || g.gameCode,
          name: g.name,
          provider: g.provider || g.merchantName || '',
          merchantId: String(g.systemId || g.merchantId || ''),
          merchantName: g.merchantName || g.provider || '',
          image: g.image || ''
        })));
      })
      .catch(() => {});
  }, []);

  // Build provider list with game counts
  const providerList = useMemo(() => {
    const map = new Map<string, { merchantId: string; label: string; operatorName: string; count: number }>();
    allGames.forEach(g => {
      const op = OPERATOR_MAP[g.merchantId];
      if (!op) return;
      const existing = map.get(g.merchantId);
      if (existing) {
        existing.count++;
      } else {
        map.set(g.merchantId, { merchantId: g.merchantId, label: op.label, operatorName: op.name, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allGames]);

  // Games for selected provider
  const providerGames = useMemo(() => {
    if (!selectedProvider) return [];
    let games = allGames.filter(g => g.merchantId === selectedProvider);
    if (gameSearch.trim()) {
      const q = gameSearch.toLowerCase();
      games = games.filter(g =>
        g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q)
      );
    }
    return games.sort((a, b) => a.name.localeCompare(b.name));
  }, [allGames, selectedProvider, gameSearch]);

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    String(u.id).includes(userSearch)
  ).slice(0, 10);

  const selectedOperatorInfo = selectedProvider ? OPERATOR_MAP[selectedProvider] : null;
  const currentBetPreset = BET_PRESETS[selectedBetPreset];

  const handleIssue = async () => {
    if (!selectedUser || !selectedGame || !selectedOperatorInfo) {
      toast.error('Выберите пользователя и игру');
      return;
    }

    const countNum = parseInt(count);
    if (!countNum || countNum < 1) {
      toast.error('Укажите количество спинов');
      return;
    }

    const expireDaysNum = parseInt(expireDays);

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/freerounds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          gameCode: selectedGame.id,
          operator: selectedOperatorInfo.name,
          count: countNum,
          betLevel: currentBetPreset.betLevel,
          expireDays: expireDaysNum,
          wagerMultiplier: parseFloat(wagerMultiplier) || 0
        })
      });

      const data = await response.json();

      if (data.success) {
        const wagerNum = parseFloat(wagerMultiplier) || 0;
        const totalCost = countNum * currentBetPreset.approxRub;
        toast.success(`${countNum} фриспинов выдано ${selectedUser.username}!`);
        setHistory(prev => [{
          id: Date.now(),
          user: selectedUser.username,
          userId: selectedUser.id,
          game: selectedGame.name,
          gameCode: selectedGame.id,
          provider: selectedOperatorInfo.label,
          count: countNum,
          betPerSpin: currentBetPreset.approxRub,
          totalCost,
          wager: wagerNum,
          expire: data.data?.expire,
          tid: data.data?.tid,
          time: new Date().toLocaleString('ru-RU')
        }, ...prev]);
      } else {
        toast.error(data.error || 'Ошибка выдачи фриспинов');
      }
    } catch (error) {
      toast.error('Ошибка сервера');
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => {
      setShowUserDropdown(false);
      setShowProviderDropdown(false);
      setShowGameDropdown(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <AuthGuard>
      <Head>
        <title>Фриспины - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-3">
              <Gift className="w-8 h-8 text-aurex-gold-500" />
              <span>Выдача фриспинов</span>
            </h1>
            <p className="text-aurex-platinum-400 mt-1">
              Выдача бесплатных вращений через Fundist API
            </p>
          </div>

          {/* Main Form */}
          <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 mb-6">

            {/* User Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                Пользователь
              </label>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={selectedUser ? `${selectedUser.username} (#${selectedUser.id})` : userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setSelectedUser(null);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Поиск по имени, email или ID..."
                  className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white placeholder-aurex-platinum-500 focus:border-aurex-gold-500/50 focus:outline-none"
                />
                {selectedUser && (
                  <button
                    onClick={() => { setSelectedUser(null); setUserSearch(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-aurex-platinum-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <AnimatePresence>
                  {showUserDropdown && !selectedUser && filteredUsers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute z-50 w-full mt-1 bg-aurex-obsidian-900 border border-aurex-gold-500/30 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto"
                    >
                      {filteredUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDropdown(false);
                            setUserSearch('');
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-aurex-obsidian-700 transition-colors border-b border-aurex-gold-500/10 last:border-0"
                        >
                          <span className="text-white font-medium">{user.username}</span>
                          <span className="text-aurex-platinum-500 text-sm ml-2">#{user.id}</span>
                          {user.email && <span className="text-aurex-platinum-500 text-sm ml-2">{user.email}</span>}
                          <span className="float-right text-aurex-gold-500 text-sm">{(user.balance || 0).toLocaleString('ru-RU')} ₽</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Step 1: Provider Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                <Gamepad2 className="w-4 h-4 inline mr-2" />
                Шаг 1: Выберите провайдера
              </label>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                  className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-left flex items-center justify-between hover:border-aurex-gold-500/40 transition-colors"
                >
                  {selectedProvider && selectedOperatorInfo ? (
                    <span className="text-white font-medium">{selectedOperatorInfo.label}</span>
                  ) : (
                    <span className="text-aurex-platinum-500">Выберите провайдера...</span>
                  )}
                  <ChevronDown className={`w-5 h-5 text-aurex-platinum-400 transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showProviderDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute z-50 w-full mt-1 bg-aurex-obsidian-900 border border-aurex-gold-500/30 rounded-xl overflow-hidden shadow-2xl max-h-80 overflow-y-auto"
                    >
                      {providerList.map(prov => (
                        <button
                          key={prov.merchantId}
                          onClick={() => {
                            setSelectedProvider(prov.merchantId);
                            setSelectedGame(null);
                            setGameSearch('');
                            setShowProviderDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-aurex-obsidian-700 transition-colors border-b border-aurex-gold-500/10 last:border-0 flex items-center justify-between ${
                            selectedProvider === prov.merchantId ? 'bg-aurex-gold-500/10' : ''
                          }`}
                        >
                          <div>
                            <span className="text-white font-medium">{prov.label}</span>
                            <span className="text-aurex-platinum-500 text-xs ml-2">({prov.operatorName})</span>
                          </div>
                          <span className="text-aurex-platinum-500 text-sm">{prov.count} игр</span>
                        </button>
                      ))}
                      {providerList.length === 0 && (
                        <div className="px-4 py-6 text-center text-aurex-platinum-500">
                          Загрузка провайдеров...
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Step 2: Game Selection */}
            {selectedProvider && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                  Шаг 2: Выберите игру
                  <span className="text-aurex-platinum-500 ml-2">({providerGames.length} игр)</span>
                </label>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedGame ? selectedGame.name : gameSearch}
                      onChange={(e) => {
                        setGameSearch(e.target.value);
                        setSelectedGame(null);
                        setShowGameDropdown(true);
                      }}
                      onFocus={() => setShowGameDropdown(true)}
                      placeholder="Поиск по названию..."
                      className="flex-1 px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white placeholder-aurex-platinum-500 focus:border-aurex-gold-500/50 focus:outline-none"
                    />
                    {selectedGame && (
                      <button
                        onClick={() => { setSelectedGame(null); setGameSearch(''); }}
                        className="px-3 text-aurex-platinum-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showGameDropdown && !selectedGame && providerGames.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute z-50 w-full mt-1 bg-aurex-obsidian-900 border border-aurex-gold-500/30 rounded-xl overflow-hidden shadow-2xl max-h-72 overflow-y-auto"
                      >
                        {providerGames.slice(0, 50).map(game => (
                          <button
                            key={game.id}
                            onClick={() => {
                              setSelectedGame(game);
                              setShowGameDropdown(false);
                              setGameSearch('');
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-aurex-obsidian-700 transition-colors border-b border-aurex-gold-500/10 last:border-0 flex items-center space-x-3"
                          >
                            {game.image ? (
                              <img src={game.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-aurex-obsidian-700 flex items-center justify-center flex-shrink-0">
                                <Gamepad2 className="w-5 h-5 text-aurex-platinum-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium truncate">{game.name}</div>
                              <div className="text-aurex-platinum-600 text-xs">{game.id}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {selectedGame && (
                  <div className="mt-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-green-400 text-sm">
                      {selectedGame.name} &bull; <span className="text-green-400/70">{selectedGame.id}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Spin Count */}
              <div>
                <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                  Кол-во фриспинов
                </label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  min="1"
                  max="1000"
                  className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-lg font-bold focus:border-aurex-gold-500/50 focus:outline-none"
                />
                <div className="flex gap-1 mt-2">
                  {[10, 25, 50, 100, 200].map(v => (
                    <button key={v} onClick={() => setCount(String(v))} className={`px-3 py-1 text-xs rounded-lg transition-all ${
                      count === String(v) ? 'bg-aurex-gold-500/20 text-aurex-gold-500 border border-aurex-gold-500/30' : 'bg-aurex-obsidian-700 text-aurex-platinum-300 hover:bg-aurex-obsidian-600'
                    }`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expire */}
              <div>
                <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Срок действия
                </label>
                <input
                  type="number"
                  value={expireDays}
                  onChange={(e) => setExpireDays(e.target.value)}
                  min="1"
                  max="365"
                  className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-lg font-bold focus:border-aurex-gold-500/50 focus:outline-none"
                />
                <div className="flex gap-1 mt-2">
                  {[
                    { v: 1, l: '1 день' }, { v: 3, l: '3 дня' }, { v: 7, l: 'Неделя' },
                    { v: 14, l: '2 нед.' }, { v: 30, l: 'Месяц' }
                  ].map(({ v, l }) => (
                    <button key={v} onClick={() => setExpireDays(String(v))} className={`px-3 py-1 text-xs rounded-lg transition-all ${
                      expireDays === String(v) ? 'bg-aurex-gold-500/20 text-aurex-gold-500 border border-aurex-gold-500/30' : 'bg-aurex-obsidian-700 text-aurex-platinum-300 hover:bg-aurex-obsidian-600'
                    }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bet Per Spin */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Ставка за спин
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {BET_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedBetPreset(idx)}
                    className={`px-3 py-3 rounded-xl text-center transition-all ${
                      selectedBetPreset === idx
                        ? 'bg-aurex-gold-500/20 text-aurex-gold-500 border-2 border-aurex-gold-500/50 font-bold'
                        : 'bg-aurex-obsidian-900 text-aurex-platinum-300 border border-aurex-gold-500/10 hover:border-aurex-gold-500/30'
                    }`}
                  >
                    <div className="text-sm font-bold">{preset.label}</div>
                    <div className="text-[10px] text-aurex-platinum-500 mt-0.5">BL: {preset.betLevel}</div>
                  </button>
                ))}
              </div>
              <div className="flex items-start gap-2 mt-2 p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-aurex-platinum-500 text-xs">
                  Суммы приблизительные (зависят от конкретного слота).
                  BetLevel — это множитель ставки в Fundist. Например, BL 1 = минимальная ставка (~20₽ на большинстве слотов).
                </p>
              </div>
            </div>

            {/* Wager Multiplier */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                Вейджер (отыгрыш выигрыша)
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'Без вейджера', value: '0' },
                  { label: 'x1', value: '1' },
                  { label: 'x3', value: '3' },
                  { label: 'x5', value: '5' },
                  { label: 'x10', value: '10' },
                  { label: 'x20', value: '20' },
                  { label: 'x30', value: '30' },
                  { label: 'x50', value: '50' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setWagerMultiplier(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      wagerMultiplier === opt.value
                        ? opt.value === '0'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                          : 'bg-aurex-gold-500/20 text-aurex-gold-500 border border-aurex-gold-500/40'
                        : 'bg-aurex-obsidian-900 text-aurex-platinum-400 border border-aurex-gold-500/10 hover:border-aurex-gold-500/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-aurex-platinum-500 text-sm">или</span>
                  <input
                    type="number"
                    value={wagerMultiplier}
                    onChange={(e) => setWagerMultiplier(e.target.value)}
                    min="0"
                    max="100"
                    step="1"
                    className="w-20 px-3 py-2 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-center focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-aurex-platinum-500 text-xs mt-2">
                {parseFloat(wagerMultiplier) > 0
                  ? `Выигрыш попадает на бонусный баланс. Для вывода нужно проставить x${wagerMultiplier} от суммы выигрыша.`
                  : 'Выигрыш сразу зачисляется на основной баланс — можно выводить.'}
              </p>
            </div>

            {/* Summary */}
            {selectedUser && selectedGame && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-aurex-obsidian-900/80 to-aurex-gold-500/5 rounded-xl mb-6 border border-aurex-gold-500/20"
              >
                <h4 className="text-aurex-gold-500 font-bold mb-3">Итого</h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <div className="text-aurex-platinum-400">Игрок:</div>
                  <div className="text-white font-medium">{selectedUser.username} (#{selectedUser.id})</div>
                  <div className="text-aurex-platinum-400">Провайдер:</div>
                  <div className="text-white font-medium">{selectedOperatorInfo?.label}</div>
                  <div className="text-aurex-platinum-400">Игра:</div>
                  <div className="text-white font-medium">{selectedGame.name}</div>
                  <div className="text-aurex-platinum-400">Кол-во спинов:</div>
                  <div className="text-white font-bold">{count}</div>
                  <div className="text-aurex-platinum-400">Ставка за спин:</div>
                  <div className="text-white font-bold">{currentBetPreset.label}</div>
                  <div className="text-aurex-platinum-400">Примерная стоимость:</div>
                  <div className="text-aurex-gold-500 font-bold text-base">
                    ~{(parseInt(count || '0') * currentBetPreset.approxRub).toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-aurex-platinum-400">Вейджер:</div>
                  <div className={`font-bold ${parseFloat(wagerMultiplier) > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                    {parseFloat(wagerMultiplier) > 0 ? `x${wagerMultiplier}` : 'Нет — сразу на баланс'}
                  </div>
                  <div className="text-aurex-platinum-400">Срок:</div>
                  <div className="text-white">{expireDays} дней</div>
                </div>
              </motion.div>
            )}

            {/* Submit */}
            <button
              onClick={handleIssue}
              disabled={!selectedUser || !selectedGame || !selectedOperatorInfo || isLoading}
              className="w-full py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold text-lg rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Выдаю фриспины...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Выдать {count} фриспинов</span>
                </>
              )}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-aurex-gold-500" />
                <span>Выданные за сессию</span>
              </h3>
              <div className="space-y-3">
                {history.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-aurex-obsidian-900/50 rounded-xl border border-green-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-green-400 font-bold">{item.count} фриспинов</span>
                        <span className="text-aurex-platinum-500 text-sm ml-1">по {item.betPerSpin}₽</span>
                        {item.wager > 0 && (
                          <span className="text-orange-400 text-sm ml-1 px-1.5 py-0.5 bg-orange-500/10 rounded">вейджер x{item.wager}</span>
                        )}
                        <span className="text-aurex-platinum-400 mx-2">&rarr;</span>
                        <span className="text-white font-medium">{item.user}</span>
                      </div>
                      <div className="text-aurex-gold-500 font-bold">~{item.totalCost?.toLocaleString('ru-RU')} ₽</div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-aurex-platinum-500 text-xs">{item.game} ({item.provider})</span>
                      <span className="text-aurex-platinum-600 text-xs">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
