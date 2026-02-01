import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  User,
  Users,
  Wallet,
  Settings,
  LogOut,
  Crown,
  Gift,
  Home,
  Gamepad2,
  Trophy,
  CreditCard,
  Bell,
  ChevronDown,
  Vault,
  Gem
} from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '../store/authStore';
import { useCurrency, useTranslation } from '../hooks/useTranslation';
import { VIPIcon } from './VIPIcons';

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { format: formatCurrency, hideBalance } = useCurrency();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [router.pathname]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navigationItems = [
    { href: '/', label: t('nav.home'), icon: Home },
    { href: '/games', label: t('nav.games'), icon: Gamepad2 },
    { href: '/jackpots', label: t('nav.jackpots'), icon: Gem },
    { href: '/tournaments', label: t('nav.tournaments'), icon: Trophy },
    { href: '/promotions', label: t('nav.promotions'), icon: Gift },
  ];

  const userMenuItems = [
    { href: '/profile', label: t('nav.profile'), icon: User },
    { href: '/wallet', label: t('nav.wallet'), icon: Wallet },
    { href: '/vault', label: t('nav.vault'), icon: Vault },
    { href: '/referral', label: t('nav.referral'), icon: Users },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ${
        scrolled 
          ? 'bg-dark-200/95 backdrop-blur-md border-b border-gray-800' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* AUREX Official Logo - Responsive */}
          <Link href="/" className="flex items-center group">
            <div className="relative">
              {/* Golden glow effect */}
              <div className="absolute inset-0 bg-aurex-gold-500 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500"></div>
              {/* Logo */}
              <Image
                src="/images/aurexlogo.png"
                alt="AUREX - The Golden Empire of Win"
                width={180}
                height={65}
                className="h-12 sm:h-14 md:h-16 w-auto object-contain drop-shadow-lg group-hover:drop-shadow-2xl transition-all duration-300"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                  router.pathname === item.href
                    ? 'text-aurex-gold-500 bg-aurex-gold-500/10 border border-aurex-gold-500/20'
                    : 'text-aurex-platinum-300 hover:text-aurex-gold-500 hover:bg-aurex-obsidian-700/50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <div className="hidden lg:flex items-center space-x-4">
                {/* Balance - компактный */}
                <Link href="/wallet" className="aurex-empire-border rounded-lg px-3 py-1.5 bg-aurex-obsidian-800 hover:bg-aurex-obsidian-700 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-aurex-gold-500" />
                    <span className="text-aurex-gold-500 font-bold text-sm">
                      {formatCurrency(user.balance || 0)}
                    </span>
                  </div>
                </Link>

                {/* VIP Level - кликабельный */}
                <Link href="/vip" className="relative group">
                  <div className="absolute inset-0 bg-aurex-gold rounded-lg opacity-20 blur-sm group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-r from-aurex-gold-600 to-aurex-gold-500 rounded-lg px-2 py-1 shadow-aurex-gold group-hover:scale-105 transition-transform">
                    <div className="flex items-center gap-1">
                      <VIPIcon level={user.vipLevel || 1} className="w-8 h-8" />
                      <span className="text-aurex-obsidian-900 text-xs font-black">VIP {user.vipLevel || 0}</span>
                    </div>
                  </div>
                </Link>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-lg px-3 py-1.5 hover:bg-aurex-obsidian-700 transition-colors"
                  >
                    <div className="w-7 h-7 bg-aurex-gold-500 rounded-full flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-aurex-obsidian-900" />
                    </div>
                    <span className="text-white text-sm font-medium max-w-[80px] truncate">{user.username}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-aurex-platinum-500" />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-dark-100 border border-gray-800 rounded-lg py-2 shadow-xl"
                      >
                        {userMenuItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-200 transition-colors"
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        ))}
                        <hr className="border-gray-800 my-2" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-dark-200 transition-colors w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{t('nav.logout')}</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex items-center space-x-4">
                <Link
                  href="/login"
                  className="aurex-black-button px-6 py-2.5 rounded-lg font-semibold tracking-wide transition-all duration-300"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href="/register"
                  className="glow-button px-6 py-2.5 rounded-lg font-bold text-aurex-obsidian-900 tracking-wide aurex-shimmer"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu - AUREX Premium */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed left-0 right-0 top-16 bottom-0 bg-aurex-obsidian-900 backdrop-blur-xl z-[99999] overflow-y-auto"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
            >
              <nav className="p-4 space-y-2">
                {/* Navigation Items */}
                {navigationItems.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-4 px-5 py-4 rounded-xl transition-all duration-200 ${
                        router.pathname === item.href
                          ? 'bg-aurex-gold-500/15 border border-aurex-gold-500/30 text-aurex-gold-500'
                          : 'text-aurex-platinum-300 hover:bg-aurex-obsidian-700/50 active:bg-aurex-obsidian-600/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        router.pathname === item.href 
                          ? 'bg-aurex-gold-500/20' 
                          : 'bg-aurex-obsidian-700'
                      }`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-lg">{item.label}</span>
                    </Link>
                  </motion.div>
                ))}

                {isAuthenticated && user ? (
                  <>
                    {/* Golden Divider */}
                    <div className="aurex-divider my-6"></div>
                    
                    {/* Mobile Balance Card - AUREX Premium */}
                    <motion.div 
                      className="px-1 py-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="aurex-empire-border rounded-2xl p-5 bg-aurex-obsidian-800/70 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 flex items-center justify-center shadow-aurex-gold">
                              <Wallet className="w-6 h-6 text-aurex-obsidian-900" />
                            </div>
                            <div>
                              <p className="text-aurex-platinum-400 text-sm">Баланс</p>
                              <p className="text-aurex-gold-500 font-black text-2xl">
                                {formatCurrency(user.balance)}
                              </p>
                            </div>
                          </div>
                          {user.vipLevel > 0 && (
                            <Link href="/vip" className="bg-gradient-to-r from-aurex-gold-600 to-aurex-gold-500 rounded-lg px-2 py-1.5 shadow-aurex-gold flex items-center gap-1.5">
                              <VIPIcon level={user.vipLevel || 1} className="w-9 h-9" />
                              <span className="text-aurex-obsidian-900 text-xs font-black">VIP {user.vipLevel}</span>
                            </Link>
                          )}
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-3">
                          <Link href="/wallet" className="glow-button py-3 rounded-xl text-center font-bold text-aurex-obsidian-900 text-sm">
                            Пополнить
                          </Link>
                          <Link href="/wallet" className="aurex-black-button py-3 rounded-xl text-center font-bold text-sm">
                            Вывести
                          </Link>
                        </div>
                      </div>
                    </motion.div>

                    {/* User Menu Items */}
                    <div className="space-y-2 mt-4">
                      {userMenuItems.map((item, index) => (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                        >
                          <Link
                            href={item.href}
                            className="flex items-center space-x-4 px-5 py-4 rounded-xl text-aurex-platinum-300 hover:bg-aurex-obsidian-700/50 active:bg-aurex-obsidian-600/50 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-aurex-obsidian-700 flex items-center justify-center">
                              <item.icon className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-lg">{item.label}</span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>

                    {/* Logout */}
                    <motion.button
                      onClick={handleLogout}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center space-x-4 px-5 py-4 rounded-xl text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors w-full mt-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <LogOut className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-lg">{t('nav.logout')}</span>
                    </motion.button>
                  </>
                ) : (
                  <>
                    {/* Golden Divider */}
                    <div className="aurex-divider my-6"></div>
                    
                    {/* Auth Buttons */}
                    <motion.div
                      className="space-y-3 px-1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Link
                        href="/login"
                        className="aurex-black-button flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-bold text-lg w-full"
                      >
                        <User className="w-5 h-5" />
                        <span>{t('hero.joinEmpire')}</span>
                      </Link>
                      <Link
                        href="/register"
                        className="glow-button flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-black text-lg text-aurex-obsidian-900 w-full"
                      >
                        <Crown className="w-5 h-5" />
                        <span>{t('nav.register')}</span>
                      </Link>
                    </motion.div>
                  </>
                )}
                
                {/* Empire Branding with Logo */}
                <motion.div
                  className="text-center pt-8 pb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex justify-center mb-3 opacity-50">
                    <Image
                      src="/images/aurexlogo.png"
                      alt="AUREX"
                      width={80}
                      height={30}
                      className="h-6 w-auto"
                    />
                  </div>
                  <p className="text-aurex-platinum-500 text-xs tracking-widest uppercase">
                    The Golden Empire of Win
                  </p>
                </motion.div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}