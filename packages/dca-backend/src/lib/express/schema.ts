import { Types } from 'mongoose';
import { z } from 'zod';

export const ScheduleParamsSchema = z.object({
  app: z.object({
    id: z.number(),
    version: z.number(),
  }),
  name: z.string().default('DCASwap'),
  pkpInfo: z.object({
    ethAddress: z
      .string()
      .refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), { message: 'Invalid Ethereum address' }),
    publicKey: z.string(),
    tokenId: z.string(),
  }),
  purchaseAmount: z
    .string()
    .refine((val) => /^\d*\.?\d{1,2}$/.test(val) && parseFloat(val) >= 1, {
      message: 'Must be at least $1.00 USD with up to 2 decimal places',
    })
    .transform((val) => parseFloat(val)),
  purchaseIntervalHuman: z.string(),
  tokenIn: z.object({
    address: z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), {
      message: 'Invalid token address',
    }) as z.ZodType<`0x${string}`>,
    decimals: z.number(),
    symbol: z.string(),
  }),
  tokenOut: z.object({
    address: z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), {
      message: 'Invalid token address',
    }) as z.ZodType<`0x${string}`>,
    decimals: z.number(),
    symbol: z.string(),
  }),
});
export const ScheduleIdentitySchema = z.object({
  scheduleId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), { message: 'Invalid ObjectId' }),
});
