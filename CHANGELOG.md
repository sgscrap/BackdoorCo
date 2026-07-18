# Changelog

All notable changes to the Backdoor project are documented here. This file follows a simple chronological format — newest entries first.

---

## [Unreleased] — 2026-07

### Added — Image Display Controls & Aspect Ratio Presets
- **Per-product image display settings** in `admin/products.html` → Image Display section:
  - **Fit Mode** toggle: Contain / Cover
  - **Position X/Y** sliders (0–100%) — control `object-position` of the product image
  - **Scale** slider (0.8x–1.5x) — control image zoom within the container
  - **Padding** input (0–40px) — space around the image inside its card
  - **Aspect Ratio** dropdown — Auto (natural), 1:1 Square, 3:4 Portrait, 4:3 Landscape, 16:9 Widescreen
- Settings saved per-product to Firestore (`imageFit`, `imageOffsetX`, `imageOffsetY`, `imageScale`, `imagePadding`, `imageAspect`).
- **Live preview** in the product form updates in real time as you adjust sliders.
- **Image Ratio Summary** card on the admin dashboard (`admin/dashboard.html`) shows a bar-chart breakdown of how many products use each aspect ratio.
- **Frontend display**: `product-data.js` exports `getProductAspectRatio`, `getProductCardImageStyle`, and `getProductCardClass`; shop card containers respect `imageAspect` via CSS `aspect-ratio` classes.
- **CSS classes** added to `shop-all.css`: `.shop-card--aspect-square`, `.shop-card--aspect-portrait`, `.shop-card--aspect-landscape`, `.shop-card--aspect-wide`.

### Added — Restock Desk (`admin/restock.html`)
- Local-only sourcing tracker for managing product reorder links, costs, target retail prices, and target sizes.
- Saves to `admin/restock-private.local.json` (gitignored, never pushed).
- Publish-to-Portal flow writes entries to Firestore `restock_ideas/` collection.
- Companion read-only **Restock Portal** (`portal/`) for viewing published restock ideas.
- `netlify/functions/price-monitor-retail.js` — scrapes JSON-LD and OpenGraph tags from retailer product pages (Lyst, Farfetch, END., SSENSE, etc.) for the "Lookup price" button.

### Added — Social Desk (`admin/social.html`)
- Canvas-based image-and-caption designer for creating social media assets.
- Pick a product → choose a preset (Drop / Story / Sale / Restock / Top 4 Grid), ratio (Square / Story / Wide), theme (Backdoor / Mono / White / Volt / Red).
- Customize copy, kicker, badge, CTA, handle, and promo text.
- Export as PNG via `html2canvas`.
- Caption generator pane with one-click copy.

### Added — Admin Product Reorder Links
- Reorder link (`purchaseUrl` / `reorderUrl`) and cost (`purchaseCost` / `reorderCost`) columns in the admin products table.
- Shows calculated margin (price minus cost, as currency and percentage).
- Quick buttons to open the reorder link or live product page from the table.
- "Needs Reorder Link" filter tab for discovering products missing supplier URLs.
- Reorder Notes field for supplier size notes, shipping notes, and batch info.

### Added — New Brands
- **Burberry**, **Moncler**, and **Fendi** added to the brand dropdown in admin product form, the storefront navbar dropdown, all category pages, and the shop-all sidebar filters.
- Seeded catalog entries for Burberry Logo-Embroidered T-Shirt, Moncler Logo-Patch Cargo Shorts, and Fendi Teddy Bear Plush Toy T-Shirt.

### Added — Seeded Catalog Products
- Nigel Sylvester x Air Jordan 4 Retro OG 'Sail'
- Dior B30 Countdown Tech Sneaker (Beige/Brown/Orange)
- Dior B30 Countdown Tech Sneaker (White/Gray/Green)
- LOEWE Logo-Embroidered Cotton-Jersey T-Shirt (White)
- LOEWE Logo-Embroidered Cotton-Jersey T-Shirt (Navy)

### Changed — Admin Auth
- Auth guards across all admin pages now gracefully handle null user (no longer redirect on null, shows fallback "Admin" / "A" display).
- Admin pages now auto-render even without a signed-in user (relaxed for local dev).

### Changed — Product Discovery & Filtering
- Product summary line shows "X shown / Y total", "Z need reorder links", "W low stock".
- Brand filter dropdown dynamically populated from Firestore.
- Sort by margin (price minus cost) added.

### Changed — New Drops Sorting
- Improved sorting accuracy for the "New Drops" view on `shop-all.html?sort=newest`.
- Uses `getProductSortTimestamp` from `product-data.js` for consistent date-based ordering with fallback to name.

---

## [Stable] — 2026-06

### Added — Price Monitoring
- `netlify/functions/price-monitor-ebay.js` — scrapes eBay search results for min price and samples.
- `netlify/functions/price-monitor-prada.js` — scrapes prada.com search results.
- `netlify/functions/market-price-snapshot.js` — composite snapshot pulling from StockX, GOAT, and eBay with authenticated price detection.
- Market pricing panel in product form with benchmark price from lowest authenticated source.

### Added — Payment & Checkout
- Stripe Checkout integration (cards, Apple Pay, Google Pay, Klarna, Afterpay, Affirm).
- PayPal Checkout integration (PayPal balance, Venmo, cards).
- Shared checkout cart model across both payment providers.
- Promo code system (`SGSCRAP` = 30% off).
- Checkout wizard (3 steps: contact/shipping → shipping method → payment).

### Added — Customer Account System
- Auth modal (Login / Sign Up with email, Google, Apple buttons).
- Account dashboard with Orders, Wishlist, Profile, Addresses, Alerts, Loyalty tabs.
- Wishlist synced to Firestore `users/{uid}.wishlist`.

### Added — Public Site Pages
- Full catalog (`shop-all.html`) with sidebar filters (Category, Brand, Activity, Color, Price).
- Product detail page (`product.html`) with gallery, size selector, offer modal, reviews, recently viewed.
- Order tracking (`tracking.html`) with customer lookup and admin management.
- Brand/category pages: men, women, kids, apparel, shoes, accessories, electronics.
- Policy pages: privacy, terms, shipping, returns, FAQ, contact.
- Reviews page (`reviews.html`) with public reviews listing.

### Added — Admin Dashboard
- Stats grid (revenue, orders, products, customers) with live `onSnapshot` counters.
- Chart.js revenue overview line chart.
- Inventory spotlight (low-stock items).
- Recent orders table and activity feed.
- Quick actions grid.

### Added — Firestore Data Model
- Collections: `products`, `orders`, `users`, `offers`, `reviews`, `checkout_drafts`, `customers`.
- Firestore security rules with admin-claim gating.
- Seeded product catalog in `product-data.js` with runtime overrides.

---

## Legend

| Tag       | Meaning                                         |
| --------- | ----------------------------------------------- |
| **Added** | New features, pages, functions, or capabilities |
| **Changed** | Improvements to existing features             |
| **Fixed** | Bug fixes                                       |
| **Removed** | Deprecated or removed features                |
