import { useEffect, useRef, useState } from 'react';

interface TelegramLoginButtonProps {
  botName: string;
  onAuth: (user: TelegramUser) => void;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    __onTelegramAuth?: (user: TelegramUser) => void;
  }
}

export default function TelegramLoginButton({ botName, onAuth }: TelegramLoginButtonProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  useEffect(() => {
    // Set global callback
    window.__onTelegramAuth = (user) => {
      onAuth(user);
    };

    // Try to load the Telegram widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-onauth', '__onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    script.onload = () => {
      // Give widget time to render the iframe
      setTimeout(() => {
        if (widgetRef.current && widgetRef.current.querySelector('iframe')) {
          setWidgetLoaded(true);
        }
      }, 1500);
    };

    if (widgetRef.current) {
      widgetRef.current.innerHTML = '';
      widgetRef.current.appendChild(script);
    }

    return () => {
      delete window.__onTelegramAuth;
    };
  }, [botName, onAuth]);

  return (
    <div>
      {/* Hidden widget container - Telegram script renders here */}
      <div
        ref={widgetRef}
        className={widgetLoaded ? 'flex justify-center' : 'absolute opacity-0 pointer-events-none h-0 overflow-hidden'}
      />

      {/* Custom fallback button shown until widget loads */}
      {!widgetLoaded && (
        <button
          type="button"
          onClick={() => {
            // Open Telegram auth in a popup
            const popup = window.open(
              `https://oauth.telegram.org/auth?bot_id=${botName}&origin=${encodeURIComponent(window.location.origin)}&request_access=write`,
              'telegram_auth',
              'width=550,height=450,menubar=no,toolbar=no'
            );

            // Listen for auth result from popup
            const checkInterval = setInterval(() => {
              try {
                if (popup && popup.closed) {
                  clearInterval(checkInterval);
                }
              } catch (e) {
                clearInterval(checkInterval);
              }
            }, 500);
          }}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-medium rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Войти через Telegram
        </button>
      )}
    </div>
  );
}
