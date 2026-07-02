// Local development server ONLY. In production the app runs as the Vercel
// serverless function in `api/index.js` — this file is never used there.
// It simply serves that exact same handler over a normal HTTP port so local
// dev behaves identically to production (no separate Express bootstrap, no
// long-lived-server concerns like graceful shutdown that don't apply to
// serverless).
import http from 'node:http';
import handler from '../api/index.js';
import { env } from './config/env.js';

http.createServer((req, res) => handler(req, res)).listen(env.port, () => {
  console.log(`IdeaVault API (local dev) → http://localhost:${env.port}`);
});
