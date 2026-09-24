import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed'
    });
  }

  try {
    const webhookUrl =
      process.env.N8N_AUDIT_WEBHOOK_URL ||
      'https://n8n-r7ed.srv1965679.hstgr.cloud/webhook/9ba196f8-c567-4e4a-b424-4ede63310955';

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const responseText = await webhookResponse.text();

    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = {
        message: responseText
      };
    }

    return res.status(webhookResponse.status).json(responseData);

  } catch (error: any) {
    console.error('Webhook forwarding error:', error);

    return res.status(502).json({
      error: 'Failed to connect to webhook destination',
      message: error?.message || String(error),
    });
  }
}