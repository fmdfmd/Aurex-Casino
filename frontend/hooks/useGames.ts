import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Get all games - backend уже обрабатывает данные
export const useGamesQuery = () => {
  return useQuery(
    ['games'],
    async () => {
      const response = await fetch('/api/slots/games');
      const result = await response.json();
      return result;
    },
    {
      staleTime: 0,
      cacheTime: 0
    }
  );
};

// Get game by ID
export const useGameQuery = (gameId: string) => {
  return useQuery(
    ['game', gameId],
    async () => {
      const response = await axios.get(`/api/slots/game/${gameId}`);
      return response.data;
    },
    {
      enabled: !!gameId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      onError: (error: any) => {
        console.error('Failed to fetch game:', error);
        toast.error('Не удалось загрузить игру');
      }
    }
  );
};

// Start game session
export const useStartGameMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async ({ gameCode, currency = 'RUB' }: { gameCode: string; currency?: string }) => {
      const response = await axios.post('/api/slots/start-game', {
        gameCode,
        currency
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        // Invalidate game sessions cache
        queryClient.invalidateQueries('game-sessions');
        toast.success('Игра запущена!');
      },
      onError: (error: any) => {
        console.error('Failed to start game:', error);
        toast.error('Не удалось запустить игру');
      }
    }
  );
};

// Get user's game sessions
export const useGameSessionsQuery = () => {
  return useQuery(
    'game-sessions',
    async () => {
      const response = await axios.get('/api/slots/sessions');
      return response.data;
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      onError: (error: any) => {
        console.error('Failed to fetch game sessions:', error);
        toast.error('Не удалось загрузить сессии игр');
      }
    }
  );
};

// Search games
export const useSearchGamesQuery = (searchTerm: string) => {
  const { data: gamesData } = useGamesQuery();
  
  return useQuery(
    ['search-games', searchTerm],
    async () => {
      if (!gamesData?.data?.games || !searchTerm) {
        return { data: { games: [] } };
      }
      
      const filteredGames = gamesData.data.games.filter((game: any) =>
        game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.provider.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return {
        data: {
          games: filteredGames,
          total: filteredGames.length
        }
      };
    },
    {
      enabled: !!searchTerm && !!gamesData,
      staleTime: 5 * 60 * 1000
    }
  );
};

// Filter games by provider
export const useFilterGamesByProvider = (provider: string) => {
  const { data: gamesData } = useGamesQuery();
  
  return useQuery(
    ['filter-games', provider],
    async () => {
      if (!gamesData?.data?.games || !provider) {
        return gamesData;
      }
      
      const filteredGames = gamesData.data.games.filter((game: any) =>
        game.provider.toLowerCase() === provider.toLowerCase()
      );
      
      return {
        ...gamesData,
        data: {
          ...gamesData.data,
          games: filteredGames,
          total: filteredGames.length
        }
      };
    },
    {
      enabled: !!provider && !!gamesData,
      staleTime: 5 * 60 * 1000
    }
  );
};

// Get popular games
export const usePopularGamesQuery = (limit: number = 10) => {
  const { data: gamesData } = useGamesQuery();
  
  return useQuery(
    ['popular-games', limit],
    async () => {
      if (!gamesData?.data?.games) {
        return { data: { games: [] } };
      }
      
      const popularGames = gamesData.data.games
        .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, limit);
      
      return {
        data: {
          games: popularGames,
          total: popularGames.length
        }
      };
    },
    {
      enabled: !!gamesData,
      staleTime: 10 * 60 * 1000
    }
  );
};

// Get new games
export const useNewGamesQuery = (limit: number = 10) => {
  const { data: gamesData } = useGamesQuery();
  
  return useQuery(
    ['new-games', limit],
    async () => {
      if (!gamesData?.data?.games) {
        return { data: { games: [] } };
      }
      
      const newGames = gamesData.data.games
        .filter((game: any) => game.isNew)
        .slice(0, limit);
      
      return {
        data: {
          games: newGames,
          total: newGames.length
        }
      };
    },
    {
      enabled: !!gamesData,
      staleTime: 10 * 60 * 1000
    }
  );
};

// Get game providers
export const useGameProvidersQuery = () => {
  const { data: gamesData } = useGamesQuery();
  
  return useQuery(
    'game-providers',
    async () => {
      if (!gamesData?.data?.games) {
        return { data: { providers: [] } };
      }
      
      const providers = Array.from(new Set(gamesData.data.games.map((game: any) => game.provider)))
        .filter(Boolean)
        .sort();
      
      return {
        data: {
          providers: providers.map(provider => ({
            name: provider,
            count: gamesData.data.games.filter((game: any) => game.provider === provider).length
          }))
        }
      };
    },
    {
      enabled: !!gamesData,
      staleTime: 15 * 60 * 1000
    }
  );
};