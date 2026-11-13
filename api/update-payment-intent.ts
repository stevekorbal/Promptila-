import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Legacy endpoint intentionally disabled.
 *
 * Previously, anyone who knew a PaymentIntent ID could replace its audit_id,
 * customer_email, and other metadata without authentication. This could
 * misdirect paid Blueprint fulfillment.
 *
 * The checkout already uses /api/create-payment-intent with authenticated,
 * server-verified audit ownership for both creation and updates.
 *
 * Do not re-enable this route without enforcing ownership, immutable
 * audit association, and payment state checks.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Allow', 'POST');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    error: 'This payment update endpoint is no longer available.',
  });
}
