// Vercel serverless entrypoint. Vercel doesn't run a long-lived `app.listen()`
// process (that's what src/server.js is for on Render / local dev) — instead it
// invokes this exported handler per request. We reuse the same Express app and
// cache the MongoDB connection across warm invocations.
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

const app = createApp();
let dbReady;

export default async function handler(req, res) {
  // Establish (and reuse) the DB connection before handling the request.
  try {
    if (!dbReady) dbReady = connectDB();
    await dbReady;
  } catch (err) {
    dbReady = undefined; // let the next invocation retry instead of caching failure
    console.error('DB connection failed:', err);
    res.status(500).json({ error: 'Database connection failed' });
    return;
  }
  return app(req, res);
}
