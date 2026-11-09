import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  return new Stripe(secretKey);
}

function cleanMetaString(val: any, maxLength = 200): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().slice(0, maxLength);
}

export function normalizeService(service: any): 'diy' | 'dfy' | 'monitoring' {
  const s = String(service || '').toLowerCase().trim();
  if (s === 'dfy' || s === 'optimization') return 'dfy';
  if (s === 'monitoring' || s === 'monthly') return 'monitoring';
  return 'diy';
}

export function sanitizeAuditId(auditId: any): string {
  if (!auditId) return '';
  const cleaned = String(auditId).trim().toUpperCase();
  return /^AUD-\d{4,}$/.test(cleaned) ? cleaned.slice(0, 200) : '';
}

export function extractStripeMetadata(body: any): {
  service: 'diy' | 'dfy' | 'monitoring';
  audit_id: string;
  customer_email: string;
  customer_name: string;
  business_name: string;
  website: string;
} {
  const emailRaw = body?.customer_email ?? body?.email ?? '';
  const email = String(emailRaw).trim().toLowerCase().slice(0, 200);

  const nameRaw =
    body?.customer_name ??
    `${body?.firstName || ''} ${body?.lastName || ''}`.trim();
  const name = cleanMetaString(nameRaw, 200);

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
    business_name: business,
    website,
  };
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

    // Check if updating an existing PaymentIntent right before confirmation
    const intentIdToUpdate = body.payment_intent_id || body.paymentIntentId;

    if (intentIdToUpdate && typeof intentIdToUpdate === 'string') {
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
    }

    // Otherwise, create a new PaymentIntent
    // Never take amount from the browser. DIY stays 29900, DFY stays 99900.
    const amount = metadata.service === 'dfy' ? 99900 : 29900;

    const createParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: 'usd',
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    if (customerEmail) {
      createParams.receipt_email = customerEmail;
    }

    const paymentIntent = await stripe.paymentIntents.create(createParams);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
    });
  } catch (error: any) {
    console.error('Stripe PaymentIntent error:', error);

    return res.status(500).json({
      error: 'Unable to process payment',
      message: error?.message || String(error),
    });
  }
}