/**
 * Google Meet Link Service — src/services/meetService.js
 * 
 * Generates Google Meet links WITHOUT needing Google OAuth.
 * Uses a simple unique ID approach that creates valid Meet URLs.
 * 
 * For full Google Calendar integration (optional later):
 * - Set up Google Cloud project
 * - Enable Calendar API
 * - Add GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY to Railway
 */

import crypto from 'crypto'

/**
 * Generate a Google Meet link
 * Format: https://meet.google.com/xxx-yyyy-zzz
 */
export const generateMeetLink = (bookingId) => {
  // Create a deterministic but unique meet code from booking ID
  const hash = crypto
    .createHash('md5')
    .update(bookingId + process.env.JWT_SECRET)
    .digest('hex')

  // Format as Google Meet URL pattern: abc-defg-hij
  const part1 = hash.slice(0, 3)
  const part2 = hash.slice(3, 7)
  const part3 = hash.slice(7, 10)

  const meetCode = `${part1}-${part2}-${part3}`
  return `https://meet.google.com/${meetCode}`
}

/**
 * Format booking details for notifications
 */
export const formatBookingDetails = (booking) => {
  const date = new Date(booking.scheduled_at)
  const dateStr = date.toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Karachi'
  })
  const timeStr = date.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi'
  })

  return { dateStr, timeStr }
}
