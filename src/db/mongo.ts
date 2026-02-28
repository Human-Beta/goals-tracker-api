import type { MongoClient } from 'mongodb';

const mongoCache: { client: MongoClient | null } = {
  client: null,
};

export async function connectMongo(): Promise<MongoClient> {
  if (mongoCache.client) {
    return mongoCache.client;
  }

  throw new Error('connectMongo is not implemented yet.');
}
