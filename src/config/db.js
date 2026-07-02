import { MongoClient } from 'mongodb';
import { env } from './env.js';

// Serverless-friendly MongoDB connection.
//
// On Vercel each request may hit a fresh (cold) function instance, and warm
// instances are reused. We cache a single MongoClient on `globalThis` so warm
// invocations reuse the same connection pool instead of opening a new one per
// request (which would quickly exhaust Atlas's connection limit). `maxPoolSize`
// is kept small for the same reason. Index creation is NOT done here — it's a
// one-time operation handled by the seed script, not something to run on every
// cold start.
const options = { maxPoolSize: 10 };

let cached = globalThis.__ideavaultMongo;
if (!cached) {
  cached = globalThis.__ideavaultMongo = { client: null, db: null, promise: null };
}

export async function connectDB() {
  if (cached.db) return cached.db;
  if (!cached.promise) {
    cached.promise = new MongoClient(env.mongoUri, options).connect().then((client) => {
      cached.client = client;
      cached.db = client.db(env.mongoDb);
      return cached.db;
    });
  }
  try {
    await cached.promise;
  } catch (err) {
    cached.promise = null; // allow the next invocation to retry a failed connect
    throw err;
  }
  return cached.db;
}

function getDb() {
  if (!cached.db) throw new Error('Database not connected. Call connectDB() first.');
  return cached.db;
}

// Collection accessors — the three collections used across the app.
export const usersCollection = () => getDb().collection('users');
export const ideasCollection = () => getDb().collection('ideas');
export const commentsCollection = () => getDb().collection('comments');
