import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_POSTGRES_PRISMA_URL: z.string().optional(),
  DATABASE_POSTGRES_URL_NON_POOLING: z.string().optional(),
  BOT_SERVICE_TOKEN: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
});

export const env = envSchema.parse(process.env);
