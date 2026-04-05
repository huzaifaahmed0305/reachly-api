/**
 * WhatsApp notification service via Twilio
 * Docs: https://www.twilio.com/docs/whatsapp
 *
 * Setup:
 * 1. Create a Twilio account at twilio.com
 * 2. Enable WhatsApp sandbox (free testing) or apply for Business API
 * 3. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM to .env
 */

const formatPKPhone = (phone) => {
  if (phone.startsWith('0')) return `+92${phone.slice(1)}`;
  if (phone.startsWith('92')) return `+${phone}`;
  return phone;
};

const getClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID) return null;
  const { default: twilio } = await import('twilio');
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

export const sendBookingConfirmation = async ({
  clientPhone, clientName, influencerName,
  sessionTitle, date, time, meetLink, amount,
}) => {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log('[WhatsApp] Twilio not configured — skipping');
    return;
  }

  const client = await getClient();
  const msg = `✅ *Booking Confirmed — Reachly*

Hi ${clientName}! Your session is booked 🎉

📅 *${date}* at *${time}*
🎯 *${sessionTitle}* with ${influencerName}
💰 Rs ${amount.toLocaleString()} paid
🔗 Join: ${meetLink}

${influencerName} will message you before the session. See you!

_Reachly — Book your favourite creators_`;

  await client.messages.create({
    body: msg,
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${formatPKPhone(clientPhone)}`,
  });

  console.log(`[WhatsApp] Confirmation sent → ${clientPhone}`);
};

export const sendSessionReminder = async ({
  clientPhone, clientName, influencerName, date, time, meetLink,
}) => {
  if (!process.env.TWILIO_ACCOUNT_SID) return;

  const client = await getClient();
  await client.messages.create({
    body: `⏰ *Session Tomorrow — Reachly*\n\nHi ${clientName}, your session with *${influencerName}* is tomorrow.\n📅 ${date} at ${time}\n🔗 ${meetLink}\n\nBe ready 5 mins early!`,
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${formatPKPhone(clientPhone)}`,
  });
};

export const sendCancellationNotice = async ({
  clientPhone, clientName, influencerName, sessionTitle, date, reason,
}) => {
  if (!process.env.TWILIO_ACCOUNT_SID) return;

  const client = await getClient();
  await client.messages.create({
    body: `❌ *Session Cancelled — Reachly*\n\nHi ${clientName}, your session on *${date}* with ${influencerName} (${sessionTitle}) has been cancelled.\n${reason ? `Reason: ${reason}\n\n` : ''}Refund processed within 2-3 business days.\n\nBook another at reachly.pk`,
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${formatPKPhone(clientPhone)}`,
  });
};
