import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useBackend } from './useBackend';

export interface Token {
  address: `0x${string}`;
  symbol: string;
  name?: string;
  decimals: number;
  price?: string;
}

interface TokenStore {
  tokens: Token[];
  loading: boolean;
  error: Error | null;
  fetchTokens: (getTokensFn: () => Promise<Token[]>) => Promise<void>;
}

const useTokenStore = create<TokenStore>((set) => ({
  tokens: [],
  loading: false,
  error: null,
  fetchTokens: async (getTokensFn) => {
    try {
      set({ loading: true, error: null });
      const data = await getTokensFn();
      set({ tokens: data, loading: false });
    } catch (err) {
      console.error('Error fetching tokens:', err);
      set({
        error: err instanceof Error ? err : new Error('Unknown error'),
        loading: false,
      });
    }
  },
}));

/** Hook to fetch available tokens from the backend */
export const useTokens = () => {
  const { tokens, loading, error, fetchTokens } = useTokenStore();
  const { getTokens } = useBackend();

  const getTokensRef = useRef(getTokens);
  useEffect(() => {
    getTokensRef.current = getTokens;
  });

  useEffect(() => {
    if (tokens.length === 0 && !loading) {
      fetchTokens(() => getTokensRef.current());
    }
  }, [tokens.length, loading, fetchTokens]);

  return { tokens, loading, error, refetch: () => fetchTokens(getTokensRef.current) };
};
