/**
 * JazzCash & EasyPaisa payment routes
 * Docs: https://developer.jazzcash.com.pk
 */
import { Router } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../utils/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const initJazzCash = (booking, phoneNumber) => {
  const txnDateTime = new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
  const txnRefNo = `RCHLY${booking.id.replace(/-/g,'').slice(0,10).toUpperCase()}`;
  const amount = String(booking.gross_amount_pkr * 100).padStart(12,'0');

  const params = {
    pp_Version: '1.1',
    pp_TxnType: 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID,
    pp_SubMerchantID: '',
    pp_Password: process.env.JAZZCASH_PASSWORD,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: amount,
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: txnDateTime,
    pp_BillReference: `booking-${booking.id}`,
    pp_Description: 'Reachly Session Payment',
    pp_ReturnURL: `${process.env.APP_URL || 'https://reachly.pk'}/payment/callback`,
    pp_SecureHash: '',
    ppmpf_1: booking.id,
    ppmpf_2: phoneNumber,
  };

  const sortedKeys = Object.keys(params).filter(k => k !== 'pp_SecureHash').sort();
  const hashString = process.env.JAZZCASH_INTEGRITY_SALT + '&' +
    sortedKeys.map(k => params[k]).filter(Boolean).join('&');

  params.pp_SecureHash = crypto
    .createHmac('sha256', process.env.JAZZCASH_INTEGRITY_SALT)
    .update(hashString).digest('hex').toUpperCase();

  return { params, txnRefNo };
};

// POST /api/payments/initiate
router.post('/initiate', asyncHandler(async (req, res) => {
  const { booking_id, payment_method, phone_number } = req.body;

  const { data: booking, error } = await supabaseAdmin
    .from('bookings').select('*').eq('id', booking_id).single();

  if (error || !booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'pending') return res.status(400).json({ error: `Booking is ${booking.status}` });

  if (payment_method === 'jazzcash') {
    const { params, txnRefNo } = initJazzCash(booking, phone_number);
    return res.json({
      method: 'jazzcash',
      gateway_url: `${process.env.JAZZCASH_API_URL}/2.0/Purchase/DoMWalletTransaction`,
      params,
    });
  }

  if (payment_method === 'easypaisa') {
    return res.json({
      method: 'easypaisa',
      message: 'Configure with your EasyPaisa merchant credentials',
      amount: booking.gross_amount_pkr,
      phone: phone_number,
    });
  }

  if (payment_method === 'card') {
    return res.json({
      method: 'card',
      message: 'Integrate with HBL PayConnect or Stripe',
      amount: booking.gross_amount_pkr,
    });
  }

  res.status(400).json({ error: 'Invalid payment method' });
}));

// POST /api/payments/callback — JazzCash posts here after payment
router.post('/callback', asyncHandler(async (req, res) => {
  const { pp_ResponseCode, pp_TxnRefNo, ppmpf_1: bookingId, pp_SecureHash } = req.body;

  const params = { ...req.body };
  delete params.pp_SecureHash;
  const sortedKeys = Object.keys(params).sort();
  const hashString = process.env.JAZZCASH_INTEGRITY_SALT + '&' +
    sortedKeys.map(k => params[k]).filter(Boolean).join('&');

  const expectedHash = crypto
    .createHmac('sha256', process.env.JAZZCASH_INTEGRITY_SALT)
    .update(hashString).digest('hex').toUpperCase();

  if (expectedHash !== pp_SecureHash) {
    console.error('[PAYMENT] Hash mismatch — possible fraud');
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  const isSuccess = pp_ResponseCode === '000';

  if (isSuccess) {
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'confirmed', payment_status: 'paid', updated_at: new Date() })
      .eq('id', bookingId);
  }

  res.status(200).json({ status: isSuccess ? 'success' : 'failed' });
}));

// GET /api/payments/:bookingId/status
router.get('/:bookingId/status', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, status, payment_status, payment_method, gross_amount_pkr')
    .eq('id', req.params.bookingId).single();

  if (error || !data) return res.status(404).json({ error: 'Booking not found' });
  res.json({ payment: data });
}));

export default router;
