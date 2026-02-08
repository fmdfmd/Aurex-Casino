import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Wager {
  required: number;
  completed: number;
  active: boolean;
  multiplier: number;
  expiresAt: string | null;
}

interface ActiveBonus {
  id: string;
  type: 'deposit' | 'freespins' | 'cashback' | 'reload';
  name: string;
  amount: number;
  wagerRequired: number;
  wagerCompleted: number;
  expiresAt: string;
  createdAt: string;
}

interface User {
  id: string;
  odid: string; // Unique AUREX ID (e.g., AUREX-000001)
  username: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatar?: string;
  country?: string;
  birthDate?: string;
  balance: number;
  bonusBalance: number;
  totalBalanceRUB?: number;
  vipLevel: number;
  vipPoints: number;
  isVerified: boolean;
  isAdmin?: boolean;
  role?: 'user' | 'admin';
  referralCode?: string;
  totalDeposited?: number;
  totalWithdrawn?: number;
  gamesPlayed?: number;
  totalWagered?: number;
  
  // Deposit tracking
  depositCount?: number;
  usedBonuses?: {
    firstDeposit: boolean;
    secondDeposit: boolean;
    thirdDeposit: boolean;
    fourthDeposit: boolean;
  };
  
  // Wager tracking
  wager?: Wager;
  activeBonuses?: ActiveBonus[];
  
  // Referral
  referral?: {
    code: string;
    referredBy: string | null;
    referralCount: number;
    referralEarnings: number;
  };
  
  // Limits
  limits?: {
    dailyDeposit: number | null;
    weeklyDeposit: number | null;
    monthlyDeposit: number | null;
    sessionTime: number | null;
    selfExcluded: boolean;
    selfExcludedUntil: string | null;
  };
  
  // Statistics
  statistics?: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalWagered: number;
    totalWon: number;
    totalLost: number;
    gamesPlayed: number;
    biggestWin: number;
    favoriteGame: string | null;
  };
  
  settings?: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      showOnline: boolean;
      showStats: boolean;
    };
  };
  lastLogin?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (loginOrEmail: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  loginWithTelegram: (data: Record<string, string>) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  initializeAuth: () => void;
}

interface RegisterData {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
}

// Не используем baseURL - запросы идут через Next.js proxy (/api/* -> backend)
// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (loginOrEmail: string, password: string) => {
        set({ isLoading: true });
        try {
          // Поддержка входа по email или username
          const response = await axios.post('/api/auth/login', {
            login: loginOrEmail,
            email: loginOrEmail, // для обратной совместимости
            password,
          });

          const resData = response.data?.data;
          if (!resData?.user || !resData?.token) {
            throw new Error('Invalid server response');
          }
          const { user, token } = resData;
          
          // Set auth header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success('Добро пожаловать!');
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Ошибка входа';
          toast.error(message);
          throw error;
        }
      },

      loginWithToken: async (token: string) => {
        set({ isLoading: true });
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get('/api/auth/me');
          const { user } = response.data?.data || {};
          if (!user) throw new Error('Invalid token');

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success('Добро пожаловать!');
        } catch (error: any) {
          set({ isLoading: false });
          delete axios.defaults.headers.common['Authorization'];
          const message = error.response?.data?.error || 'Ошибка авторизации';
          toast.error(message);
          throw error;
        }
      },

      loginWithTelegram: async (data: Record<string, string>) => {
        set({ isLoading: true });
        try {
          const response = await axios.post('/api/auth/telegram', data);
          const resData = response.data?.data;
          if (!resData?.user || !resData?.token) {
            throw new Error('Invalid server response');
          }
          const { user, token } = resData;

          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success('Добро пожаловать!');
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Ошибка входа через Telegram';
          toast.error(message);
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          const response = await axios.post('/api/auth/register', data);

          const resData = response.data?.data;
          if (!resData?.user || !resData?.token) {
            throw new Error('Invalid server response');
          }
          const { user, token } = resData;
          
          // Set auth header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success('Регистрация успешна! Добро пожаловать!');
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Ошибка регистрации';
          toast.error(message);
          throw error;
        }
      },

      logout: () => {
        // Remove auth header
        delete axios.defaults.headers.common['Authorization'];
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });

        toast.success('Вы вышли из системы');
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await axios.get('/api/auth/me');
          const { user } = response.data?.data || {};
          
          set({ user });
        } catch (error: any) {
          console.error('Failed to refresh user:', error);
          // If token is invalid, logout
          if (error.response?.status === 401) {
            get().logout();
          }
        }
      },

      updateUser: (data: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...data } });
        }
      },

      initializeAuth: () => {
        const { token } = get();
        if (token) {
          // Set auth header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          // Refresh user data
          get().refreshUser();
        }
      },
    }),
    {
      name: 'aurex-auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);