# IdeaVault — Backend API (Express + MongoDB)

The server-side API for **IdeaVault**, a community platform where founders and enthusiasts share startup ideas, browse and search them, and engage through comments. This service handles authentication, idea CRUD, and the comment/interaction system; the [Next.js client](../assignment-9-frontend) consumes it.

## Features

- 🔐 **JWT authentication** — email/password *and* Google OAuth 2.0; tokens are issued as an httpOnly cookie **and** returned in the response body so both same-site and cross-origin clients work.
- 💡 **Idea CRUD** with owner-only edit/delete, plus denormalized author info and like/comment counters.
- 🔎 **Search & filter** — case-insensitive title search (`$regex`), category filter, optional `createdAt` date range (`$gte`/`$lte`), and `trending`/`newest` sorting with `$limit`.
- 💬 **Comment system** — add / edit-own / delete-own comments, with the idea's `commentCount` kept in sync via `$inc`.
- 📊 **User activity** — "my ideas" and a "my interactions" aggregation of every idea a user has commented on.
- 🧱 Layered architecture (config → lib → middleware → controllers → routes) with centralized error handling and a consistent `{ error }` response shape.

## Tech stack

Node.js · Express 5 · MongoDB (native driver) · JSON Web Tokens · bcryptjs · CORS with credentials.

## Getting started

```bash
npm install
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
npm run seed              # optional: demo user + 6 sample ideas
npm run dev               # starts on http://localhost:5000 with --watch
```

`npm run seed` creates a demo login → **email:** `demo@ideavault.app` · **password:** `Demo123`.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no | HTTP port (default `5000`). |
| `NODE_ENV` | no | `development` / `production`; controls cookie `secure`/`sameSite`. |
| `MONGO_URI` | **yes** | MongoDB connection string. |
| `MONGO_DB` | no | Database name (default `ideavault`). |
| `JWT_SECRET` | **yes** | Secret for signing JWTs. |
| `CLIENT_ORIGIN` | no | Comma-separated allowed browser origins for credentialed CORS (default `http://localhost:3000`). |
| `FRONTEND_URL` | no | Where OAuth redirects the browser back to. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Enable Google login. |
| `SERVER_URL` | no | Public URL of this backend, used to build the OAuth `redirect_uri`. |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start with `--watch` auto-reload, loading `.env`. |
| `npm start` | Start without watch (production). |
| `npm run seed` | Seed the demo user and sample ideas. |

## Architecture

```
src/
  server.js              # entry: connect DB, start HTTP server, graceful shutdown
  app.js                 # express app: CORS, json, cookies, routes, error handling
  config/
    env.js               # validated environment variables
    db.js                # single MongoClient, collection accessors, indexes
  lib/
    jwt.js               # sign/verify JWT, auth cookie options
    password.js          # bcrypt hashing + password-rule validation
    serialize.js         # publicUser / serializeIdea / serializeComment, CATEGORIES
    http.js              # ApiError + asyncHandler
  middleware/
    auth.js              # getCurrentUser, requireAuth, attachUser
    error.js             # notFound + central error handler
  controllers/           # auth, ideas, comments, users — request/response logic
  routes/                # auth.routes, ideas.routes, index (mounts everything under /api)
  seed.js                # demo data seeder
```

### Auth model

A JWT is signed on login/register/Google-callback (`sub` = user id, HS256). It is set as an httpOnly cookie named `token` **and** returned in the JSON body. Incoming requests are authenticated from **either** the cookie **or** an `Authorization: Bearer <token>` header (`middleware/auth.js`). CORS runs with `credentials: true` and an allow-list of origins so the deployed frontend can send the cookie cross-origin. Authorization is ownership-based: idea edit/delete and comment edit/delete compare the resource's stored owner id against `req.user.id` and return `403` on mismatch.

### Data model (MongoDB)

- **users** — `name, email` (lowercase, unique index), `photoURL, passwordHash?, provider ('credentials'|'google'), bookmarks[], createdAt, updatedAt`.
- **ideas** — the idea form fields (`title, shortDescription, detailedDescription, category, tags[], imageURL, estimatedBudget, targetAudience, problemStatement, proposedSolution`) plus denormalized author (`authorId` = user id **string**, `authorName, authorPhoto`) and counters (`likes, commentCount`).
- **comments** — `ideaId` (**ObjectId**), `ideaTitle, userId` (**string**), `userName, userPhoto, text, createdAt, updatedAt`.

> Note the type asymmetry: `authorId`/`userId` are stored as **strings**, `ideaId` as an **ObjectId**.

## API reference

Base URL: `/api`. All responses are JSON. Errors return `{ "error": "message" }` with the appropriate status. 🔒 = requires authentication.

### Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | — | Create account (`name, email, photoURL?, password`); sets cookie, returns `{ user, token }`. |
| `POST` | `/api/auth/login` | — | Email/password login; sets cookie, returns `{ user, token }`. |
| `POST` | `/api/auth/logout` | — | Clears the auth cookie. |
| `GET` | `/api/auth/me` | — | Returns `{ user }` for the current session (or `null`). |
| `GET` | `/api/auth/google` | — | Starts Google OAuth (`?redirect=` to return after login). |
| `GET` | `/api/auth/google/callback` | — | OAuth redirect target; upserts user, sets cookie, redirects to the frontend. |

### Ideas

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/ideas` | — | List ideas. Query: `search, category, sort=trending\|newest, limit, from, to`. |
| `POST` | `/api/ideas` | 🔒 | Create an idea. |
| `GET` | `/api/ideas/:id` | 🔒 | Idea details; also returns `isOwner`. |
| `PATCH` | `/api/ideas/:id` | 🔒 | Update (owner only). |
| `DELETE` | `/api/ideas/:id` | 🔒 | Delete idea + its comments (owner only). |
| `GET` | `/api/my-ideas` | 🔒 | Ideas created by the current user. |

### Comments & interactions

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/ideas/:id/comments` | 🔒 | List comments for an idea. |
| `POST` | `/api/ideas/:id/comments` | 🔒 | Add a comment. |
| `PATCH` | `/api/comments/:id` | 🔒 | Edit own comment. |
| `DELETE` | `/api/comments/:id` | 🔒 | Delete own comment. |
| `GET` | `/api/my-interactions` | 🔒 | Ideas the user has commented on (with counts + last-commented time). |
| `PATCH` | `/api/user` | 🔒 | Update the current user's profile (`name, photoURL`). |

## Deployment

Deploy to Render (or any Node host). Set all required environment variables, point `CLIENT_ORIGIN`/`FRONTEND_URL` at the deployed client, and set `SERVER_URL` to this service's public URL (plus the matching Google OAuth redirect URI: `<SERVER_URL>/api/auth/google/callback`). The app sets `trust proxy` so `secure` cookies work behind the platform's TLS termination.
