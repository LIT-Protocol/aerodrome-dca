import { Response } from 'express';

import { VincentAuthenticatedRequest } from './types';
import { getAerodromeTokens } from '../tokens/tokenService';

/** GET /tokens Returns list of available tokens from Aerodrome */
export async function handleListTokensRoute(
  _req: VincentAuthenticatedRequest,
  res: Response
): Promise<void> {
  const tokens = await getAerodromeTokens();

  if (!tokens || tokens.length === 0) {
    res.status(404).json({
      error: 'No tokens available from Aerodrome',
      success: false,
    });
    return;
  }

  res.status(200).json({
    data: tokens,
    success: true,
  });
}
