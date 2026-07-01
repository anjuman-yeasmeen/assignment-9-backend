import { MongoClient } from 'mongodb';
import { env } from './env.js';

// A single shared MongoClient / connection pool for the whole process.
// `connectDB()` is awaited once at startup; the collection accessors below
// assume the connection is already established.

const client = new MongoClient(env.mongoUri);
let db;

export async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db(env.mongoDb);
  await ensureIndexes(db);
  return db;
}

export async function closeDB() {
  await client.close();
  db = undefined;
}

function getDb() {
  if (!db) throw new Error('Database not connected. Call connectDB() first.');
  return db;
}

// Collection accessors — the three collections used across the app.
export const usersCollection = () => getDb().collection('users');
export const ideasCollection = () => getDb().collection('ideas');
export const commentsCollection = () => getDb().collection('comments');

async function ensureIndexes(database) {
  await database.collection('users').createIndex({ email: 1 }, { unique: true });
  await database.collection('ideas').createIndex({ createdAt: -1 });
  await database.collection('ideas').createIndex({ authorId: 1 });
  await database.collection('comments').createIndex({ ideaId: 1 });
  await database.collection('comments').createIndex({ userId: 1 });
}
