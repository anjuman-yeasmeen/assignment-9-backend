import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import * as ideas from '../controllers/ideas.controller.js';
import * as comments from '../controllers/comments.controller.js';

const router = Router();

// Listing is public; everything else requires a session.
router.get('/', asyncHandler(ideas.listIdeas));
router.post('/', requireAuth, asyncHandler(ideas.createIdea));

router.get('/:id', requireAuth, asyncHandler(ideas.getIdea));
router.patch('/:id', requireAuth, asyncHandler(ideas.updateIdea));
router.delete('/:id', requireAuth, asyncHandler(ideas.deleteIdea));

// Comments nested under an idea.
router.get('/:id/comments', requireAuth, asyncHandler(comments.listComments));
router.post('/:id/comments', requireAuth, asyncHandler(comments.addComment));

export default router;
