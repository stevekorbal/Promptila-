import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { audit_id } = req.body;

    if (!audit_id || typeof audit_id !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid audit_id',
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',

      line_items: [
        {
          price: 'price_1UJC8aEiysYUzP6RcCbZ4kYP',
          quantity: 1,
        },
      ],

      client_reference_id: audit_id,

      metadata: {
        audit_id: audit_id,
        service: 'diy',
      },

      success_url:
        'https://www.promptila.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',

      cancel_url:
        `https://www.promptila.com/checkout?service=diy&audit_id=${encodeURIComponent(audit_id)}`,
    });

    return res.status(200).json({
      url: session.url,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);

    return res.status(500).json({
      error: 'Unable to create checkout session',
      message: error?.message || String(error),
    });
  }
}