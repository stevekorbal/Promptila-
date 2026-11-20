# Promptila Phase 1 — Provisional Scoring, Saved-Evidence Review, and Private Preview Gate
Date: 2026-11-20. Branch: feature/instant-checker-phase1-private. No production release.

## Provisional range (approved)
The six categories and 25 scoring checks are unchanged. When any check is unverified, the final score remains null, the four definitive engine estimates remain null, and the displayed range is:
- Minimum = sum of points from confirmed PASS checks.
- Maximum = minimum + sum of points assigned to UNVERIFIED checks (capped at 100).
- Confirmed FAIL adds zero to both. Unverified is never treated as FAIL or PASS.
- Label: "Provisional range — not a final score." Preserve the full pass/fail/unverified checklist.

## Manual audit of saved November 19 high-score check evidence
Saved evidence file: `Promptila-Phase1-23-Site-Final-QA.zip`, obtained from GitHub private QA artifact. This is not a fresh browser rendering or independent verification of live underlying JSON-LD.

- **HubSpot (100/100)**: 4 parsed typed schema nodes; organization identity/name/url; descriptive title and meta description; 1 H1; 12,133 captured text characters; readable About page; llms.txt; HTTPS, canonical and noindex checks all passed. Scores are mechanically supported by saved check outputs, but JSON-LD type/property accuracy was not independently validated against the original document. Brand consistency is currently judged by text reuse, not genuinely independent third-party validation. 100/100 should be interpreted strictly as 100% on Promptila's own checks.
- **Mr. HVAC GR (96/100)**: 2 typed JSON-LD nodes, brand name/URL, 1 H1, 1,656 captured text characters, informative description; About link not verified and was marked FAIL (-4). Four live probes were marked "challenge" even though they had HTTP 200 and a large page body. The bot-challenge heuristic searches the entire page for common challenge-related words; this is **potentially a false positive**. Probe classification does not award crawler-access points, but must be corrected before launch.
- **Associated Plumbing (94/100)**: saved evidence shows 101 typed JSON-LD items, one H1, 11,627 captured text characters, readable About page and llms.txt; heading hierarchy failed (-3), brand consistency failed (-3). The 101 count is a parser traversal/limiting issue requiring further validation; a large schema-node count alone does not prove that all JSON-LD is useful, coherent or relevant. Business identity pair passes but needs checking against source data to establish entity correctness.
- **Harris HVAC (86/100)**: 2 typed JSON-LD nodes, clear HVAC title/description, 2 H1s, 2,214 visible-text characters; About page absent from extracted links, heading structure failed (-3), canonical hostname does not match input host (-2), 2 H1s failed (-5), About absent failed (-4). Four HTTP 200 probes were marked challenges by the broad heuristic. **The site is Harris HVAC, Temple, TX (harrishvac.net); do not confuse it with a Michigan company.** Canonical www/non-www variation warrants review, and missing About link may be a scanner false negative.

### Accuracy concerns requiring targeted QA before release
1. Bot challenges: the existing probe heuristic matches generic terms anywhere in a page. It may falsely report a challenge on normal pages. Review response title, dominant visible text, forms, and known interstitial indicators; retain UNVERIFIED if ambiguous.
2. Structured data: validate exact node type/name/url coherently and the URL's relationship to the analyzed website. Current checks can pass without full semantic validation.
3. Canonical: allow a verified same-site www/non-www normalization when appropriate, while retaining URL safety.
4. About link: do not equate missing extracted link with a proven missing About page if link discovery is incomplete.
5. Full high-score certification would need direct source evidence, not just saved per-check summaries.

Do not change approved scoring point weights or check rules without Steve's review.

## Big Lake Candy cause
The homepage returned HTTP 200, but the initial document was only ~1,754 bytes and contained virtually no readable body text. Its title and meta description were verifiable. robots.txt and llms.txt returned 404. Ten checks remained unverified: B1-B4, C3-C5, D3-D4, F3. This is mainly missing **rendered or externally embedded** source evidence, not an oversized-page/HTTP problem. No browser-rendering service or paid AI is authorized.
The exact Arobis Big Lake Candy report remains inaccessible via the available reader; do not claim direct parity or the numerical Arobis score.

## Vercel/Supabase staging — not provisioned
- Vercel's deployment-protection docs describe account-authenticated preview protection on Hobby plans; account/project plan and current protection settings need checking.
- Supabase docs describe up to two Free projects in a Free organization, but do not prove that the connected Promptila organization has a free slot or a $0 quote.
- No Vercel connector is currently installed; no private preview link or actual Vercel runtime security results exist.
- Creating a billable project or making changes to existing Promptila Supabase requires further user approval. No cost quote or creation was initiated.
- Isolated database integration, seven-day cache and concurrency, rate limits, lead capture, report privacy and badge, DNS/SSRF/redirect validation, performance and cost are all pending in actual Vercel runtime.

## Privacy and public launch
Public launch remains HOLD. No production merge, payment or existing audit workflow changes. No paid AI calls, no customer emails.
