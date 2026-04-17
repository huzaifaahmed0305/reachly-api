/**
 * Availability Routes — src/routes/availability.js
 * Add to index.js:
 *   import availabilityRoutes from './routes/availability.js'
 *   app.use('/api/availability', availabilityRoutes)
 */
import { Router } from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import {
  getAvailability,
  setWeeklySchedule,
  getBookableSlots,
  blockDate,
  unblockDate,
} from '../controllers/availability.controller.js'

const router = Router()

// Public — followers see available slots for a creator
router.get('/:influencerId/slots', asyncHandler(getBookableSlots))

// Influencer only — manage their schedule
router.get('/me', protect, requireRole('influencer'), asyncHandler(getAvailability))
router.post('/me/schedule', protect, requireRole('influencer'), asyncHandler(setWeeklySchedule))
router.post('/me/block', protect, requireRole('influencer'), asyncHandler(blockDate))
router.delete('/me/block/:date', protect, requireRole('influencer'), asyncHandler(unblockDate))

export default router
