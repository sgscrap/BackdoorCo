# Contributing to Backdoor

> Thanks for helping improve Backdoor — a New York-based premium marketplace for **authenticated sneakers & streetwear**. This guide covers everything you need for your first PR.

This project is a **static-site + serverless** codebase: HTML at the root, no build step, Firebase + Stripe + PayPal + Netlify Functions. Please read [`README.md`](README.md) first for the high-level architecture, then come back here for day-to-day contributions.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Git workflow](#git-workflow)
  - [Branches](#branches)
  - [Commit messages](#commit-messages)
- [Local Dev Setup](#local-dev-setup)
  - [Quick checklist](#quick-checklist)
  - [Useful commands](#useful-commands)
- [Required secrets (`.env.local` / Netlify)](#required-secrets-envlocal--netlify)
- [Working with serverless functions](#working-with-serverless-functions)
- [What-do-I-edit?](#what-do-i-edit)
- [PR & merge checklist](#pr--merge-checklist)
- [Owner / admin notes](#owner--admin-notes)

---

## Code of Conduct

Be respectful, be specific, and assume good intent. Sneaker culture can get loud — keep PRs and reviews about the code, not the vibes.

---

## Prerequisites

- **Node.js 18+** (Netlify Functions runtime; matches `engines` implied by `netlify/functions/*.js`).
- **npm** (project currently ships `package-lock.json`).
- **Netlify CLI** (`npm i -g netlify-cli`) — required only if you'll touch serverless functions.
- **Git** with a working GitHub account that has write access to `sgscrap/BackdoorCo`.
- *(Optional)* A Firebase project secondary environment if you want to test admin writes without hitting `coalition-aec44`.

> The project has **no test runner, no linter, no transpiler, no bundler**. It's intentionally vanilla. Don't introduce one in a PR without a discussion first.

---

## Git workflow

### Branches

| Branch                                        | Purpose                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `main`                                        | Production. Netlify auto-deploys from this branch. Not for direct edits. |
| `feat/<short-slug>`                           | New features, new admin pages, new serverless functions.                |
| `fix/<short-slug>`                            | Bug fixes.                                                               |
| `chore/<short-slug>`                          | Refactors, dependency bumps, copy/data hygiene patches.                 |
| `docs/<short-slug>`                           | README / CONTRIBUTING / marketing-copy changes only.                    |
| `seed/<brand>-<model>`                        | One-off product seeding via `admin/seed-*.html` (matches the existing pattern). |

Examples we've used recently in this repo:

- `feat/restock-desk`
- `feat/social-desk`
- `fix/violet-prada-brand-correct`

### Commit messages

Match the existing repo style: **single line, capitalized imperative mood**, no conventional-commits tag prefix.

```
Add admin product reorder links
Improve new drops sorting accuracy
Add LOEWE navy logo tee variant
```

Try to keep the first line ≤ 72 characters. Bundle related changes into one commit; don't co-mingle "feat" + "fix" + "chore".

---

## Local Dev Setup

### Quick checklist

```bash
# 1. Clone
git clone https://github.com/sgscrap/BackdoorCo.git
cd BackdoorCo

# 2. Install (only needed if you'll touch netlify/functions or server.js)
npm install

# 3. Create your local env file — copy the block below into .env.local (gitignored)
cp .env.local.example .env.local   # if missing, create from the table further down

# 4. Pick your workflow
npx serve .                       # static-only: open HTML files in a browser
npx netlify dev                   # full: hits /.netlify/functions locally
node server.js                    # optional Express helper (port 5001) for sample product uploads

# 5. Log in to the admin
#    In your browser, navigate to /admin/ (or /admin/index.html) and sign in.
#    The Firestore admin claim is `request.auth.token.admin == true` (see firestore.rules).
#    Ask the repo owner to grant the claim on your Firebase Auth user before you can write.
```

Notes:
- `npx serve .` is enough to test storefront UI changes; the `auth.js` script only requires the published Firebase API key (below), not the admin SDK.
- `npx netlify dev` runs the functions runtime on the same port, so checkout, offer submission, and price-monitor endpoints all become live at `/.netlify/functions/*`.
- `node server.js` is the Express autodeploy helper. Don't use it from a public network — it has no auth on `/api/products`.

### Useful commands

```bash
# Static-only preview
npx serve .

# Full local (functions + static)
npx netlify dev

# Tail function logs (after `netlify dev`)
netlify functions:log

# Quick HTTP smoke checks against a running netlify dev
curl -X POST http://localhost:8888/.netlify/functions/price-monitor-ebay -G --data-urlencode "q=Jordan 1 Chicago"
curl -X POST http://localhost:8888/.netlify/functions/create-offer -H 'Content-Type: application/json' -d '{}'

# Sanity scripts (each has its own runner; see file top)
node check-homepage.js
node check-shop-page.js
node check-prada.js
node test-browser.js
```

> The helper scripts at the repo root (`check-*.js`, `test-browser.js`, `update_nav.py`, `convert_utf8.py`, etc.) are intentionally excluded by `netlify.toml`'s `ignore` list, so they don't trigger re-deploys. You can keep them locally.

---

## Required secrets (`.env.local` / Netlify)

These are read by `netlify/functions/_shared/stripe-checkout.js`, `_shared/paypal-checkout.js`, `create-offer.js` (server SDK), and `server.js`. The repo intentionally does **not** commit them. Add them to `.env.local` for `npx netlify dev` and to the Netlify UI for production.

### Copy-paste starter — paste into `.env.local`

```ini
# ─── Stripe ─────────────────────────────────────────────────────────────
# Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=<your_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_secret>

# ─── PayPal ────────────────────────────────────────────────────────────
# Get from https://developer.paypal.com/dashboard/applications
PAYPAL_CLIENT_ID=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ
PAYPAL_CLIENT_SECRET=ExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ
PAYPAL_ENVIRONMENT=sandbox             # use "live" only on the production deploy
PAYPAL_BRAND_NAME=backdoorco.xyz
PAYPAL_SOFT_DESCRIPTOR=BACKDOORCO      # ≤ 22 chars; alphanumeric + spaces + .-

# ─── Firebase Admin SDK ─────────────────────────────────────────────────
# Used by paypal-checkout.js. Get from Firebase Console → Project Settings
# → Service Accounts → Generate new private key.
FIREBASE_PROJECT_ID=coalition-aec44
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@coalition-aec44.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="<PRIVATE_KEY_CONTENT>\n..."  # Replace with the value from your downloaded service account JSON
# ⚠️ Wrap FIREBASE_PRIVATE_KEY in double quotes and keep \n escapes literal
#    so Netlify/GitHub Actions don't mangle newlines.

# ─── Optional overrides ────────────────────────────────────────────────
# Functions derive scheme + host from the request automatically. Only set
# these if you reverse-proxy or run on a custom domain locally.
# COOKIE_DOMAIN=
# SITE_ORIGIN=http://localhost:8888
```

### What each secret touches

| Secret                     | Used by                                                                      |
| -------------------------- | ---------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`        | `netlify/functions/create-checkout-session.js`, `_shared/stripe-checkout.js`  |
| `STRIPE_WEBHOOK_SECRET`    | `netlify/functions/stripe-webhook.js` (signature verification)                |
| `PAYPAL_CLIENT_ID`         | `_shared/paypal-checkout.js`                                                 |
| `PAYPAL_CLIENT_SECRET`     | `_shared/paypal-checkout.js`                                                 |
| `PAYPAL_ENVIRONMENT`       | `_shared/paypal-checkout.js` (`sandbox` → api-m.sandbox.paypal.com)            |
| `PAYPAL_BRAND_NAME`        | `_shared/paypal-checkout.js` (PayPal hosted-page logo)                       |
| `PAYPAL_SOFT_DESCRIPTOR`   | `_shared/paypal-checkout.js` (statement descriptor)                          |
| `FIREBASE_PROJECT_ID`      | Both `_shared/*.js` + `admin/firebase-config.js`                              |
| `FIREBASE_CLIENT_EMAIL`    | `firebase-admin` init in `_shared/paypal-checkout.js`                        |
| `FIREBASE_PRIVATE_KEY`     | `firebase-admin` init in `_shared/paypal-checkout.js`                        |

> **Stripe & PayPal go to different projects.** Both _must_ be added; the checkout page (`checkout.html`) lets the buyer pick. If only one provider is configured, the corresponding tab still renders but `placeOrder()` will throw on submit.

### Optional: shared `.env.local.example`

If you'd like to help the next contributor, add an `.env.local.example` to the repo with the keys (no values) — but **don't** check it into `.gitignore`'s protected list of secrets.

---

## Working with serverless functions

| When you change                      | Test with                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `netlify/functions/_shared/*.js`     | All four checkout flows + offer pipeline (see "PR checklist" below)             |
| `netlify/functions/create-offer.js`  | `curl -X POST ... create-offer` with a fake offer (`{ askingPrice, offerAmount, ... }`) → expect 400/422/200 |
| `netlify/functions/stripe-webhook.js`| Use `stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook` from the Stripe CLI |
| `netlify/functions/price-monitor-*.js` | The shared "Smart Pricing Engine" admin page (`pricing.html`) and direct `curl` GETs |

If a function depends on a new env var, **add it to this CONTRIBUTING.md's env-var block** and call it out in the PR description.

---

## What-do-I-edit?

Quick-reference for "where do I touch X?":

| Want to change                                    | Open this                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Homepage hero / Most Wanted grid                  | `index.html` (inlined brand cards) + `app.js` (`renderMostWanted`)                                         |
| Catalog filters / sort                             | `shop-all.html` (sidebar + tabs) + `shop-all.js` (filters / sort / grid)                                    |
| Product detail (gallery, offer modal, reviews)     | `product.html` + `product-page.js`                                                                          |
| Checkout flow & promo codes                        | `checkout.html` + `checkout.js` (constants `FREE_SHIP_THRESHOLD`, `SHIPPING_OPTIONS`, `PROMO_CODES`)       |
| Account / wishlist                                 | `accounts.html` + `accounts.js`                                                                            |
| Stripe payment behaviour                            | `netlify/functions/_shared/stripe-checkout.js`                                                              |
| PayPal payment behaviour                            | `netlify/functions/_shared/paypal-checkout.js` + `create-paypal-order.js` + `capture-paypal-order.js`      |
| Offer lead scoring                                 | `netlify/functions/create-offer.js` (`MIN_STANDARD_RATIO`, `MIN_HIGH_VALUE_RATIO`, `MIN_OFFER_AMOUNT`)      |
| Add a brand to the dropdown                         | Edit **every** HTML page's navbar + brand dropdown (search for `Burberry` / `Moncler` / `Fendi` pattern)    |
| Admin product CRUD                                  | `admin/products.html` + `admin/products.js`                                                                |
| Add a new admin page                                | Drop the HTML+JS pair in `admin/`, mirror the sidebar nav (`<p class="nav-label">TOOLS</p>`) in **every** existing admin nav, add an entry |
| Firestore security rules                            | `firestore.rules`                                                                                          |
| Seeded product catalog                              | `product-data.js` (`SEEDED_PRODUCTS`)                                                                      |
| Netlify deploy config                               | `netlify.toml`                                                                                             |

---

## PR & merge checklist

Before opening a PR, please walk through this:

- [ ] I branched off `main` and used one of `feat/`, `fix/`, `chore/`, `docs/`, or `seed/` prefixes.
- [ ] My commit messages follow the existing style (single line, capitalized imperative).
- [ ] I didn't change any secrets or `.env` files.
- [ ] I didn't introduce a build step, linter, or test runner without a discussion.
- [ ] I didn't push changes to `admin/restock-private.local.json` (it is `.gitignore`'d for a reason).
- [ ] If I touched a function, I added the env var(s) used to this CONTRIBUTING.md and to the Netlify UI.
- [ ] If I touched any *.html navbar (brand dropdown, "TOOLS" group, "MAIN" group), I updated **every** HTML file that includes that block.
- [ ] If I touched the Firestore security model, I confirmed `/admin/*.html` still loads for an admin user and still bounces for an anonymous user.
- [ ] I ran `npx netlify dev` and clicked through: home → shop-all → product → cart → checkout (Stripe test card + PayPal sandbox).
- [ ] I ran at least one of `check-homepage.js`, `check-shop-page.js`, `check-prada.js`, `test-browser.js` against the affected page.

> After squash-merge, the GitHub Actions CodeQL workflow (`.github/workflows/codeql.yml`) re-runs against `main`. CI failures block auto-deploy, so keep secrets and CodeQL alerts clean.

---

## Owner / admin notes

These are not for first-time contributors — they're documented so the next owner doesn't have to re-derive them.

- **Admin claim**: write access to `products`, `orders`, `offers`, and `customers` collections in Firestore is gated by `request.auth.token.admin == true`. Grant the custom claim via Firebase Admin (`firebase-admin`) or the Firebase Console → Authentication → Users → ⋮ → Edit custom claims.
- **Netlify publishes from `main`** per `netlify.toml`. Its `[build] ignore` directive is a **no-redeploy-if-unchanged** check, **not a publish-exclude**: because `publish = "."` every committed file **is** still deployed. The ignore list just lets the CLI skip a no-op rebuild when the only diffs are in `deploy.ps1`, `check-*.js`, `test-browser.js`, `server.js`, or similar. Treat local tweaks to those paths with care — they will still ship if their changes reach `main`.
- **Restock Desk** (`admin/restock.html`) and **Social Desk** (`admin/social.html`) are intentionally `<meta name="robots" content="noindex, nofollow, noarchive">` and fully local — they write to `admin/restock-private.local.json`, which is already in `.gitignore`.
- **`product-data.js`** applies runtime overrides (auto-correct brand for "prada" id/name; lock Prada sneakers to $547 + 1-stock-per-size + allowBackorder; nudge normal footwear to `allowBackorder: true`). If your new product needs a different rule, prefer extending `applyProductOverrides` rather than mutating Firestore or CSS.
- **Stripe & PayPal checkout share cart shape + shipping options** in their `_shared/*.js` modules. Any change should be made in lockstep in both files.
- **Firestore functions** (`fire/firestore.*` queries) are memoised inside the module that uses them; if you add a new collection, audit the rules in `firestore.rules` first.

---

Questions? Open an issue or ping the repo owner via GitHub. Welcome to the back. 🔒
