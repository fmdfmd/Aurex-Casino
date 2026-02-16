import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Search,
  Send,
  RefreshCw,
  Users,
  Gamepad2,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronDown
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
  odid: string;
}

interface Game {
  id: string;
  name: string;
  provider: string;
  merchantId: string;
  merchantName: string;
  image: string;
}

// Map of known merchant IDs to their Fundist operator names for freerounds
const OPERATOR_MAP: Record<string, string> = {
  '960': 'PragmaticPlay',
  '850': 'HacksawGaming',
  '911': 'PushGaming',
  '901': 'BGaming',
  '421': 'NetEntOSS',
  '944': 'PlaynGo',
  '939': 'PGSoft',
  '953': 'Yggdrasil',
  '940': 'EvoPlay',
  '920': 'Thunderkick',
  '976': 'Habanero',
  '773': 'Spribe',
  '955': 'GameArt',
  '898': 'Kaga',
  '973': 'Endorphina',
  '991': 'BetSoft',
  '941': 'Wazdan',
  '938': 'NoLimitCity',
  '935': 'RelaxGaming',
  '956': 'Belatra',
  '924': '3OaksGaming',
  '845': 'Platipus',
  '925': 'ELKStudios',
  '846': 'Slotmill',
  '914': 'BeeFee',
  '338': 'BigTimeGamingOSS',
  '943': 'PlaysonDirect',
  '969': 'Quickspin',
  '963': 'ISoftBet',
  '926': 'Igrosoft',
  '949': 'AmaticDirect',
};

