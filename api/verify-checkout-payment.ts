import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

/** Confirm payment on Stripe before showing account setup. This does not claim orders. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const paymentIntentId = req.body?.payment_intent_id;
  if (typeof paymentIntentId !== 'string' || !/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)) {
    return res.status(400).json({ error: 'Invalid payment reference.' });
  }
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Payment verification unavailable.' });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const payment = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (payment.status !== 'succeeded' || payment.amount !== 29900 ||
      payment.currency !== 'usd' || payment.metadata?.service !== 'diy' ||
      !/^AUD-\d{4,}$/.test(payment.metadata?.audit_id || '')) {
      return res.status(409).json({ error: 'No confirmed DIY Blueprint payment found.' });
    }
    // PaymentIntent IDs are not authentication. Do not return customer PII.
    return res.status(200).json({ paid: true, service: 'diy' });
  } catch (err) {
    console.error('Payment verification error', err);
    return res.status(503).json({ error: 'Unable to verify payment at this time.' });
  }
}
