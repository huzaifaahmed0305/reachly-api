import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  listInfluencers,
  getInfluencer,
  updateProfile,
  getAvailability,
  setAvailability,
} from '../controllers/influencers.controller.js';

const router = Router();

// Public
router.get('/',                          asyncHandler(listInfluencers));
router.get('/:handle',                   asyncHandler(getInfluencer));
router.get('/:handle/availability',      asyncHandler(getAvailability));

// Influencer only
router.put('/me/profile',
  protect, requireRole('influencer'),
  [
    body('bio').optional().isLength({ max: 500 }),
    body('handle').optional().matches(/^[a-z0-9_]+$/).withMessage('Handle: lowercase letters, numbers, underscores only'),
  ],
  validate,
  asyncHandler(updateProfile)
);

router.put('/me/availability',
  protect, requireRole('influencer'),
  asyncHandler(setAvailability)
);

export default router;