export default function AdminFreeroundsPage() {
  const { token } = useAuthStore();

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Games
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameSearch, setGameSearch] = useState('');
  const [showGameDropdown, setShowGameDropdown] = useState(false);

  // Freerounds params
  const [count, setCount] = useState('50');
  const [betLevel, setBetLevel] = useState('1');
  const [expireDays, setExpireDays] = useState('7');

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
        if (Array.isArray(d)) {
          // Filter to only games whose providers support freerounds
          const supported = d.filter((g: any) => {
            const mid = String(g.merchantId || g.systemId || '');
            return OPERATOR_MAP[mid];
          });
          setAllGames(supported.map((g: any) => ({
            id: g.id || g.gameCode,
            name: g.name,
            provider: g.provider || g.merchantName || '',
            merchantId: String(g.merchantId || g.systemId || ''),
            merchantName: g.merchantName || g.provider || '',
            image: g.image || ''
          })));
        }
      })
      .catch(() => {});
  }, []);

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    String(u.id).includes(userSearch)
  ).slice(0, 10);

  const filteredGames = allGames.filter(g =>
    g.name?.toLowerCase().includes(gameSearch.toLowerCase()) ||
    g.provider?.toLowerCase().includes(gameSearch.toLowerCase()) ||
    g.id?.toLowerCase().includes(gameSearch.toLowerCase())
  ).slice(0, 15);

  const selectedOperator = selectedGame ? OPERATOR_MAP[selectedGame.merchantId] : null;

  const handleIssue = async () => {
    if (!selectedUser || !selectedGame || !selectedOperator) {
      toast.error('Выберите пользователя и игру');
      return;
    }

    const countNum = parseInt(count);
    const betLevelNum = parseInt(betLevel);
    const expireDaysNum = parseInt(expireDays);

    if (!countNum || countNum < 1) {
      toast.error('Укажите количество спинов');
      return;
    }

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
          operator: selectedOperator,
          count: countNum,
          betLevel: betLevelNum,
          expireDays: expireDaysNum
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${countNum} фриспинов выдано ${selectedUser.username}!`);
        setHistory(prev => [{
          id: Date.now(),
          user: selectedUser.username,
          userId: selectedUser.id,
          game: selectedGame.name,
          gameCode: selectedGame.id,
          provider: selectedGame.provider,
          count: countNum,
          betLevel: betLevelNum,
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
              <div className="relative">
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
                          <span className="float-right text-aurex-gold-500 text-sm">₽{(user.balance || 0).toLocaleString('ru-RU')}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Game Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                <Gamepad2 className="w-4 h-4 inline mr-2" />
                Игра (только провайдеры с поддержкой фриспинов)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedGame ? `${selectedGame.name} (${selectedGame.provider})` : gameSearch}
                  onChange={(e) => {
                    setGameSearch(e.target.value);
                    setSelectedGame(null);
                    setShowGameDropdown(true);
                  }}
                  onFocus={() => setShowGameDropdown(true)}
                  placeholder="Поиск по названию игры или провайдеру..."
                  className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white placeholder-aurex-platinum-500 focus:border-aurex-gold-500/50 focus:outline-none"
                />
                {selectedGame && (
                  <button
                    onClick={() => { setSelectedGame(null); setGameSearch(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-aurex-platinum-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <AnimatePresence>
                  {showGameDropdown && !selectedGame && gameSearch.length >= 2 && filteredGames.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute z-50 w-full mt-1 bg-aurex-obsidian-900 border border-aurex-gold-500/30 rounded-xl overflow-hidden shadow-2xl max-h-72 overflow-y-auto"
                    >
                      {filteredGames.map(game => (
                        <button
                          key={game.id}
                          onClick={() => {
                            setSelectedGame(game);
                            setShowGameDropdown(false);
                            setGameSearch('');
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-aurex-obsidian-700 transition-colors border-b border-aurex-gold-500/10 last:border-0 flex items-center space-x-3"
                        >
                          {game.image && (
                            <img src={game.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">{game.name}</div>
                            <div className="text-aurex-platinum-500 text-xs">{game.provider} &bull; {game.id}</div>
                          </div>
                          <span className="text-green-400 text-xs px-2 py-0.5 bg-green-500/10 rounded-full flex-shrink-0">
                            FR
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {selectedGame && selectedOperator && (
                <div className="mt-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <span className="text-green-400 text-sm">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    Оператор: <strong>{selectedOperator}</strong> &bull; PageCode: <strong>{selectedGame.id}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                  Кол-во спинов
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
                  {[10, 25, 50, 100].map(v => (
                    <button key={v} onClick={() => setCount(String(v))} className="px-2 py-1 text-xs bg-aurex-obsidian-700 text-aurex-platinum-300 rounded hover:bg-aurex-obsidian-600">
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                  BetLevel
                </label>
                <input
                  type="number"
                  value={betLevel}
                  onChange={(e) => setBetLevel(e.target.value)}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-lg font-bold focus:border-aurex-gold-500/50 focus:outline-none"
                />
                <p className="text-aurex-platinum-500 text-xs mt-1">
                  Pragmatic: bet = BL × 0.01 × rate × lines
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-aurex-platinum-300 mb-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Срок (дней)
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
                  {[3, 7, 14, 30].map(v => (
                    <button key={v} onClick={() => setExpireDays(String(v))} className="px-2 py-1 text-xs bg-aurex-obsidian-700 text-aurex-platinum-300 rounded hover:bg-aurex-obsidian-600">
                      {v}д
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            {selectedUser && selectedGame && (
              <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl mb-6 border border-aurex-gold-500/10">
                <h4 className="text-aurex-gold-500 font-bold mb-2">Сводка</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-aurex-platinum-400">Игрок:</div>
                  <div className="text-white font-medium">{selectedUser.username} (#{selectedUser.id})</div>
                  <div className="text-aurex-platinum-400">Игра:</div>
                  <div className="text-white font-medium">{selectedGame.name}</div>
                  <div className="text-aurex-platinum-400">Провайдер:</div>
                  <div className="text-white font-medium">{selectedOperator}</div>
                  <div className="text-aurex-platinum-400">Спинов:</div>
                  <div className="text-white font-bold">{count}</div>
                  <div className="text-aurex-platinum-400">BetLevel:</div>
                  <div className="text-white font-bold">{betLevel}</div>
                  <div className="text-aurex-platinum-400">Истекает через:</div>
                  <div className="text-white">{expireDays} дней</div>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleIssue}
              disabled={!selectedUser || !selectedGame || !selectedOperator || isLoading}
              className="w-full py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold text-lg rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Отправка...</span>
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
                    className="p-3 bg-aurex-obsidian-900/50 rounded-xl border border-green-500/20 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-green-400 font-bold">{item.count} фриспинов</span>
                      <span className="text-aurex-platinum-400 mx-2">&rarr;</span>
                      <span className="text-white font-medium">{item.user}</span>
                      <span className="text-aurex-platinum-500 text-sm ml-2">на {item.game}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-aurex-platinum-500 text-xs">{item.time}</div>
                      <div className="text-aurex-platinum-600 text-xs">TID: {item.tid?.slice(0, 20)}...</div>
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
