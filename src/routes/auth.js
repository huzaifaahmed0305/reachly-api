import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { register, login, me } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').isIn(['influencer', 'follower']).withMessage('Role must be influencer or follower'),
  ],
  validate,
  asyncHandler(register)
);

// POST /api/auth/login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  asyncHandler(login)
);

// GET /api/auth/me
router.get('/me', protect, asyncHandler(me));

export default router;
