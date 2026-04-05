/**
 * Google Meet link generator via Google Calendar API
 * Docs: https://developers.google.com/calendar/api
 *
 * Setup:
 * 1. Go to console.cloud.google.com → Enable Google Calendar API
 * 2. Create a Service Account → download JSON key
 * 3. Add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to .env
 */

const generateFallbackLink = () => {
  const id = Math.random().toString(36).slice(2, 11);
  return `https://meet.google.com/${id.slice(0,3)}-${id.slice(3,7)}-${id.slice(7)}`;
};

export const createMeetLink = async ({ title, scheduledAt, durationMinutes }) => {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.log('[Meet] Google not configured — using fallback link');
    return generateFallbackLink();
  }

  try {
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const event = {
      summary: title,
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Karachi' },
      end: { dateTime: end.toISOString(), timeZone: 'Asia/Karachi' },
      conferenceData: {
        createRequest: {
          requestId: `reachly-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      resource: event,
    });

    return response.data.conferenceData?.entryPoints
      ?.find(e => e.entryPointType === 'video')?.uri || generateFallbackLink();

  } catch (err) {
    console.error('[Meet] Failed to create link:', err.message);
    return generateFallbackLink();
  }
};
