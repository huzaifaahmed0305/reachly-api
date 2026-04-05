import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getInfluencerDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

// GET /api/dashboard — influencer only
router.get('/',
  protect,
  requireRole('influencer'),
  asyncHandler(getInfluencerDashboard)
);

export default router;
