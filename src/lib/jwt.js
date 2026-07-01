import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const AUTH_COOKIE = 'token';
const TOKEN_TTL = '7d';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { algorithm: 'HS256', expiresIn: TOKEN_TTL });
}

// Returns the decoded payload, or null if the token is missing/invalid/expired.
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

// Cookie options shared by login/register/logout responses. `sameSite: 'none'`
// + `secure` in production so the httpOnly cookie is sent on cross-origin
// requests from the deployed frontend; 'lax' over http in local dev.
export function authCookieOptions(maxAge = MAX_AGE_MS) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
    maxAge,
  };
}
