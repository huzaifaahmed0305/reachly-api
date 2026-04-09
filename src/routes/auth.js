/**
 * FIXED Auth Routes — src/routes/auth.js
 * Replaces your existing auth.js routes file
 */
import { Router } from 'express'
import { body } from 'express-validator'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { register, login, me, resendVerification, forgotPassword } from '../controllers/auth.controller.js'
import { protect } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/register
router.post('/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('role').isIn(['influencer', 'follower']).withMessage('Invalid role'),
  ],
  validate,
  asyncHandler(register)
)

// POST /api/auth/login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  asyncHandler(login)
)

// GET /api/auth/me
router.get('/me', protect, asyncHandler(me))

// POST /api/auth/resend-verification
router.post('/resend-verification',
  [body('email').isEmail().normalizeEmail()],
  validate,
  asyncHandler(resendVerification)
)

// POST /api/auth/forgot-password
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  asyncHandler(forgotPassword)
)

export default router
