# Blueprint pay-first checkout — implementation gate

Status: **NOT DEPLOYED**. This branch must not merge until payment, audit matching, account claiming, and dashboard access are implemented and tested together.

## Verified current blockers
- `pages/Checkout.tsx` only creates a PaymentIntent with a logged-in Supabase user; it inserts orders client-side after payment, using fields that do not match the current `orders` table.
- `api/create-payment-intent.ts` requires a bearer token and calls `claim_own_audit_for_checkout` before payment.
- Pricing-link audit lookup (`api/checkout-audits.ts`) requires an authenticated account.
- Active n8n Blueprint workflow listens to `payment_intent.succeeded`, builds from audit metadata and emails the Blueprint immediately.
- The dashboard does not currently provide a verified paid-Blueprint claim/view flow.
- `blueprint_orders` has an admin-only SELECT policy; account access needs a narrowly scoped, verified ownership mechanism.

## Required architecture
1. **Email ownership verification before exposing audits**: pricing visitors enter email, receive a short-lived single-use verification link/code, and only then see eligible audit candidates. Email possession must be verified independently of an account; avoid account signup before purchase.
2. **Audit-linked checkout**: signed audit selection token issued server-side after verified email + eligible audit lookup. Audit-email link also requires email ownership verification before payment, unless an equivalent trusted signed token already exists. Multiple audits require explicit selection. No eligible audit → free-audit CTA. Never use an arbitrary URL audit ID alone as authorization.
3. **Stripe payment**: server validates token, email, audit status and price ($299); create a Stripe PaymentIntent with immutable audit association and server-held ownership proof. No customer account required. Avoid mutating another customer's PaymentIntent.
4. **Webhook**: verify Stripe signature and amount/currency/service; idempotently store paid order by unique PaymentIntent ID. Do not trust a browser success screen to create an order. Existing n8n trigger must not be allowed to deliver before order verification.
5. **Account setup**: after verified payment, send a short-lived, one-time setup invitation to the payment email. On successful email verification/authentication, atomically associate the paid order, audit and Blueprint with the account; support existing accounts and abandoned signup. Never use an emailed raw audit ID as a claim credential.
6. **Dashboard**: display paid Blueprint status (building/ready/held), and the saved Blueprint when ready, behind RLS or a server authorization check. Preserve current failure/hold → Steve review.
7. **Delivery decision**: current n8n workflow emails the complete Blueprint; confirm whether to retain delivery email alongside dashboard access or replace it with a ready notification. Do not silently remove customer delivery.
8. **Safe rollout**: use Stripe test mode; verify no-match, single-match, multiple-match, tampered audit ID, unverified email, payment failure, successful payment, duplicate webhook, lost account-setup email, existing account, dashboard isolation, and n8n held orders. Require explicit release approval.

## Never change without approval
- 23-check free audit scoring, 16 AI mention answers, wording or free audit workflow
- $299 DIY / $999 DFY prices
- Existing paid Blueprint customer records or production payment handling while incomplete
