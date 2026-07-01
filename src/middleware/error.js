import { ApiError } from '../lib/http.js';
import { env } from '../config/env.js';

// 404 for unmatched routes — keep the same `{ error }` shape as everything else.
export function notFound(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// Central error handler. ApiError carries an intended status; anything else is
// treated as an unexpected 500 (and logged) so we never leak internals.
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  const message = env.isProduction ? 'Internal server error' : err.message;
  res.status(500).json({ error: message });
}
