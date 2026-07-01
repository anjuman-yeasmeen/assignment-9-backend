import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import * as auth from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', asyncHandler(auth.register));
router.post('/login', asyncHandler(auth.login));
router.post('/logout', asyncHandler(auth.logout));
router.get('/me', asyncHandler(auth.me));
router.get('/google', asyncHandler(auth.googleStart));
router.get('/google/callback', asyncHandler(auth.googleCallback));

export default router;
