import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from './auth.routes.js';
import ideasRoutes from './ideas.routes.js';
import * as comments from '../controllers/comments.controller.js';
import * as ideas from '../controllers/ideas.controller.js';
import * as users from '../controllers/users.controller.js';

// Mirrors the route shape of the original Next.js `app/api/*` handlers so the
// frontend can point at this server by changing only its base URL.
const router = Router();

router.use('/auth', authRoutes);
router.use('/ideas', ideasRoutes);

// Standalone comment mutations (not nested under an idea).
router.patch('/comments/:id', requireAuth, asyncHandler(comments.updateComment));
router.delete('/comments/:id', requireAuth, asyncHandler(comments.deleteComment));

// User-scoped collections.
router.get('/my-ideas', requireAuth, asyncHandler(ideas.listMyIdeas));
router.get('/my-interactions', requireAuth, asyncHandler(users.myInteractions));
router.patch('/user', requireAuth, asyncHandler(users.updateProfile));

export default router;
