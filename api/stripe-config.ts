import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  // Do not expose a live Stripe checkout during the prelaunch test period.
  if (!publishableKey?.startsWith('pk_test_') || !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
    return res.status(500).json({
      error: 'Checkout is disabled until both Stripe test keys are configured',
    });
  }

  return res.status(200).json({
    publishableKey,
  });
}