import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  botName: string;
}

export default function TelegramLoginButton({ botName }: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Save referral code in cookie before Telegram redirect
    const ref = router.query.ref as string;
    if (ref) {
      document.cookie = `aurex_ref=${ref}; path=/; max-age=1800; SameSite=Lax`;
    }

    // Сохраняем текущий домен в cookie — бэкенд после auth редиректит на него
    document.cookie = `aurex_origin=${encodeURIComponent(window.location.origin)}; path=/; max-age=600; SameSite=Lax`;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram/callback`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
    }
  }, [botName, router.query.ref]);

  return (
    <div className="w-full flex justify-center bg-[#2AABEE] hover:bg-[#229ED9] rounded-lg transition-colors py-1">
      <div ref={containerRef} />
    </div>
  );
}
