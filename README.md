# Backdoor

> **Backdoor** is a New York-based premium marketplace for **authenticated sneakers and streetwear**. The storefront, admin dashboard, payment flows, market-price monitor, and offer pipeline are all part of a single static-site-plus-serverless codebase hosted on Vercel (static site) with Netlify serverless functions proxied behind it, and backed by Firebase.

This README documents the architecture, file structure, data model, and developer workflows so a new contributor can navigate the project quickly.

- **Live storefront:** `https://backdoorco.xyz` (Vercel; alt alias `https://backdoorco.vercel.app`)
- **Repo:** `github.com/sgscrap/BackdoorCo`
- **Firebase project:** `coalition-aec44`

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Directory Layout](#directory-layout)
- [Customer-Facing Site](#customer-facing-site)
  - [Global Library (loaded on every page)](#global-library-loaded-on-every-page)
  - [Brand & Category Pages](#brand--category-pages)
  - [Product Detail (`product.html`)](#product-detail-producthtml)
  - [Checkout (`checkout.html`)](#checkout-checkouthtml)
  - [Account (`accounts.html`)](#account-accountshtml)
  - [Order Tracking (`tracking.html`)](#order-tracking-trackinghtml)
  - [Informational Pages](#informational-pages)
- [Admin Dashboard](#admin-dashboard)
  - [Admin Auth, Sidebar & Layout](#admin-auth-sidebar--layout)
  - [Pages](#pages)
  - [Local-Only Tools](#local-only-tools)
- [Serverless Functions](#serverless-functions)
- [Data Model (Firestore)](#data-model-firestore)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Skills and Utilities](#skills-and-utilities)

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│  Static site (HTML / CSS / JS)   ←─ publishes from project root
│  index.html, shop-all.html, product.html, admin/*, *.css     │
└───────────────────────────────────────────────────────────────┘
                │ auth · firestore
                ▼
┌───────────────────────────────────────────────────────────────┐
│  Firebase (project: coalition-aec44)                          │
│  - Auth           : email/password (Google + Apple buttons)  │
│  - Firestore      : products / orders / users / reviews /     │
│                     offers / checkout_drafts / customers     │
│  - Storage        : product images                            │
└───────────────────────────────────────────────────────────────┘
                ▲
                │ checkout creation / webhook / capture
                │
┌───────────────────────────────────────────────────────────────┐
│  Netlify Functions (/netlify/functions)                       │
│    - stripe-checkout (create + webhook + capture)             │
│    - paypal-checkout  (create + capture)                      │
│    - create-offer, market-price-snapshot, price-monitor-*    │
└───────────────────────────────────────────────────────────────┘
```

The frontend is **pure static** — all HTML, CSS, and JS files are served as-is. Every page embeds the Firebase compat SDK + global navigation/auth (`auth.js`). Dynamic logic comes from `app.js` (cart/modal), page-specific modules (`product-page.js`, `shop-all.js`, `checkout.js`, `admin/dashboard.js`, etc.), and Netlify Functions called via `fetch`.

---

## Tech Stack

| Layer               | Tech                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Markup / styling    | Plain HTML, vanilla CSS (`styles.css`, `store.css`, `admin.css`, `shop-all.css`, etc.), Google Fonts (Bebas Neue · Space Grotesk · Inter), Font Awesome 6 |
| Client logic        | Vanilla ES6+ modules (no build step). Module imports use both the v10.7.0 Firebase modular SDK and the v9.23.0 compat SDK |
| Auth / DB / storage | Firebase v9 compat SDK (loaded via `<script>` tags in every page) + Firebase v10 modular SDK (in admin modules) |
| Payments            | Stripe Checkout (hosted) + PayPal Checkout (v2 orders API)                                  |
| Serverless          | Netlify Functions (Node 18), shared helpers in `_shared/`                                  |
| Price monitoring    | In-repo scraper functions for eBay & Prada + composite snapshot                             |
| CI                  | GitHub Actions CodeQL (`codeql-analysis.yml`, `codeql.yml`)                                  |
| Deployment          | Vercel (`vercel.json`, project `backdoorco`) for the static site; Netlify (`netlify.toml`) for serverless functions                                       |

There is **no React/Vue/build pipeline** — pages are hand-written HTML and the client-side code is dispatched as native ES modules. See `package.json` for the only production runtime dependency roots (Express + Firebase Admin + Stripe + Multer), all used by `server.js` and the serverless functions.

---

## Directory Layout

```
Backdoor/
├── index.html               # Home: hero, Most Wanted, brands, drop, stats, newsletter
├── shop-all.html            # Full catalog with sidebar filters + grid
├── product.html             # PDP: gallery, sizes, offer modal, price history, reviews
├── checkout.html            # 3-step Stripe / PayPal checkout
├── accounts.html            # Auth modal + customer dashboard (wishlist, loyalty, etc.)
├── tracking.html            # Order lookup + tracking detail + admin order management
├── about.html               # Brand story
├── pricing.html             # Smart Pricing Engine (admin-facing)
├── email.html               # Email automation (admin-facing)
├── faq.html / contact.html  # Support / FAQ
│
├── admin/                   # Admin dashboard
│   ├── index.html / dashboard.html   # Login + overview
│   ├── products.html / products.js   # Inventory CRUD with reorder link/cost
│   ├── orders.html / orders.js       # Order table + status filters
│   ├── customers.html / customers.js # Customer list
│   ├── offers.html / offers.js       # Offer queue with accept/counter/reject
│   ├── reviews.html / reviews.js     # Review moderation
│   ├── analytics.html / analytics.js # Charts (Chart.js) — revenue, categories, top products
│   ├── settings.html / settings.js   # Store config + feature toggles
│   ├── restock.html / restock.js     # Restock Desk (local-only links)
│   ├── social.html / social.js       # Social Desk (canvas-based image + caption studio)
│   ├── cloudify.js / seed-*          # One-off product seeder pages
│   ├── restock.css / social.css / admin.css
│   └── firebase-config.js            # Admin Firebase module bootstrap
│
├── netlify/
│   ├── functions/
│   │   ├── create-checkout-session.js
│   │   ├── capture-paypal-order.js
│   │   ├── create-paypal-order.js
│   │   ├── checkout-session-status.js
│   │   ├── create-offer.js
│   │   ├── stripe-webhook.js
│   │   ├── market-price-snapshot.js
│   │   ├── price-monitor-ebay.js
│   │   ├── price-monitor-prada.js
│   │   └── _shared/
│   │       ├── stripe-checkout.js   # Cart → Draft → Session logic (Firestore side)
│   │       └── paypal-checkout.js   # Cart → Draft → Order logic (Firestore side)
│   └── ...                           # (publishes from project root, not a separate folder)
│
├── products/                # All product images (Filenames are slugified product names on upload via server.js)
│
├── brand-logos/             # Brand wordmarks used in emails and OG cards
│
├── partials/                # Shared storefront chrome + scripts — inlined by scripts/build-chrome.js
│   ├── nav.html             # Navbar + mobile menu (every storefront page)
│   ├── footer-compact.html  # Compact support footer (most pages)
│   ├── footer-full.html     # Rich newsletter footer (index.html, about.html)
│   ├── global-scripts.html  # Firebase SDK/config, auth.js + shared page helpers
│   └── head-css.html        # <link> tags for tokens.css + chrome.css (every page)

├── favicon.svg / favicon.png  # Brand mark
│
├── skills/
│   └── price-monitor.SKILL.md  # Intern doc for the weekly price-monitor skill
│
├── scripts / one-offs:
│   ├── update_nav.py / convert_utf8.py
│
├── server.js                # Optional Express helper for product image upload + auto commit
├── auth.js                  # Global Firebase auth + nav avatar + wishlist toggling
├── app.js                   # Global cart, "Most Wanted" hero renderer, modal manager
├── product-data.js          # Seeded product catalog + helpers (image sizing, overrides)
├── product-page.js          # PDP module (Firebase subscribe, gallery, review, offer submit)
├── shop-all.js              # Catalog page module (filters, sort, grid)
├── checkout.js              # Checkout page module (cart, wizard, Stripe / PayPal bootstrap)
├── accounts.js              # Account page module (auth modal, account dashboard)
├── cart.js                  # Shared cart helpers
├── tracking.js              # Tracking page module (lookup, timeline, filters)
├── analytics.js             # Tiny analytics chart helper + email/save tracker
│
├── chrome.css               # Shared navbar / cart drawer / toast / announce styles
├── tokens.css               # Shared :root design tokens
├── css:  styles.css, store.css, checkout.css, accounts.css,
│        shop-all.css, admin.css, pricing.css, email.css,
│        tracking.css, social.css, restock.css
│
├── .github/workflows/       # codeql.yml + codeql-analysis.yml
├── netlify.toml             # Publish root = ".", functions dir, /__/auth proxy
├── firestore.rules          # Public-read products/reviews, private orders/users
├── package.json / package-lock.json / server.js
└── README.md                # (this file)
```

Static files (HTML/JS/CSS/images) live at the repo root and are published as-is. There is no `dist/` or `build/` directory.

---

## Customer-Facing Site

All customer pages share the same shell, generated from a single source:

- **Top bar**: announcement banner + navbar + mobile menu (hamburger).
- **Footer**: a rich newsletter footer on `index.html` / `about.html`, and a compact support footer on every other page.

Each page's nav, footer, and global scripts are inlined from a partial in [`partials/`](partials/) between `<!-- @@chrome:<name>:start -->` / `<!-- @@chrome:<name>:end -->` marker comments:

| Partial | Region | Used by |
| --- | --- | --- |
| [`partials/nav.html`](partials/nav.html) | `nav` | every storefront page |
| [`partials/footer-compact.html`](partials/footer-compact.html) | `footer` | all pages except `index.html` / `about.html` |
| [`partials/footer-full.html`](partials/footer-full.html) | `footer` | `index.html`, `about.html` |
| [`partials/global-scripts.html`](partials/global-scripts.html) | `scripts` | every page except `404.html`, `checkout.html` |
| [`partials/head-css.html`](partials/head-css.html) | `headcss` | every storefront page (inserted before `store.css`) |

Run **`npm run build:chrome`** after editing a partial to regenerate every page, and **`npm run check:chrome`** (enforced in CI) to fail the build when a page drifts from its partial. Change the nav, footer, shared scripts, or shared CSS links once, in one file.

### Shared CSS (`chrome.css` + `tokens.css`)

Every storefront page links two shared stylesheets (via [`partials/head-css.html`](partials/head-css.html)) before its own:

- **[`tokens.css`](tokens.css)** — the `:root` design tokens (`--bg`, `--accent`, `--text`, …). Previously copy-pasted into six stylesheets.
- **[`chrome.css`](chrome.css)** — the navbar, mobile menu, cart drawer, toast, announcement bar and footer social buttons. These used to be duplicated across `store.css` and the page stylesheets.

The page-specific stylesheets keep only their genuine divergences (e.g. `checkout.css` keeps its 64px navbar, `accounts.css` its bordered icon buttons) as overrides on top of the shared base. Change nav/cart/toast styling once, in `chrome.css`.

### Storefront smoke test

**`npm run test:smoke`** loads every storefront page in a real headless Chrome and fails if any page throws an uncaught JavaScript exception — the fastest way to catch a shared script that breaks on the one page that does not render an element it assumes exists. It adds no dependencies: it drives Chrome over the DevTools protocol and serves the repo from a temporary local server.

It also **exercises the shared chrome on every page** with real mouse input, since that is where the pages diverge:

| Interaction | Driven by | Asserts |
| --- | --- | --- |
| Mobile menu | tapping `#navHamburger` at each phone width (320, 360, 390, 430) | the hamburger is reachable at that width, `#navMobileMenu` gains `.open` and displays, then closes again |
| Brands dropdown | hovering `.nav-dropdown-toggle` at desktop width | `.nav-dropdown-menu` becomes displayed (it is revealed by CSS `:hover`) |
| Cart drawer | clicking `#cartButton`, or checkout's own `.cart-btn` | the drawer slides into view, then closes via its close button |
| Shopping flow | picking a size and clicking `#productAddToCart` on the product page, or calling the page's own `addToCart` on the catalogue pages (their cards link to the product page, so they have no in-page control) | the item appears in the drawer, the drawer opens, a quantity `+` and `−` move the count, line total and stored bag together, and the remove button takes the item back out |

The shopping flow walks the whole errand a shopper walks, because the drawer's markup is inlined on every page while its `+` / `−` / remove handlers are implemented separately in `app.js` (catalogue pages) and `product-page.js` (the product page). Every control is clicked with a real mouse event, and a handler that throws is an uncaught exception that fails the page like any other. Its assertions are deltas against a snapshot taken before the add, and the item under test is marked in the DOM and added under a page-specific id, so an item that a page whose flow failed left behind in the shared `backdoor-cart` storage cannot make the next page look broken.

Each interaction is capability-driven: a page without a navbar, without a cart drawer, or without a product to sell reports that interaction as *n/a* rather than failing. Triggers are only clicked after a hit test proves a real user could reach them, so a hidden or covered control can never produce a false pass. The mobile menu is measured at every phone width rather than one, because the navbar's phone layout is a set of breakpoints — a regression can make the hamburger unreachable at 320px while 430px still looks fine, and a single-width probe would miss it. Findings are graded — a broken interaction fails the run, while a finding that is not this test's business (an unreachable-by-design control) is reported once as a warning and does not fail the build.

It also **asserts the shape of every page** on the settled DOM, using the same `build-chrome` tables that drive **`npm run check:chrome`**, so a page that drifted from its partials or lost an asset fails the run:

| Assertion | Checks |
| --- | --- |
| One navbar and footer | exactly one shared `#navbar` on every page whose table entry says it has one, and never more than one navbar or footer anywhere |
| Chrome markers | every `<!-- @@chrome:<region>:start -->` has a matching `:end`, a page carries exactly the regions its table entry lists, and no `%%nav:…%%` token is left unresolved |
| Stylesheets and images resolve | no same-origin stylesheet or image answers with HTTP ≥ 400, and no same-origin stylesheet loads but defines zero rules |
| No horizontal overflow | at 320 / 390 / 430 / 768 / 1024 / 1440px, nothing visible spills past the viewport and the document never scrolls sideways |

The asset assertion reads real network responses with the cache disabled, so a broken image that `image-fallback.js` silently swaps for a placeholder is still caught, and a cached 200 can never hide a missing file. Third-party requests (Google Fonts, Firebase) are ignored — they are network noise and cannot be asserted offline.

The overflow assertion measures every visible element's box rather than only the document's scroll width, because `body { overflow-x: hidden }` suppresses a sideways scrollbar while still clipping chrome off-screen — the way the phone navbar used to lose its hamburger. Elements placed off-canvas on purpose (the closed cart drawer, a hero's own clipped blobs) are skipped.

The product page is loaded from the catalogue (`product.html?slug=…`, taken from the page's own `product-data.js`) instead of bare, so it renders a real product rather than its *Product unavailable* state — otherwise its add-to-cart button would never exist to be tested.

Set `CHROME_PATH` to point at a specific browser, `SMOKE_BASE_URL` to target an already-running server, `SMOKE_PAGES=index.html,about.html` to smoke a subset, or `SMOKE_VERBOSE=1` to list every interaction, structural check and ignored warning. If no Chrome/Chromium is found it prints a note and exits 0. Unhandled promise rejections and third-party network noise are reported as warnings rather than failures.

> **Fixed:** the mobile menu used to be unreachable on phones. The navbar's desktop layout is roughly 500px wide, but `chrome.css`'s phone compaction was being overridden by later page stylesheets — `accounts.css` re-showed the search box and `email.css`/`tracking.css` restyled `.navbar`/`.nav-logo` at every width — so below about 500px the hamburger sat outside the viewport and `body { overflow-x: hidden }` made it unscrollable. The shared phone layout now wins: page-level navbar skins are scoped to `min-width: 769px`, and under 480px the logo shrinks to fit. The smoke test now taps the hamburger at 320, 360, 390 and 430px and fails if it is unreachable at any of them, so this regression cannot creep back at a width the old 390px-only probe ignored.

The navbar links to:

- **Shop**: `shop-all.html` (with brand and category hash filters via `?filter=…`)
- **Brands dropdown**: filters by `Jordan`, `Nike`, `Off-White`, `True Religion`, `Prada`, `Dior`, `LOEWE`, `Burberry`, `Moncler`, `Fendi`, `Gucci`, `Adidas`, `New Balance`, `Yeezy`
- **New Drops**: `shop-all.html?sort=newest`
- **Reviews**: `reviews.html`
- **About**: `about.html`

### Global Library (loaded on every page)

Every page ends with this block, inlined from [`partials/global-scripts.html`](partials/global-scripts.html) between `<!-- @@chrome:scripts:start -->` / `<!-- @@chrome:scripts:end -->` (edit the partial, then `npm run build:chrome`):

```html
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<script>window.firebaseConfig = { apiKey, projectId: "coalition-aec44", ... };</script>
<script src="auth.js"></script>
```

The same partial also defines the two tiny helpers every storefront page shares — `closeAnnounce()` (dismiss the announcement bar) and `handleFooterSignup()` (the newsletter form handler). They used to be hand-copied into each page's inline scripts.

- **`auth.js`** — Initializes Firebase Auth, subscribes to the signed-in user's Firestore doc (`users/{uid}`), and exposes `window.globalUser`, `window.globalProfile`, `window.globalWishlist`. It also injects the "Sign In" button / user-avatar dropdown into the navbar and wires up `window.toggleWishlist(productId)`.
- **`app.js`** — Module that renders the "Most Wanted" 4-card grid on the home page, manages the cart sidebar / product modal, search-redirect, and toast system. Imported with `?v=2.4` cache busters.
- **`product-data.js`** — ES module exporting `SEEDED_PRODUCTS` and helpers (`applyProductOverrides`, `getProductCardImage`, `mergeCatalogProducts`, `buildProductHref`, etc.). Auto-overrides Prada sneakers to a $547 fixed price + allowBackorder + 1-stock-per-size padding and auto-corrects `brand` for any product whose id or name contains "prada". Imported by both `app.js` and `product-page.js`.
- **Page-specific module** — e.g. `product-page.js`, `shop-all.js`, `checkout.js`.

### Brand & Category Pages

Each of the following pages uses the same navbar/footer but hard-codes its own collection of product tiles:

| Page             | Purpose                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `shop-all.html`  | Full catalog with sidebar filters (Category / Brand / Activity / Color / Price) and a 5-option sort (price ↑↓, newest, featured, A→Z). Backed by `shop-all.js`. |
| `men.html`       | Static curated Men drop (tiles + images embedded in HTML).              |
| `women.html`     | Static curated Women drop.                                              |
| `kids.html`      | Kids category.                                                          |
| `apparel.html`   | Apparel category.                                                       |
| `shoes.html`     | Shoes category.                                                         |
| `accessories.html` | Accessories category.                                                |
| `electronics.html` | Electronics category (frames the catalog by category).              |

### Product Detail (`product.html`)

The PDP module (`product-page.js`) is feature-rich:

- **Gallery**: prev/next arrows + thumbnails + dot pager + keyboard arrows; main image click advances.
- **Brand line / category badge / status badge / low-stock label**.
- **Price block** with strike-through retail price + price-history SVG sparkline + last-sale card marketplace/size/date.
- **Trust grid**: Shipping, Returns, Authenticity, Sizing/Help — each links to the matching policy page.
- **Size selector**: respects stock + backorder state. Marks sold-out vs. backorder (BO tag).
- **Offer modal**: `Make an Offer` button opens a form that submits to `/.netlify/functions/create-offer` with a prominent-offer lead-scoring threshold client-side before sending.
- **Reviews**: merged seeded reviews (`reviews-data.js`) + live Firestore `reviews` collection, filtered by `productId`/`productName` match helpers.
- **Recently Viewed**: tracks `localStorage['bdoor_recently_viewed']` (max 8, de-duplicated by id; renders the lower rail).
- Add-to-cart writes `localStorage['backdoor-cart']` and triggers the sidebar.

### Checkout (`checkout.html`)

The checkout page runs entirely client-side (`checkout.js`) on top of serverless functions:

1. **Step 1**: contact (first / last / email / phone) + shipping address (US states select + 4 countries).
2. **Step 2**: shipping method (Standard $9.99 / Express $19.99 / Overnight $34.99) — Standard ships free over $150.
3. **Step 3**: payment method tab — **Stripe Checkout** (cards, Apple Pay, Google Pay, Klarna, Afterpay, Affirm) or **PayPal Checkout** (PayPal balance, Venmo, cards). Both go to a hosted page and return to `?checkout=success|cancelled`.

- Promo codes are validated locally (`SGSCRAP` = 30% off) and persisted to `localStorage['backdoor-promo']`. Discounts are forwarded cents-accurate to PayPal function.
- On return, the page hydrates a success state from `checkout-session-status` (Stripe) or `capture-paypal-order` (PayPal).
- Cart-side drawer lives on the same page; "Continue shipping" CTA on the cart goes to the wizard.

### Account (`accounts.html`)

Holds both the **auth modal** (Login / Sign Up tabs, Google + Apple buttons, password strength meter) and the post-login **account dashboard**:

- **Overview** — KPI tiles + recent orders list.
- **Orders** — full order history with status filter.
- **Wishlist** — synced with `users/{uid}.wishlist` (an array of product IDs) via `window.toggleWishlist(id)`.
- **Profile** — first / last / email / phone / shoe size / birthday, persisted to Firestore.
- **Addresses** — default + saved addresses grid.
- **Alerts** — toggle row for price-drop / restock / new release / order / marketing emails.
- **Loyalty** — Bronze/Silver/Gold/Platinum progress bar with tier perks (currently a static demo state).

State tabs are toggled via `switchAccTab('orders' | 'wishlist' | 'profile' | …)`.

### Order Tracking (`tracking.html`)

- **Customer view (`#lookupPage`)**: Order number OR email input, plus a list of demo chip orders (`#BD-1038`…`#BD-1042`) for testing the visualization.
- **Tracking detail (`#trackingPage`)**: header card (id/date/status badge), delivery estimate banner, animated progress timeline, event log, carrier block (UPS / FedEx / USPS / DHL), order items, shipping address, pricing summary.
- **Admin order management (`#adminPage`)**: full orders table with bulk select, status / date / search filters, status update modal (with carrier + tracking + email-notify toggle), and CSV export.

### Informational Pages

- **`about.html`** — Brand story + NYC origin + "The Code" values grid + city stats + CTA.
- **`pricing.html`** — Admin "Smart Pricing Engine": market lookup (searches via `/.netlify/functions/price-monitor-ebay.js` & `prada`), size-by-size comparison vs. GOAT / StockX, AI recommendation panel, market-position gauge, bulk-pricing table, auto-rules CRUD.
- **`email.html`** — Admin email automation canvas.
- **`faq.html`** — six-card FAQ grid.
- **`contact.html`** — support email link + checklist of what to include.
- **Policies**: `privacy.html`, `terms.html`, `shipping.html`, `returns.html`, `reviews.html` (public reviews listing).
- **Brand pages** (`men.html`, `women.html`, `kids.html`, `apparel.html`, `shoes.html`, `accessories.html`, `electronics.html`) — static curated tiles per category.

---

## Admin Dashboard

The admin area lives under `/admin/` and is gated by Firebase Auth (admin claim token: `request.auth.token.admin == true`). Admin-only Firestore rules apply to writes on `products`, `orders`, `offers`, `customers`.

### Admin Auth, Sidebar & Layout

`admin/firebase-config.js` initializes the modular v10 SDK, shared between every admin page module. On `DOMContentLoaded`, each admin script calls `onAuthStateChanged(auth, …)` and bounces to `admin/index.html` if no user is logged in.

The sidebar is consistent across every admin page (Dashboard, Orders, **Products**, **Customers**, Offers, Reviews → TOOLS → **Restock Desk**, **Social Desk**, Analytics, Settings, Logout). `Restock Desk` and `Social Desk` are the two newest entries (`admin/restock.html`, `admin/social.html`).

### Pages

| Page                              | Module                                  | Notes                                                                                  |
| --------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| `admin/index.html` (landing/login) | `admin.js` v2.7                        | Two-pane: sign-in form vs. full SPA dashboard with sections (dashboard, orders, products, customers, import, priceMonitor, analytics, settings) + Imgur image uploader import flow. |
| `admin/dashboard.html`            | `dashboard.js`                          | Live `onSnapshot` counters (revenue, orders, products, customers), Chart.js revenue line, recent orders, inventory spotlight, activity feed. |
| `admin/orders.html`               | `orders.js`                             | Order table; status filters (pending, processing, shipped, delivered, cancelled).    |
| `admin/products.html`             | `products.js`                           | Product CRUD with image upload or URL, image crop tool, **image display controls** (fit mode, position, scale, padding, aspect ratio), **reorder link + cost + notes** columns, filter tabs (All / Sneakers / Apparel / Needs-reorder / Low-stock / Active / Inactive), brand/sort picker, summary line. |
| `admin/customers.html`            | `customers.js`                          | Registered customers table with totals + last order.                                   |
| `admin/offers.html`               | `offers.js`                             | Offers table with Accept / Counter / Reject flow; rating filter; modal with full offer metadata. |
| `admin/reviews.html`              | `reviews.js`                            | Reviews table with star-rating filter; per-row moderation actions.                    |
| `admin/analytics.html`            | `analytics.js`                          | Chart.js revenue + status + category charts; tables for top products / KPIs.         |
| `admin/settings.html`             | `settings.js`                           | Store info, feature toggles (maintenance, guest checkout, stock level, email confirm, reviews), shipping rates + threshold + intl toggle. |
| `pricing.html`                    | `pricing.js`                            | Smart Pricing Engine (see Informational Pages).                                       |
| `email.html`                      | _(see repo)_                            | Email automation workspace + performance charts.                                       |

The single-page variant `admin/index.html` still ships with its own multi-section shell (also called from older links) and is a fully featured admin that overlaps with the per-page experience — `admin/products.html`, `admin/dashboard.html`, etc. are the canonical entry points.

### Local-Only Tools

Two pages intentionally **do not** persist anything to Firestore and work fully locally:

- **`admin/restock.html` + `restock.js`** — Restock Desk: a searchable table of every product with `purchaseLink`, `retailLink`, `cost`, `target retail`, `target sizes`, `target status`. Saves are written directly to `admin/restock-private.local.json` (already `.gitignore`-d, so the file is per-machine and never gets pushed) — intended as a one-user sourcing tracker.
- **`admin/social.html` + `social.js`** — Social Desk: a canvas-based image-and-caption designer. Pick a product → choose a preset (Drop / Story / Sale / Restock / Top 4 Grid), ratio (Square / Story / Wide), theme (Backdoor / Mono / White / Volt / Red) → customize copy, kicker, badge, CTA, handle, promo → export PNG via `html2canvas`. Caption generator pane with one-click copy.

Both pages declare `<meta name="robots" content="noindex, nofollow, noarchive">` so they won't be indexed.

---

## Serverless Functions

All under `/netlify/functions/`, all exported as `exports.handler = async (event)`. They share two helper modules:

- **`_shared/stripe-checkout.js`** — Stripe + Firestore draft flow. Exports `buildDraftOrder`, `getStripe`, `finalizeOrderFromSession`, `saveDraftOrder`, `getDraftOrder`, `getShippingOption`, etc.
- **`_shared/paypal-checkout.js`** — Same flow but for PayPal, using `firebase-admin` (server SDK) for the orders collection + a public Firebase client for the read side.

### Function catalogue

| Function                          | Method | Inputs                                                | Output                                                              |
| --------------------------------- | ------ | ----------------------------------------------------- | ------------------------------------------------------------------- |
| `create-checkout-session`         | POST   | `{ customer, shippingAddress, shippingMethod, cart, promoCode, discountAmount }` | `{ url, sessionId, orderNumber }` — Stripe-hosted checkout URL, fallback to dynamic payment methods if BNPL not enabled. |
| `checkout-session-status`         | GET    | `?session_id=…`                                       | `{ paid, paymentStatus, orderNumber, customerEmail, total, currency }` and finalize draft + create order if `paid`. |
| `stripe-webhook`                  | POST   | Stripe `checkout.session.completed` event              | Calls `finalizeOrderFromSession`, returns `{ received: true }`. Verifies signature with `STRIPE_WEBHOOK_SECRET`. |
| `create-paypal-order`             | POST   | Same payload as Stripe                                | `{ url, orderId, orderNumber }` — PayPal approve URL.              |
| `capture-paypal-order`            | POST   | `{ orderId, pendingOrder }`                           | Captures PayPal order, writes order doc into Firestore (public + admin), returns hydrated order summary. |
| `create-offer`                    | POST   | `{ productId, size, brand, askingPrice, offerAmount, customerName/Email/Phone, message }` | Validates as **prominent lead** (≥55–65% of asking + valid email + real name + ≥$50), assigns a lead score and review priority, writes to `offers` collection. Returns 422 `lead_not_prominent` otherwise. |
| `market-price-snapshot`           | POST   | `{ sources: { stockx, goat, ebay } }`                | Fetches each source URL, extracts prices via regex + JSON-LD + meta tag patterns + verifies eBay authenticity guarantee, returns the cheapest authenticated benchmark. |
| `price-monitor-ebay`              | GET    | `?q=…`                                                | Lightweight regex scrape of `ebay.com/sch/i.html?_nkw=…`, returns `minPrice` and samples. |
| `price-monitor-prada`             | GET    | `?q=…`                                                | Same shape, scrapes `prada.com/us/en/search.html?q=…`.             |

### Shared cart model

Both Stripe and PayPal helpers normalise a cart item into:

```js
{
  id / productId,
  name, brand, size ('One Size' fallback),
  qty (≥1), price (USD, 2 decimals),
  image, backorder, backorderLeadTime
}
```

Shipping options are shared across both modules:

```js
[
  { id: 'standard',  name: 'Standard Shipping',  time: '5-7 business days', price: 9.99  },
  { id: 'express',   name: 'Express Shipping',   time: '2-3 business days', price: 19.99 },
  { id: 'overnight', name: 'Overnight Shipping', time: 'Next business day',  price: 34.99 }
]
// Standard ships free when subtotal ≥ $150
```

Order totals → cents for Stripe (`toStripeAmount(v) = v*100`) and 2-decimal strings for PayPal (`toPayPalMoney`). Returns, then write:

- `orders/{draftId}` — full order
- `checkout_drafts/{draftId}` — draft with `status: 'paid'`, payment info, `finalizedAt` timestamp.

PayPal orders additionally write a **public** mirror via the secondary Firebase client (`paypal-checkout-public`), so unauthenticated order lookups still work.

---

## Data Model (Firestore)

`firestore.rules` is enforced server-side. Public-read vs. admin-write by collection:

```
products/{productId}      → public read; admin write
orders/{orderId}          → anyone can create (checkout flow);
                            owner-or-admin read/update; admin delete
users/{userId}            → only the user themselves can read/write
offers/{offerId}          → anyone can create; admin read/update/delete
reviews/{reviewId}        → public read; signed-in users create; owner-or-admin update/delete
checkout_drafts/, customers/ → written by serverless functions with admin credentials
```

Document shape (abbreviated; see `product-data.js`, `_shared/stripe-checkout.js` and `_shared/paypal-checkout.js` for canonical shapes):

```js
// products/{productId}
{
  id, name, brand, category, colorway, description,
  sku, releaseDate,
  price, retailPrice,
  stock (total) or sizes[ { size, stock, price, backorder, backorderLeadTime } ],
  image, images[], cardImage,
  imageFit, imagePosition, imageScale, imagePadding, imageAspect,
  allowBackorder, backorderLeadTime,
  status: 'active' | 'inactive',
  isHidden, isFeatured,
  reorderUrl / purchaseUrl, reorderCost / purchaseCost, reorderNotes,
  priceHistory[], lastSale { price, soldAt, marketplace, size, note },
  createdAt: <firestore timestamp> | { seconds: 0 } // for seeded entries
}

// orders/{orderId}
{
  orderNumber (BD-XXXXXXyy),
  customer { firstName, lastName, email, phone, name },
  shippingAddress { address1, address2, city, state, zip, country },
  items[], pricing { subtotal, discount, shipping, tax, total },
  shippingMethod, shippingLabel, shippingTime,
  paymentStatus, status, source ('stripe_checkout' | 'paypal_checkout'),
  stripe/paypal ids, promoCode, createdAt, updatedAt
}

// users/{uid}
{ first, last, email, phone, size, bday, wishlist: [ productId, ... ], createdAt }

// offers/{offerId}
{
  productId, productName, productSku, productImage,
  size, brand, askingPrice, offerAmount,
  customerName, customerEmail, customerPhone, message,
  status: 'pending' | 'accepted' | 'countered' | 'rejected',
  leadType, leadScore (0-100), offerRatio, reviewPriority,
  createdAt, updatedAt
}

// reviews/{reviewId}
{ productId | productName, name, rating (1-5), comment, images[], isHidden, createdAt }

// checkout_drafts/{draftId}     → created by checkout flows
// customers/{customerId}        → maintained by order capture
```

---

## Local Development

There is intentionally no build pipeline — just static HTML + module JS. Two run paths:

### 1. Site only (no Express / no serverless)

You can open any HTML file directly or serve the folder:

```bash
# Any static server works, e.g.
npx serve .
# or
python -m http.server 8080 .
```

Note: Netlify Functions (`/.netlify/functions/*`) won't work locally without `netlify dev`. Use real backend URLs or stub them.

### 2. Full local with serverless functions

```bash
npm install
# Then run netlify dev (which auto-spawns the functions runtime)
npx netlify dev
```

The included `server.js` is a separate helper, not used by Netlify deploys:

```bash
node server.js   # Express at http://localhost:5001
```

`server.js` exposes `POST /api/products` which accepts a multipart image upload, slugifies the name, then writes the product record directly into `app.js`, `admin.js`, `checkout.js`, and `accounts.js` (auto-injected before the closing array bracket), and `git add/commit/push` — handy for one-off product uploads from the local Admin auto-deploy flow.

### Local product image uploads (mirror pipeline)

The mirror tool doubles as a local upload server. It serves the site *and* accepts image uploads, storing them in `products/catalog/` — the same directory the mirror manages — instead of a third-party CDN:

```bash
node scripts/mirror-catalog-images.js --serve          # serves the site on port 5180
# then open /admin.html from that origin and upload as usual
```

Uploaded files are named `<slug>-<content-hash><ext>` (identical bytes dedupe to one file) and recorded in `products/catalog/uploads.json`, which also keeps `--prune` from deleting them. The admin prefers this endpoint when it is reachable and silently falls back to Cloudinary on the deployed static site, where nothing can write into the repo. Commit the new `products/catalog/` files as part of the product change.

Writes are gated by a shared token so an unrelated page running on localhost cannot drop files into the repo. The server mints one per run (override with `--token <value>` or `CATALOG_UPLOAD_TOKEN`), prints it on startup, and injects it into the HTML it serves, so the same-origin admin keeps working without configuration. A client must send it as the `X-Catalog-Token` header (or `?token=`); requests without it get `401`.

Add `--commit` to have the server commit each newly stored image (plus its `uploads.json` entry) as you upload, with a message like `Add catalogue image <file>`. Only those paths are committed, so anything else staged or in progress in your working tree is left untouched. A deduped re-upload has nothing new to commit and is skipped.

Keep the mirror current with the live store in one command:

```bash
npm run mirror:catalog   # pull image URLs from Firestore, mirror new ones, rewrite the alias map
```

It reads the catalogue read-only with the project's public web API key (`FIRESTORE_PROJECT` / `FIREBASE_API_KEY` override the defaults), downloads anything not yet mirrored, regenerates `products/catalog/aliases.mjs`, and reports dead sources.

Fix a single dead image without hand-editing JSON:

```bash
node scripts/mirror-catalog-images.js --re-source \
  --broken "<dead image URL>" \
  --replacement "<working image URL, or an existing local repo path>"
```

It mirrors the replacement into `products/catalog/`, points the broken URL at it in `products/catalog/aliases.manual.json`, regenerates the alias module, and drops the URL from the dead-source record. Add `--dry-run` to preview, or `--name "..."` to name a mirrored replacement. Commit the new `products/catalog/` files.

### Required environment variables (Netlify)

These are read by both checkout helpers and the admin SDK. The repo intentionally does **not** commit these.

```
STRIPE_SECRET_KEY                 # Stripe Checkout secret key
STRIPE_WEBHOOK_SECRET             # Verified via stripe-webhook.js
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_ENVIRONMENT                # "live" | "sandbox"
PAYPAL_BRAND_NAME                 # Defaults to "backdoorco.xyz"
PAYPAL_SOFT_DESCRIPTOR            # ≤22-char alphanum statement descriptor
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY               # multi-line; replace \n with real newlines before upload
COOKIE_DOMAIN / SITE_ORIGIN        # optional overrides; functions derive from request host
```

`package.json` declares the production deps for the helpers: `cors`, `express`, `firebase`, `firebase-admin`, `multer`, `stripe`. `firebase` is consumed by shared helpers; `firebase-admin` lives behind `paypal-checkout.js` only.

---

## Deployment

The frontend is deployed to **Vercel** (project `backdoorco`); the serverless functions remain on **Netlify**.

- **Host (static site)**: Vercel — `vercel.json` publishes the repo root as-is (`buildCommand: null`, `outputDirectory: "."`, `cleanUrls: true`, `trailingSlash: false`), so all HTML, CSS, JS, and `products/*` images deploy as static assets.
- **Domains**: `backdoorco.xyz` (apex) and `www.backdoorco.xyz` (308 redirect → apex) are attached to the Vercel project; `backdoorco.vercel.app` is Vercel's default alias.
- **Functions dir**: `netlify/functions` — these still run on Netlify (site `backdoorco2.netlify.app`).
- **Netlify Functions proxy**: `vercel.json` rewrites `/.netlify/functions/*` → `https://backdoorco2.netlify.app/.netlify/functions/*`, so checkout, payments, offers, and price monitors work unchanged on the Vercel domain. The `backdoorco2` Netlify site must stay deployed.
- **Auth proxy**: `netlify.toml` (`[[redirects]]`) and `vercel.json` (`rewrites`) both proxy `/__/auth/*` → `coalition-aec44.firebaseapp.com` so Firebase Auth's hosted handler URLs resolve cleanly.
- **Security headers**: `Cross-Origin-Opener-Policy: same-origin-allow-popups` is set globally (via `[[headers]]` in `netlify.toml` and `headers` in `vercel.json`) — needed for Stripe/PayPal popups.
- **Ignored paths**: `.npm-cache/` and secrets, per `.netlifyignore` and `.gitignore`.
- **CI**: GitHub Actions CodeQL runs only for `.github/**` workflows per `codeql.yml`.

### Deploy flow

1. Deploy the static site from the repo root with `vercel --prod` (no build step — `buildCommand: null`).
2. Netlify redeploys when `netlify/functions/*` (or the Netlify site config) changes.
3. Admin changes are made from the running site (admin pages write back to Firestore directly).
4. New products usually go through the **Import / Imgur Paste** flow inside the admin SPA (`admin/index.html` → Import tab) or the local Express helper `server.js`.

---

## Skills and Utilities

- **`skills/price-monitor.SKILL.md`** — Internal design doc for the weekly price-monitor + offer-system skill. Outlines runway: SKU-first product matching, GOAT/StockX/eBay/Prada source adapters, configurable price policy (delta or % under market), alert channels, and an `AUTO_UPDATE_MODE` toggle (`off | recommend | auto`).
- **Local helper scripts** (root, safe to delete without affecting prod):
  - `update_nav.py`, `convert_utf8.py` — one-off data hygiene patches.
  - `seed-products.js` plus the per-product `admin/seed-*.html` — used to seed the initial Jordan 4 "Toro", Kobe 6 "ASG 3D", Prada America's Cup line, etc.
- **`deploy.ps1`** — PowerShell helper for the local autodeploy workflow.

---



### Restock Portal (portal/)

A top-level, auth-gated, read-only companion to the Restock Desk.

- Hard gate: Firebase Auth + admin custom-claim (mirrors /admin/*).
- Soft gate: `<meta name="robots" content="noindex, nofollow, noarchive">` and not linked from the public nav.
- Data source: Firestore collection `restock_ideas/{ideaId}` (admin-only read/write/delete). Writes use `db.runTransaction(...)` so concurrent publishes of the same docId are serialised; `createdAt` is stamped only by the transaction that observes the doc as non-existent, and never re-stamped on updates.`updatedAt` is refreshed on every publish.
- Writes: the Restock Desk has a new `Publish to Portal` button next to `Save Links` that upserts the current record into `restock_ideas/`.
- Reads: `portal/portal.js` listens onSnapshot and renders a card grid with image, brand, title, retail price, margin, sizes, status pills, and `[Retail]` / `[Source]` buttons.
- Search: `portal/index.html` toolbar filters by brand / title / status / sizes in real time.
- Lineage: shares `admin/admin.css`; inline `<style>` block handles the card-grid + status-pill palette only.

### `price-monitor-retail` Netlify function

Generic retailer scraper that extracts `title + retailPrice + currency` from any product page that emits JSON-LD Product schema or the OpenGraph `product:price:*` meta tags. Used by the Restock Desk’s `Lookup price` button.

Strategies (in order): JSON-LD `Product` → OpenGraph `product:price:*` meta → heuristic `<title>` + price-pattern scan (with `<script>`/`<style>` blocks stripped first; price range `$20 - $250,000`).

Works for Lyst, Farfetch, END., SSENSE, Mr Porter, Nordstrom, Net-A-Porter. JS-only sites (Kickwho, Yupoo, etc.) return `404` — manual entry is the fallback.
## Quick Reference

| What you want to do                         | Where to look                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Add / update a product                      | `admin/products.html` (UI) or `product-data.js` (seeds)                                                          |
| Track a new brand itself                    | Edit the brand dropdown in `partials/nav.html`, then `npm run build:chrome`                                       |
| Change styling                              | `styles.css`, `store.css`, `admin.css`, `shop-all.css`, etc.                                                      |
| Tweak shipping / promo                      | `checkout.js` (constants `FREE_SHIP_THRESHOLD`, `SHIPPING_OPTIONS`, `PROMO_CODES`)                              |
| Switch payment behavior                     | `netlify/functions/_shared/stripe-checkout.js` or `_shared/paypal-checkout.js`                                  |
| Adjust offer lead-scoring threshold         | `netlify/functions/create-offer.js` (`MIN_STANDARD_RATIO`, `MIN_HIGH_VALUE_RATIO`, `MIN_OFFER_AMOUNT`)          |
| Add a public policy / FAQ page              | Create `policy.html`, add it to `partials/footer-*.html`, then `npm run build:chrome`                            |
| Update Firestore security rules             | `firestore.rules`                                                                                               |
| Adjust homepage live feed                   | `app.js` → search for "Most Wanted", or `index.html` for the inline brand cards                                  |
| Change the site-wide nav or footer          | Edit `partials/nav.html` / `partials/footer-*.html`, then `npm run build:chrome`                                 |
| Change site-wide scripts / Firebase config  | Edit `partials/global-scripts.html`, then `npm run build:chrome`                                                  |
| Change navbar / cart / toast styling        | Edit `chrome.css` (shared base) or the page stylesheet for a page-specific override                              |
| Change the site colour tokens               | Edit `tokens.css`                                                                                                 |
| Add a new admin page                        | Drop the HTML+JS pair in `admin/`, mirror the sidebar nav (`<p class="nav-label">TOOLS</p>` etc.) + add an entry in every existing admin nav |
| Set image crop/aspect ratio per product      | Edit product → Image Display section: Fit Mode toggle, Position X/Y sliders, Scale, Padding, Aspect Ratio dropdown (Auto / 1:1 Square / 3:4 Portrait / 4:3 Landscape / 16:9 Widescreen) |
| Smoke-test every storefront page            | `npm run test:smoke` (headless Chrome: page loads, structural assertions, mobile menu, dropdown, cart drawer, shopping flow) |

---

## Contact & Support

- Live storefront: [backdoorco.xyz](https://backdoorco.xyz/)
- Social: [@backdoorco](https://instagram.com/backdoorco) · [TikTok](https://tiktok.com/@backdoorco) · [X / Twitter](https://twitter.com/backdoorco)
- Repository: [github.com/sgscrap/BackdoorCo](https://github.com/sgscrap/BackdoorCo)
- Support email: `backdoor.co.inc@gmail.com`

© 2026 Backdoor. New York, NY. Authentic sneakers guaranteed.
