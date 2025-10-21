import { useState, useEffect } from 'react';
import { useBackend } from './useBackend';

export interface Token {
  address: `0x${string}`;
  symbol: string;
  name?: string;
  decimals: number;
  price?: string;
}

/** Hook to fetch available tokens from the backend */
export const useTokens = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { getTokens } = useBackend();

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        const data = await getTokens();
        setTokens(data);
      } catch (err) {
        console.error('Error fetching tokens:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [getTokens]);

  return { tokens, loading, error };
};
