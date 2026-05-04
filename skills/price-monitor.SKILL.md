## Skill: Price Monitor & Offer System Fix

### Purpose
Maintain competitive pricing across listed competitor sites on a weekly schedule and ensure our storefront prices are always lower than competitors (within configured margins). Also identify and fix issues in the current offer system (accept/counter/reject flows) to ensure correct business logic and transparency.

### Scope
- Workspace-scoped skill for Backdoor webapp.
- Runs weekly (configurable) and compares live prices for all catalog products against an ordered list of competitor sources.
- Actionable outputs: alerts (Slack/email), recommended price updates, and automatic price adjustments when explicitly enabled.

### High-level workflow
1. Gather products to monitor
   - Source product list from Firestore or `product-data.js` (configurable). Include product identifiers, SKUs, and canonical names.
2. Normalize product identifiers for competitor lookups
   - Apply configurable matching rules (SKU-preferrable; fallback to normalized name). Cache mappings to reduce fuzz matching costs.
3. Fetch competitor prices
   - Use official APIs where available; otherwise use lightweight scraping connectors (respect `robots.txt` and rate limits). Each source configured with headers, selectors, and rate limits.
4. Compare and compute target price
   - Determine competitor minimum price and compute desired price = minCompetitorPrice - delta or minCompetitorPrice * (1 - pctMargin). Delta/pct is a configurable policy per brand or global.
5. Decision & actions
   - If desired price < current price and auto-update enabled → create update job (FireStore write or PR to `product-data.js` depending on publish workflow).
   - Otherwise create recommended-change alert for manual review.
   - Log every decision with trace data for auditability.
6. Offer system integration / fixes
   - Run checks that offers are processed by business rules: minimum price enforcement, expiration logic, counter-offer flow, seller overrides.
   - When issues found, generate reports and, if permitted, auto-apply policy fixes (e.g., reject offers below floor price, set correct offer statuses).
7. Reporting & audit
   - Weekly summary report (CSV/JSON) and alert for products changed or flagged.

### Configurable parameters
- `SCHEDULE`: cron expression (default weekly). 
- `SOURCES`: list of competitor sources each with: `name`, `type` (api|scrape), `endpoint`, `selector` (scrape), `rateLimit`, `auth`.
- `MATCHING_PRIORITY`: [sku, gtin, normalized_name].
- `PRICE_POLICY`: { globalDelta: 1.00, pctUnder: 0.03, brandOverrides: {...} }
- `AUTO_UPDATE_MODE`: `off|recommend|auto` (default: `recommend`).
- `ALERT_CHANNELS`: slackWebhookUrl, adminEmail, pagerDuty, etc.
- `DB_TARGET`: `firestore|product-data-js|admin-api`.

### Acceptance criteria / Quality checks
- Respects robots.txt and configured rate limits for each source.
- No silent price changes when `AUTO_UPDATE_MODE` = `recommend`.
- Every automated change must include: productId, oldPrice, newPrice, reason, sourceSnapshot, timestamp, operator (system or user).
- Offer system rules enforced: offers below floor are automatically rejected; counters follow configured markup rules; expiry enforced.

### Implementation notes
- Prefer using provider APIs (e.g., competitor REST endpoints) where possible to avoid scraping maintenance.
- Implement a small adapter layer for sources so adding/removing sites is config-only.
- Store snapshots in `price_snapshots` Firestore collection for history and rollback.
- Use Netlify functions or a scheduled GitHub Action / Cloud Scheduler to run the weekly job. For a simple PoC, run as a Netlify serverless function triggered by an external scheduler (e.g., GitHub Actions or cron job) that POSTs the function endpoint.
- For temporary local testing, the skill can be executed via a CLI node script that runs one pass.

### Offer system fixes checklist
1. Validate offer acceptance flow: acceptance should reduce inventory and emit a completed-order or pending-payment event.
2. Validate counter-offer flow: counters should update the offer record, notify buyer, and honor expiration.
3. Validate offer expiration handling: expired offers must be flagged and no longer accepted.
4. Add unit tests for each rule and an end-to-end test that simulates make-offer → counter → accept → fulfill.

### Security & legal
- Respect crawl policies of each competitor site; add rate-limiting and request headers to mimic normal client behavior.
- Avoid storing competitor raw HTML beyond what is necessary for debugging.

### Error handling & observability
- All fetches log success/failure counts; failures trigger exponential backoff and alert when persistent.
- Record metrics: fetch latency, success rate per source, number of price changes, number of offers rejected/accepted by policy.

### Outputs
- `price_snapshots/<productId>/<timestamp>` (history)
- `price_actions` collection with proposed/committed changes
- weekly report delivered to configured `ALERT_CHANNELS`

### Example prompts for this skill
- "Run a one-off price check for SKU CD4991-101 and send recommendations to Slack."
- "Run weekly price job now (dry-run) and output top 10 recommended price drops."
- "Scan and fix offer rules for the last 30 days and produce a report."

### Next steps / To implement
1. Confirm competitor sources and credentials (APIs) or list of sites to scrape.
2. Choose `AUTO_UPDATE_MODE` preference (recommend vs auto).
3. Confirm alert channel(s) (Slack webhook or email).
4. Implement adapters, snapshot storage, and scheduled runner.

### Clarifying questions for you
1. Which competitor sites do you want tracked first (list top 5)?
2. Prefer a flat dollar undercut (e.g., $1 lower) or percentage (e.g., 3%)? Any brand-specific exceptions?
3. Should the skill auto-update prices in Firestore or create recommended tasks for manual approval?
4. For offers: do you want automatic policy enforcement, or do you prefer reviewable recommendations?

---
Skill created by automation request. After you confirm answers to clarifying questions I will iterate and produce an implementation plan and initial code scaffold.
