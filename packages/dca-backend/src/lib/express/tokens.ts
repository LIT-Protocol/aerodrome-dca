import { Response } from 'express';

import { VincentAuthenticatedRequest } from './types';
import { getAerodromeTokens } from '../tokens/tokenService';

/** GET /tokens Returns list of available tokens from Aerodrome */
export async function handleListTokensRoute(
  _req: VincentAuthenticatedRequest,
  res: Response
): Promise<void> {
  const tokens = await getAerodromeTokens();

  res.status(200).json({
    data: tokens,
    success: true,
  });
}
