import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

// Read-only test PaymentIntent verification. Never returns buyer details or payment secrets.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ verified: false });
  const key = process.env.STRIPE_SECRET_KEY;
  const pk = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key?.startsWith('sk_test_') || !pk?.startsWith('pk_test_')) {
    return res.status(503).json({ verified: false, reason: 'Stripe test credentials are not configured' });
  }
  const body = req.body ?? {};
  const id = String(body.payment_intent_id ?? '').trim();
  const audit = String(body.audit_id ?? '').trim().toUpperCase();
  const email = String(body.customer_email ?? '').trim().toLowerCase();
  const name = String(body.customer_name ?? '').trim();
  const phone = String(body.customer_phone ?? '').trim();
  if (!/^pi_[A-Za-z0-9_]{8,100}$/.test(id) || !/^AUD-\d{4,}$/.test(audit) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !phone) {
    return res.status(400).json({ verified: false });
  }
  try {
    const stripe = new Stripe(key);
    const intent = await stripe.paymentIntents.retrieve(id);
    const meta = intent.metadata ?? {};
    const verified = intent.id === id && intent.status === 'succeeded' &&
      intent.livemode === false && intent.amount === 29900 &&
      intent.amount_received === 29900 && intent.currency === 'usd' &&
      meta.service === 'diy' && String(meta.audit_id ?? '').toUpperCase() === audit &&
      String(meta.customer_email ?? '').toLowerCase() === email &&
      String(meta.customer_name ?? '').trim() === name &&
      String(meta.customer_phone ?? '').trim() === phone;
    return res.status(verified ? 200 : 403).json({ verified });
  } catch {
    return res.status(403).json({ verified: false });
  }
}
