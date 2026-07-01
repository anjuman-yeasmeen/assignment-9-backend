import { usersCollection } from '../config/db.js';
import { AUTH_COOKIE, verifyToken } from '../lib/jwt.js';
import { publicUser, toObjectId } from '../lib/serialize.js';
import { ApiError, asyncHandler } from '../lib/http.js';

// Reads the JWT from the httpOnly cookie OR an `Authorization: Bearer` header,
// verifies it, loads the user, and returns the public shape (or null).
export async function getCurrentUser(req) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.[AUTH_COOKIE] || bearer;

  const payload = verifyToken(token);
  if (!payload?.sub) return null;

  const _id = toObjectId(payload.sub);
  if (!_id) return null;

  const user = await usersCollection().findOne({ _id });
  return publicUser(user);
}

// Populates `req.user` if authenticated; never rejects. Use on routes that are
// public but behave differently when logged in.
export const attachUser = asyncHandler(async (req, _res, next) => {
  req.user = await getCurrentUser(req);
  next();
});

// Requires a valid session; responds 401 otherwise. Sets `req.user`.
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await getCurrentUser(req);
  if (!user) throw new ApiError(401, 'Unauthorized');
  req.user = user;
  next();
});
