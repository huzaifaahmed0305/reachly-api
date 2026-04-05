import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getSessionTypes,
  createSessionType,
  updateSessionType,
  deleteSessionType,
} from '../controllers/sessions.controller.js';

const router = Router();

// Public — anyone can view an influencer's session types
router.get('/influencer/:influencerId', asyncHandler(getSessionTypes));

// Influencer only — manage their own session types
router.post('/',
  protect, requireRole('influencer'),
  [
    body('title').trim().notEmpty(),
    body('duration_minutes').isInt({ min: 5, max: 180 }),
    body('price_pkr').isInt({ min: 0 }),
    body('description').optional().isLength({ max: 300 }),
  ],
  validate,
  asyncHandler(createSessionType)
);

router.put('/:id',
  protect, requireRole('influencer'),
  asyncHandler(updateSessionType)
);

router.delete('/:id',
  protect, requireRole('influencer'),
  asyncHandler(deleteSessionType)
);

export default router;
