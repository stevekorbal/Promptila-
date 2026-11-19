# Promptila Instant Checker Phase 1 — Private QA and release gates

Status: **private development only / NOT PUBLICLY AVAILABLE**.
Branch: `feature/instant-checker-phase1-private`. Do not merge to main or set production `INSTANT_CHECKER_ENABLED=true` without explicit launch approval.

## Deterministic scoring and incompleteness
All 25 fixed checks must be **pass** or **fail** to publish a final 0–100 score.
Any **unverified** check makes the overall result **incomplete**, with score and all four estimated engine scores set to null. Individual fully verified categories may still show their evidence.
A 404/410 llms.txt is a confirmed absent file (fail); a network error is unverified; HTML served as llms.txt is a confirmed invalid file (fail).
A likely JS application shell must not score missing headings or unreadable content as absent. Record `js_dependent=true`, mark affected checks unverified, and tell visitors why.
Readiness engine scores are heuristics based on the six website categories, NOT actual recommendations, rankings or live AI calls.

## Data isolation
Only new tables: `instant_scans`, `instant_scan_leads`, and the third necessary table `instant_scan_rate` for atomic, shared abuse throttling.
No changes to `audits`, `reports`, `check_results`, existing AI Mention, Blueprint, Stripe or n8n workflows.
Both new data tables use RLS with no anon/authenticated access. All public read/write happens through gated server APIs. The report API projects an explicit public-only allowlist; leads remain private.
Migration is committed as `docs/instant-checker-phase1.sql`; it has **NOT** been run against the current production Supabase database.

## Private test results — GitHub Actions 2026-11-19
1. Unit tests: scoring total 100, all-pass score, all-fail score, unverified results, unsafe hostname rejection, reserved IPv4 blocks, JS shell behavior, ordinary HTML scoring and public-response privacy.
2. TypeScript (`npm run lint`) and Vite build (`npm run build`) passed.
3. Big Lake Candy: incomplete, JS-dependent, no definitive score.
4. Harris HVAC: incomplete due to inaccessible/uncertain homepage from GitHub-hosted runner; do not infer that the live site is broken.
5. example.com: complete, 45/100 on this test, not an AI recommendation score.
6. Promptila.com: incomplete, JS-dependent, no definitive score.
7. Desktop/mobile screenshots (eight files) captured using the actual React report component with a mocked API response sourced from the recorded scan fixtures. Screenshots are UI verification, not Vercel/Supabase end-to-end evidence.
8. No paid model calls, no n8n, no customer emails, no new production audit rows, no Stripe calls.

## Security design
Safe fetch uses Node HTTP(S) with IPv4 DNS A-record checks and pins the accepted address using a per-request lookup callback. HTTPS certificate validation and original hostname are retained. Each redirect is separately validated. IPv6-only websites remain unverified rather than bypassing protection.
Inputs block private, loopback, link-local, reserved IPv4 ranges, IP literals, local domains, nonstandard ports, query strings and credentials; bodies and redirects are bounded.
**Important:** Connection-level pinning and DNS rebinding/redirect rejection must still be verified on the *actual Vercel runtime* before enabling public URLs. Code review and Github-hosted tests are not sufficient to certify that runtime behavior.

## Configuration for isolated preview (not production)
- `INSTANT_CHECKER_ENABLED=true` ONLY for access-controlled private preview.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` server-only, never client-side.
- `INSTANT_CHECKER_RATE_SALT`: random secret of at least 24 characters.
- `INSTANT_COMPUTE_USD_PER_MS` and `INSTANT_TRANSFER_USD_PER_BYTE`: optional rates from actual Vercel billing; cost remains null until calibrated.
- Apply SQL migration only to an approved isolated development database.
- Configure IP/WAF boundaries for anonymous access and test per-IP rate limits with real Vercel headers.

## Required remaining release QA
- Vercel private preview: verify actual connection pinning, DNS rebinding, blocked private IPs and unsafe redirects.
- Integration test Supabase claim/concurrency, seven-day cache, atomic limits, lead consent and RLS privacy; confirm no exposed service role.
- Verify scans on Big Lake Candy and Harris in Vercel; review incomplete reasons, structure and scoring.
- Test Vercel 25-second target and actual metered cost, including slow/unreachable websites.
- Review screens and obtain explicit **public-launch approval** before enabling the production flag.

No deployment or production database migration was performed during private feature development.
