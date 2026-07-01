import { usersCollection } from '../config/db.js';
import { env } from '../config/env.js';
import { AUTH_COOKIE, signToken, authCookieOptions } from '../lib/jwt.js';
import { hashPassword, verifyPassword, validatePassword } from '../lib/password.js';
import { publicUser } from '../lib/serialize.js';
import { ApiError } from '../lib/http.js';
import { getCurrentUser } from '../middleware/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Issue the JWT cookie and also return the token in the body, so cookie-based
// (same-site) and header-based (cross-origin) clients both work.
function issueSession(res, user, status = 200) {
  const token = signToken({ sub: user.id, email: user.email });
  res.cookie(AUTH_COOKIE, token, authCookieOptions());
  return res.status(status).json({ user, token });
}

// POST /api/auth/register
export async function register(req, res) {
  const body = req.body || {};
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const photoURL = (body.photoURL || '').trim();
  const password = body.password || '';

  if (!name) throw new ApiError(400, 'Name is required');
  if (!email || !EMAIL_RE.test(email)) throw new ApiError(400, 'A valid email is required');
  const passwordError = validatePassword(password);
  if (passwordError) throw new ApiError(400, passwordError);

  const users = usersCollection();
  const existing = await users.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const now = new Date();
  const doc = {
    name,
    email,
    photoURL,
    passwordHash: await hashPassword(password),
    provider: 'credentials',
    bookmarks: [],
    createdAt: now,
    updatedAt: now,
  };
  const result = await users.insertOne(doc);
  return issueSession(res, publicUser({ ...doc, _id: result.insertedId }), 201);
}

// POST /api/auth/login
export async function login(req, res) {
  const body = req.body || {};
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await usersCollection().findOne({ email });
  // Same message for unknown email and wrong password to avoid user enumeration.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  return issueSession(res, publicUser(user));
}

// POST /api/auth/logout
export async function logout(_req, res) {
  res.cookie(AUTH_COOKIE, '', authCookieOptions(0));
  res.json({ success: true });
}

// GET /api/auth/me — the client relies on this because the cookie is httpOnly.
export async function me(req, res) {
  const user = await getCurrentUser(req);
  res.json({ user });
}

// GET /api/auth/google — start the OAuth 2.0 authorization-code flow.
export async function googleStart(req, res) {
  const { clientId, serverUrl } = env.google;
  if (!clientId) {
    const url = new URL('/login', env.frontendUrl);
    url.searchParams.set('error', 'Google login is not configured');
    return res.redirect(url.toString());
  }

  const redirectAfter = (req.query.redirect || '/').toString();
  const nonce = crypto.randomUUID();
  const state = Buffer.from(JSON.stringify({ nonce, redirect: redirectAfter })).toString('base64url');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', `${serverUrl}/api/auth/google/callback`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  res.cookie('oauth_state', nonce, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 600 * 1000,
  });
  res.redirect(authUrl.toString());
}

// GET /api/auth/google/callback — verify state, exchange code, upsert user,
// set our JWT cookie, and redirect back to the frontend.
export async function googleCallback(req, res) {
  const loginError = (message) => {
    const url = new URL('/login', env.frontendUrl);
    url.searchParams.set('error', message);
    return res.redirect(url.toString());
  };

  const code = (req.query.code || '').toString();
  const stateParam = (req.query.state || '').toString();
  const storedNonce = req.cookies?.oauth_state;
  if (!code || !stateParam) return loginError('Google login failed');

  let state;
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    return loginError('Invalid login state');
  }
  if (!storedNonce || storedNonce !== state.nonce) {
    return loginError('Login state mismatch, please try again');
  }

  const { clientId, clientSecret, serverUrl } = env.google;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${serverUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return loginError('Could not verify Google account');
  const tokens = await tokenRes.json();

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) return loginError('Could not load Google profile');
  const profile = await profileRes.json();

  const email = (profile.email || '').toLowerCase();
  if (!email) return loginError('Google account has no email');

  const users = usersCollection();
  const now = new Date();
  await users.updateOne(
    { email },
    {
      $set: {
        name: profile.name || email.split('@')[0],
        photoURL: profile.picture || '',
        provider: 'google',
        updatedAt: now,
      },
      $setOnInsert: { email, bookmarks: [], createdAt: now },
    },
    { upsert: true }
  );
  const user = await users.findOne({ email });

  const token = signToken({ sub: user._id.toString(), email });
  res.cookie(AUTH_COOKIE, token, authCookieOptions());
  res.cookie('oauth_state', '', { path: '/', maxAge: 0 });

  const redirectTo = new URL(state.redirect || '/', env.frontendUrl);
  res.redirect(redirectTo.toString());
}
