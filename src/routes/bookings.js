import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  confirmBooking,
  cancelBooking,
} from '../controllers/bookings.controller.js';

const router = Router();

// All booking routes require login
router.use(protect);

// Follower creates a booking
router.post('/',
  requireRole('follower'),
  [
    body('session_type_id').isUUID(),
    body('influencer_id').isUUID(),
    body('scheduled_at').isISO8601().withMessage('scheduled_at must be an ISO8601 datetime'),
    body('payment_method').isIn(['jazzcash', 'easypaisa', 'card']),
    body('note').optional().isLength({ max: 500 }),
  ],
  validate,
  asyncHandler(createBooking)
);

// Get all bookings for logged-in user (influencer sees received, follower sees their own)
router.get('/', asyncHandler(getMyBookings));

// Single booking
router.get('/:id', asyncHandler(getBookingById));

// Influencer confirms a pending booking
router.patch('/:id/confirm',
  requireRole('influencer'),
  asyncHandler(confirmBooking)
);

// Either party can cancel
router.patch('/:id/cancel', asyncHandler(cancelBooking));

export default router;
