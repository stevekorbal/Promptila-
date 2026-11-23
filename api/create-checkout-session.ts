import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
// Preserve the existing payment metadata rules without a Vercel runtime import.
function cleanMetaString(val: any, maxLength = 200): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().slice(0, maxLength);
}

function normalizeService(service: any): 'diy' | 'dfy' | 'monitoring' {
  const s = String(service || '').toLowerCase().trim();
  if (s === 'dfy' || s === 'optimization') return 'dfy';
  if (s === 'monitoring' || s === 'monthly') return 'monitoring';
  return 'diy';
}

function sanitizeAuditId(auditId: any): string {
  if (!auditId) return '';
  const cleaned = String(auditId).trim().toUpperCase();
  return /^AUD-\d{4,}$/.test(cleaned) ? cleaned.slice(0, 200) : '';
}

function extractStripeMetadata(body: any): {
  service: 'diy' | 'dfy' | 'monitoring';
  audit_id: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  business_name: string;
  website: string;
} {
  const emailRaw = body?.customer_email ?? body?.email ?? '';
  const email = String(emailRaw).trim().toLowerCase().slice(0, 200);

  const nameRaw =
    body?.customer_name ??
    `${body?.firstName || ''} ${body?.lastName || ''}`.trim();
  const name = cleanMetaString(nameRaw, 200);
  const customer_phone = cleanMetaString(body?.customer_phone ?? body?.phone ?? '', 50);

  const businessRaw = body?.business_name ?? body?.businessName ?? '';
  const business = cleanMetaString(businessRaw, 200);

  const websiteRaw = body?.website ?? '';
  const website = cleanMetaString(websiteRaw, 200);

  const auditIdRaw = body?.audit_id ?? body?.auditId ?? '';
  const audit_id = sanitizeAuditId(auditIdRaw);

  const service = normalizeService(body?.service);

  return {
    service,
    audit_id,
    customer_email: email,
    customer_name: name,
    customer_phone,
    business_name: business,
    website,
  };
}



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