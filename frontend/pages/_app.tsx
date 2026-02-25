import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { Inter, Poppins } from 'next/font/google';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
// import GoldenDrops from '../components/GoldenDrops'; // Временно отключен
import LiveChatWidget from '../components/LiveChatWidget';
import SplashScreen from '../components/SplashScreen';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
});

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins'
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const { initializeAuth } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    initializeAuth();
    
    // Capture click_id from affiliate traffic URL params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const clickId = params.get('click_id') || params.get('clickid') || params.get('sub_id');
      if (clickId) {
        document.cookie = `aurex_click_id=${encodeURIComponent(clickId)};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`;
      }
    }

    const splashShown = sessionStorage.getItem('aurex_splash_shown');
    if (splashShown) {
      setShowSplash(false);
    }
  }, [initializeAuth]);

  const handleSplashComplete = () => {
    sessionStorage.setItem('aurex_splash_shown', 'true');
    setShowSplash(false);
  };

  return (
    <>
      {/* Premium Splash Screen - only on first visit per session */}
      {isClient && showSplash && (
        <SplashScreen onComplete={handleSplashComplete} minDuration={3500} />
      )}
      
      <Head>
        <title>AUREX - The Golden Empire of Win</title>
        
        {/* Cinzel Font for Premium Typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="description" content="AUREX - премиальное онлайн-казино. Слоты от лучших провайдеров, Live Casino, турниры с призами до ₽1,000,000. Мгновенные выплаты, VIP программа, щедрые бонусы до ₽140,000." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        {/* Canonical URL - не хардкодим домен, работает на любом зеркале */}
        
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
        
        {/* Trust & Security Meta Tags */}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="author" content="AUREX Casino — Empire Gaming N.V." />
        <meta name="publisher" content="Empire Gaming N.V." />
        <meta name="copyright" content="© 2026 AUREX Casino. All rights reserved." />
        <meta name="format-detection" content="telephone=no" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="rating" content="mature" />
        <meta name="classification" content="Gaming, Entertainment" />
        
        {/* SEO */}
        <meta name="keywords" content="AUREX casino, онлайн казино, слоты, live casino, premium casino, VIP casino, мгновенные выплаты" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="apple-mobile-web-app-title" content="AUREX Casino" />
        <meta name="application-name" content="AUREX Casino" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aurex.casino/" />
        <meta property="og:title" content="AUREX - The Golden Empire of Win" />
        <meta property="og:description" content="Премиальное онлайн-казино с мгновенными выплатами. Слоты, Live Casino, турниры с призами до ₽1,000,000. VIP программа и щедрые бонусы." />
        <meta property="og:image" content="https://aurex.casino/images/og-image.jpg" />
        <meta property="og:image:width" content="1264" />
        <meta property="og:image:height" content="848" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:site_name" content="AUREX Casino" />
        <meta property="og:locale" content="ru_RU" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://aurex.casino/" />
        <meta name="twitter:title" content="AUREX - The Golden Empire of Win" />
        <meta name="twitter:description" content="Премиальное онлайн-казино. Мгновенные выплаты, слоты, Live Casino, VIP программа." />
        <meta name="twitter:image" content="https://aurex.casino/images/og-image.jpg" />

        {/* JSON-LD Structured Data — Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "AUREX Casino",
              "alternateName": "AUREX - The Golden Empire of Win",
              "url": "https://aurex.casino",
              "logo": "https://aurex.casino/images/aurexlogo.png",
              "description": "Премиальное онлайн-казино с мгновенными выплатами. Слоты от лучших провайдеров, Live Casino, VIP программа.",
              "foundingDate": "2025",
              "contactPoint": [
                {
                  "@type": "ContactPoint",
                  "contactType": "customer support",
                  "email": "support@aurex.casino",
                  "availableLanguage": ["Russian", "English"],
                  "areaServed": "Worldwide"
                },
                {
                  "@type": "ContactPoint",
                  "contactType": "VIP support",
                  "email": "vip@aurex.casino"
                }
              ],
              "sameAs": [
                "https://t.me/aurex_casino",
                "https://instagram.com/aurexcasino",
                "https://twitter.com/aurexcasino"
              ]
            })
          }}
        />

        {/* JSON-LD Structured Data — WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "AUREX Casino",
              "url": "https://aurex.casino",
              "inLanguage": ["ru", "en"],
              "publisher": {
                "@type": "Organization",
                "name": "Empire Gaming N.V."
              }
            })
          }}
        />
      </Head>
      
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
        <div className={`${inter.variable} ${poppins.variable} font-sans`}>
          <Component {...pageProps} />
          {/* <GoldenDrops /> */}
          <LiveChatWidget />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0A0A0A',
                color: '#fff',
                border: '1px solid #D4AF37',
                borderRadius: '8px',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
        </ErrorBoundary>
      </QueryClientProvider>
    </>
  );
}