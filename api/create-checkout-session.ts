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
    const metadata = extractStripeMetadata(body);
    const customerEmail = metadata.customer_email;
    const isSubscription = metadata.service === 'monitoring';

    // Configure line items based on service - never take amount from browser
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (metadata.service === 'diy') {
      // Replaced old $297 Price ID price_1UJC8aEiysYUzP6RcCbZ4kYP with inline 29900 cents
      lineItems = [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 29900,
            product_data: {
              name: 'AI Visibility Blueprint (DIY)',
            },
          },
          quantity: 1,
        },
      ];
    } else if (metadata.service === 'dfy') {
      lineItems = [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 99900,
            product_data: {
              name: 'Turnkey DFY AI Visibility Optimization',
            },
          },
          quantity: 1,
        },
      ];
    } else {
      // Monthly Monitoring subscription ($99/mo)
      lineItems = [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 9900,
            recurring: {
              interval: 'month',
            },
            product_data: {
              name: 'Monthly AI Visibility Monitoring',
            },
          },
          quantity: 1,
        },
      ];
    }

    const cancelQuery = new URLSearchParams({ service: metadata.service });
    if (metadata.audit_id) {
      cancelQuery.set('audit_id', metadata.audit_id);
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: lineItems,
      metadata,
      success_url:
        'https://www.promptila.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: `https://www.promptila.com/checkout?${cancelQuery.toString()}`,
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    if (metadata.audit_id) {
      sessionParams.client_reference_id = metadata.audit_id;
    }

    if (isSubscription) {
      // Stripe refuses payment_intent_data for subscriptions
      sessionParams.subscription_data = {
        metadata,
      };
    } else {
      const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
        metadata,
      };
      if (customerEmail) {
        paymentIntentData.receipt_email = customerEmail;
      }
      sessionParams.payment_intent_data = paymentIntentData;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      metadata,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);

    return res.status(500).json({
      error: 'Unable to create checkout session',
      message: error?.message || String(error),
    });
  }
}