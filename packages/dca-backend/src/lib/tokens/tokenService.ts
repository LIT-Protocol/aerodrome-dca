import {
  getDefaultConfig,
  base,
  type Token,
  getListedTokens,
} from '@lit-protocol/vincent-ability-aerodrome-swap';

import { env } from '../env';

const { BASE_RPC_URL } = env;

// Create sugar SDK configuration for Base chain
const sugarConfig = getDefaultConfig({
  chains: [{ chain: base, rpcUrl: BASE_RPC_URL }],
});

/** Token information with essential details for swapping */
export interface TokenInfo {
  address: `0x${string}`;
  decimals: number;
  listed: boolean;
  name?: string;
  price?: string;
  symbol: string; // USD price as string for display
}

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

// In-memory cache
let cachedTokens: TokenInfo[] | null = null;
let cacheTimestamp: number | null = null;

/** Helper function to check if cache is still valid */
function isCacheValid(): boolean {
  if (!cachedTokens || !cacheTimestamp) {
    return false;
  }
  const now = Date.now();
  return now - cacheTimestamp < CACHE_TTL_MS;
}

/** Fetches token data from Aerodrome and updates cache */
async function fetchAndCacheTokens(): Promise<TokenInfo[]> {
  const tokens = await getListedTokens({ config: sugarConfig });

  // Filter for Base chain and listed tokens only
  const baseTokens = tokens
    .filter((token: Token) => token.chainId === base.id && token.listed)
    .map((token: Token) => {
      // Divide BigInt first to preserve precision, then convert to Number
      const priceUSD =
        token.price > 0n ? (Number(token.price / 10n ** 14n) / 10000).toFixed(4) : undefined;

      return {
        address: token.address,
        decimals: token.decimals,
        listed: token.listed,
        name: token.name,
        price: priceUSD,
        symbol: token.symbol,
      };
    });

  // Update cache
  cachedTokens = baseTokens;
  cacheTimestamp = Date.now();

  return baseTokens;
}

/**
 * Fetches all listed tokens from Aerodrome on Base chain. Returns cached data if available and less
 * than 5 minutes old.
 */
export async function getAerodromeTokens(): Promise<TokenInfo[]> {
  // Return cached data if valid
  if (isCacheValid() && cachedTokens) {
    return cachedTokens;
  }

  // Fetch fresh data and update cache
  return fetchAndCacheTokens();
}

/** Get token information by address */
export async function getTokenByAddress(address: string): Promise<TokenInfo | null> {
  const tokens = await getAerodromeTokens();
  return tokens.find((token) => token.address.toLowerCase() === address.toLowerCase()) || null;
}
