import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../store/authStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { loginWithToken, isAuthenticated } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const token = router.query.token as string;
    const errorParam = router.query.error as string;

    if (errorParam) {
      setError('Ошибка авторизации. Попробуйте снова.');
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    if (token) {
      loginWithToken(token)
        .then(() => {
          router.push('/');
        })
        .catch(() => {
          setError('Не удалось войти. Попробуйте снова.');
          setTimeout(() => router.push('/login'), 3000);
        });
    } else {
      router.push('/login');
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-300">
      <div className="text-center">
        {error ? (
          <div>
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <p className="text-gray-400">Перенаправляем...</p>
          </div>
        ) : (
          <div>
            <div className="loading-spinner w-10 h-10 mx-auto mb-4 border-2 border-casino-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-300 text-lg">Выполняем вход...</p>
          </div>
        )}
      </div>
    </div>
  );
}
