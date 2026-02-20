import Link from 'next/link';
import Image from 'next/image';
import { Crown, Mail, Phone, Shield, Bitcoin, Zap, Send, Instagram, Twitter, MessageSquare } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  const footerLinks = {
    [t('footer.empireGames')]: [
      { label: t('games.allGames'), href: '/games' },
      { label: t('nav.tournaments'), href: '/tournaments' },
      { label: t('nav.promotions'), href: '/promotions' },
      { label: t('footer.vipClub'), href: '/vip' },
    ],
    [t('footer.account')]: [
      { label: t('nav.profile'), href: '/profile' },
      { label: t('nav.wallet'), href: '/wallet' },
      { label: t('footer.referral'), href: '/referral' },
      { label: t('nav.settings'), href: '/settings' },
    ],
    [t('footer.support')]: [
      { label: t('footer.faq'), href: '/faq' },
      { label: t('footer.responsibleGaming'), href: '/responsible-gaming' },
      { label: t('footer.contacts'), href: '/support' },
      { label: t('footer.verification'), href: '/verification' },
    ],
    [t('footer.legal')]: [
      { label: t('footer.terms'), href: '/terms' },
      { label: t('footer.privacy'), href: '/privacy' },
      { label: t('footer.aml'), href: '/aml' },
    ],
  };

  const socialLinks = [
    { href: 'https://t.me/aurexcasino', label: 'Telegram', Icon: Send },
    { href: 'https://instagram.com/aurexcasino', label: 'Instagram', Icon: Instagram },
    { href: 'https://twitter.com/aurexcasino', label: 'Twitter (X)', Icon: Twitter },
    { href: 'https://discord.gg/aurexcasino', label: 'Discord', Icon: MessageSquare },
  ];

  const cryptoMethods = [
    { name: 'Bitcoin', icon: '₿', color: 'text-aurex-crypto-bitcoin' },
    { name: 'Ethereum', icon: 'Ξ', color: 'text-aurex-crypto-ethereum' },
    { name: 'USDT', icon: '₮', color: 'text-aurex-crypto-usdt' },
    { name: 'BNB', icon: 'Ⓑ', color: 'text-yellow-500' },
    { name: 'Litecoin', icon: 'Ł', color: 'text-gray-400' },
    { name: 'Tron', icon: '₮', color: 'text-red-500' },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-aurex-obsidian-900 to-aurex-obsidian-900 border-t border-aurex-gold-500/20">
      {/* Top golden divider */}
      <div className="aurex-divider"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 lg:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12">
          {/* Logo and Description - Full width on mobile */}
          <div className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-1 mb-4 lg:mb-0">
            <Link href="/" className="inline-block mb-4 sm:mb-6 group">
              <div className="relative">
                {/* Golden glow effect */}
                <div className="absolute inset-0 bg-aurex-gold-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                {/* Official Logo */}
                <Image
                  src="/images/aurexlogo.png"
                  alt="AUREX - The Golden Empire of Win"
                  width={120}
                  height={45}
                  className="h-10 sm:h-12 w-auto object-contain drop-shadow-lg group-hover:drop-shadow-2xl transition-all duration-300"
                />
              </div>
            </Link>
            
            <p className="text-aurex-platinum-400 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed max-w-xs">
              {t('footer.description')}
            </p>
            
            <div className="flex space-x-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 aurex-empire-border rounded-lg flex items-center justify-center transition-all duration-300 hover:shadow-aurex-gold bg-aurex-obsidian-800/50 hover:bg-aurex-obsidian-700/50 group"
                  aria-label={social.label}
                  title={social.label}
                >
                  <social.Icon className="w-5 h-5 text-aurex-gold-500 group-hover:text-aurex-gold-400" />
                </a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-aurex-gold-500 font-bold mb-6 tracking-wide uppercase text-sm" style={{ fontFamily: 'Cinzel, serif' }}>
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-aurex-platinum-400 hover:text-aurex-gold-500 text-sm transition-colors duration-300 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-aurex-gold-500/50 group-hover:bg-aurex-gold-500 transition-colors"></span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Info - AUREX Premium */}
        <div className="aurex-divider mb-12"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="aurex-empire-border rounded-xl p-6 bg-aurex-obsidian-800/30 backdrop-blur-sm hover:bg-aurex-obsidian-800/50 transition-all duration-300 group">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 flex items-center justify-center shadow-aurex-gold group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6 text-aurex-obsidian-900" />
              </div>
              <div>
                <p className="text-aurex-gold-500 font-bold mb-2 tracking-wide">VIP Email</p>
                <a 
                  href="mailto:vip@aurex.io"
                  className="text-aurex-platinum-400 hover:text-aurex-gold-500 text-sm transition-colors"
                >
                  vip@aurex.io
                </a>
              </div>
            </div>
          </div>
          
          <div className="aurex-empire-border rounded-xl p-6 bg-aurex-obsidian-800/30 backdrop-blur-sm hover:bg-aurex-obsidian-800/50 transition-all duration-300 group">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 flex items-center justify-center shadow-aurex-gold group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-aurex-obsidian-900" />
              </div>
              <div>
                <p className="text-aurex-gold-500 font-bold mb-2 tracking-wide">24/7 AI Concierge</p>
                <p className="text-aurex-platinum-400 text-sm">
                  Мгновенная поддержка
                </p>
              </div>
            </div>
          </div>
          
          <div className="aurex-empire-border rounded-xl p-6 bg-aurex-obsidian-800/30 backdrop-blur-sm hover:bg-aurex-obsidian-800/50 transition-all duration-300 group">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 flex items-center justify-center shadow-aurex-gold group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-aurex-obsidian-900" />
              </div>
              <div>
                <p className="text-aurex-gold-500 font-bold mb-2 tracking-wide">Security</p>
                <p className="text-aurex-platinum-400 text-sm">
                  SSL Encrypted
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Crypto Payment Methods */}
        <div className="aurex-divider mb-12"></div>
        
        <div className="mb-12">
          <h3 className="text-aurex-gold-500 font-bold mb-6 tracking-wide uppercase text-sm flex items-center gap-3" style={{ fontFamily: 'Cinzel, serif' }}>
            <Bitcoin className="w-5 h-5" />
            {t('footer.acceptCrypto')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {cryptoMethods.map((crypto) => (
              <div
                key={crypto.name}
                className="aurex-empire-border rounded-lg p-4 bg-aurex-obsidian-800/30 backdrop-blur-sm hover:bg-aurex-obsidian-800/50 transition-all duration-300 text-center group cursor-pointer"
              >
                <div className={`text-3xl mb-2 ${crypto.color} group-hover:scale-110 transition-transform`}>
                  {crypto.icon}
                </div>
                <p className="text-aurex-platinum-400 text-xs font-medium">{crypto.name}</p>
              </div>
            ))}
          </div>
          <p className="text-aurex-platinum-500 text-xs mt-4 text-center">
            ⚡ {t('footer.instantDeposits')} • {t('footer.withdrawals')} • {t('footer.zeroFees')}
          </p>
        </div>

        {/* Bottom Section */}
        <div className="aurex-divider mb-8"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-aurex-platinum-500 text-sm text-center md:text-left">
            <p className="mb-2">
              © {currentYear} <span className="text-aurex-gold-500 font-bold">AUREX</span> - The Golden Empire of Win
            </p>
            <p className="text-xs">
              All rights reserved • Operated by Empire Gaming N.V.
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-aurex-platinum-400 text-sm">
              <Crown className="w-4 h-4 text-aurex-gold-500" />
              <span>18+</span>
            </div>
            <div className="flex items-center gap-2 text-aurex-platinum-400 text-sm">
              <Shield className="w-4 h-4 text-aurex-gold-500" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-2 text-aurex-platinum-400 text-sm">
              <Bitcoin className="w-4 h-4 text-aurex-gold-500" />
              <span>Crypto</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 aurex-empire-border rounded-xl p-6 bg-aurex-obsidian-800/30 backdrop-blur-sm">
          <p className="text-aurex-platinum-500 text-xs leading-relaxed">
            <strong className="text-aurex-gold-500">⚠️ Responsible Gaming:</strong> {t('footer.responsibleWarning')}
          </p>
        </div>
        
        {/* Final branding */}
        <div className="mt-8 text-center">
          <p className="text-aurex-platinum-600 text-xs tracking-widest uppercase">
            Welcome to the Empire
          </p>
        </div>
      </div>
    </footer>
  );
}