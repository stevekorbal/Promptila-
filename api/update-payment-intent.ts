import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { extractStripeMetadata } from './create-payment-intent.ts';

function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  return new Stripe(secretKey);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({
      error: 'Stripe secret key is not configured',
    });
  }

  try {
    const stripe = getStripeInstance();
    const body = req.body || {};
    const intentIdToUpdate = body.payment_intent_id || body.paymentIntentId;

    if (!intentIdToUpdate || typeof intentIdToUpdate !== 'string') {
      return res.status(400).json({
        error: 'Missing payment_intent_id',
      });
    }

    const metadata = extractStripeMetadata(body);
    const customerEmail = metadata.customer_email;

    const updateParams: Stripe.PaymentIntentUpdateParams = {
      metadata,
    };
    if (customerEmail) {
      updateParams.receipt_email = customerEmail;
    }

    const updatedIntent = await stripe.paymentIntents.update(
      intentIdToUpdate,
      updateParams
    );

    return res.status(200).json({
      clientSecret: updatedIntent.client_secret,
      paymentIntentId: updatedIntent.id,
      metadata: updatedIntent.metadata,
    });
  } catch (error: any) {
    console.error('Stripe PaymentIntent update error:', error);

    return res.status(500).json({
      error: 'Unable to update payment intent',
      message: error?.message || String(error),
    });
  }
}
