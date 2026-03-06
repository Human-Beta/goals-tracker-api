import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & {
  __prismaClient__?: PrismaClient;
};

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.__prismaClient__) {
    globalForPrisma.__prismaClient__ = new PrismaClient();
  }

  return globalForPrisma.__prismaClient__;
}

export const prisma = getPrismaClient();
