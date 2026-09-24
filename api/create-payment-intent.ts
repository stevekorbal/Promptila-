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
    const {
      audit_id,
      email,
      firstName,
      lastName,
      businessName,
      website,
      phone,
    } = req.body;

    if (!audit_id || typeof audit_id !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid audit_id',
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 29700,
      currency: 'usd',

      receipt_email: email || undefined,

      metadata: {
        audit_id,
        service: 'diy',
        business_name: businessName || '',
        website: website || '',
        customer_name: `${firstName || ''} ${lastName || ''}`.trim(),
        phone: phone || '',
      },

      automatic_payment_methods: {
        enabled: true,
      },
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error: any) {
    console.error('Stripe PaymentIntent error:', error);

    return res.status(500).json({
      error: 'Unable to create payment',
      message: error?.message || String(error),
    });
  }
}