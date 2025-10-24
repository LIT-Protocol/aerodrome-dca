import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

// Ref: https://github.com/t3-oss/t3-env/pull/145
const booleanStrings = ['true', 'false', true, false, '1', '0', 'yes', 'no', 'y', 'n', 'on', 'off'];
const BooleanOrBooleanStringSchema = z
  .any()
  .refine((val) => booleanStrings.includes(val), { message: 'must be boolean' })
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const normalized = val.toLowerCase().trim();
      if (['true', 'yes', 'y', '1', 'on'].includes(normalized)) return true;
      if (['false', 'no', 'n', '0', 'off'].includes(normalized)) return false;
      throw new Error(`Invalid boolean string: "${val}"`);
    }
    throw new Error(`Expected boolean or boolean string, got: ${typeof val}`);
  });

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: import.meta.env,
  clientPrefix: 'VITE_',
  client: {
    VITE_APP_ID: z.coerce.number(),
    VITE_BACKEND_URL: z.string(),
    VITE_EXPECTED_AUDIENCE: z.string().default(window.location.origin),
    VITE_IS_DEVELOPMENT: BooleanOrBooleanStringSchema.default(false),
    VITE_MIN_PURCHASE_AMOUNT: z.coerce.number().default(25),
    VITE_REDIRECT_URI: z.string().default(window.location.origin),
    VITE_SENTRY_DSN: z.string().optional(),
    VITE_SENTRY_FILTER: z.string().optional().default('dca-frontend'),
  },
});
