# Voltride Social Media Asset Desk (portable)

A drop-in social media graphics studio for a dirtbike reselling website.
This folder was extracted from the [DMV Signal](https://voltride.example) Social
Media Asset Desk. The visual templates, controls, caption generator, and
PNG export have been preserved; the data layer, copy voice, and brand
name have been reworked for dirtbike listings.

## Folder contents

```
social-desk-portable/
├── index.html              The full workspace UI (templates, controls, capture)
├── sample-listings.js      8 sample dirtbike listings ready to import
├── README.md               This file
└── assets/
    └── README.md           Note about image storage
```

That's it. Two working files (`index.html` + `sample-listings.js`),
one README, and one empty assets folder for your own bike photos.

## Quick start

1. Drop this whole folder into any static site
   (`voltride.example/social-desk/`, `pages/social/`, etc.).
2. Open `index.html` in a browser. No build step, no server logic,
   no auth gate.
3. The **Import Listing** dropdown and the **Quick Presets** grid
   auto-populate from `sample-listings.js`.

That's it — users land on it, pick a bike or fill in custom
Make / Model / Year / Price / Region, choose an aspect ratio
(1:1 Feed / 9:16 Story / 16:9 Marketplace), pick a template
(Single Bike Listing / Lineup Card / Walkaround Card / Featured 4 /
Sale Bulletin / Manufacturer of Month / Owner Spotlight), tweak the
colors and stickers, then hit **Download High-Res PNG (2x)**.

## Listings schema (sample-listings.js)

Each entry in `window.voltrideDatabase` follows this shape:

| Field            | Maps from (music schema) | Dirtbike meaning                          |
| ---------------- | ------------------------ | ----------------------------------------- |
| `id`             | release.id               | unique slug for the bike                  |
| `artist`         | release.artist           | make (Honda, Yamaha, KTM, ...)            |
| `release`        | release.release          | model (CRF450R, YZ250F, ...)              |
| `year`           | (new)                    | year of the bike                          |
| `price`          | (new)                    | asking price as a string (`"$7,500"`)     |
| `region`         | release.region           | seller's area / pickup region             |
| `subtext`        | release.subtext          | full editorial copy (year + cond + notes) |
| `badge`          | release.badge            | price or short status (`"$7,500"`)        |
| `kicker`         | release.kicker           | category line (`"For Sale | Mid-Atlantic"`) |
| `artwork`        | release.artwork          | bike photo path                           |
| `theme`          | release.theme            | `paper` / `dark` / `red` / `gold`         |
| `type`           | release.type             | template key (see below)                  |
| `condition`      | (new)                    | `Like New` / `Good` / `Fair` / `Excellent`|
| `status`         | release.status           | `in-stock` / `sold` / `archive` / `price-drop` |
| `vinyl`          | release.vinyl            | show accent disc behind the cover         |
| `assetDeskFeatured` | release.assetDeskFeatured | pin to the Featured Listings grid      |

### Template key map (`type`)

| `type`          | Workspace template      | Use for                                |
| --------------- | ----------------------- | -------------------------------------- |
| `bike`          | `single`                | Standard single-bike listing           |
| `lineup`        | `mixtape`               | Lineup / multi-bike / spec sheet       |
| `walkaround`    | `video_promo`           | Walkaround video card (Facebook 16:9)  |
| `featured-4`    | `collage`               | Featured 4 listings grid               |
| `seller`        | `artist`                | Seller spotlight / bio                 |
| `sale`          | `announcement`          | Sale / store-wide bulletin             |
| `mfr-month`     | `brand_month`           | Manufacturer of the Month              |
| `mfr-week`      | `brand_week`            | Manufacturer of the Week               |
| `tribute-build` | `memorial`              | Owner tribute / custom build spotlight |

## Replacing the sample data with your own

Open `sample-listings.js`. Each entry is keyed by a unique slug
(`honda-crf450r-2022`, etc.). Replace or extend the entries. The
workspace reads the file on page load — no rebuild step.

If you have a JSON file already (from a backend or a CMS dump),
you can load it dynamically instead:

```html
<!-- Replace the <script src="sample-listings.js"> tag with: -->
<script src="/api/listings.json"></script>
```

You'll need a tiny adapter shim that does
`window.voltrideDatabase = apiListings`.

## Customizing the brand

Three knobs:

1. **Brand name** — search-and-replace `Voltride` (3 cases:
   `Voltride`, `voltride`, `VOLTRIDE`) with your brand. There are
   ~36 hits across the file.
2. **Color palette** — at the top of the `<style>` block in
   `index.html`, the **Aesthetic → Custom Palette** color picker
   overrides the four CSS variables live:
   `--paper`, `--ink`, `--ink-soft`, `--paper-deep`. The
   `--red` and `--gold` accents also propagate from `--paper` if
   you pick a custom palette.
3. **Hashtags** — the captions are generated inside the
   `updateCaption()` function near the bottom of `index.html`. Edit
   the hashtag block in each template branch to match your brand.

## Captions

The caption textarea in the sidebar auto-updates as you fill in
the form. The templates are tuned for dirtbike voice:

- Single Bike Listing — `Make Model — price · Region · Description.`
- Walkaround Card — `Make Model walkaround · <description>. <link>`
- Featured 4 Listings — `Voltride Featured 4 · #1 … #2 … #3 … #4 …`

The hashtags lead with `#voltride` then layer `#DirtBike` /
`#<Make>` / `#<Region>`. Edit the `updateCaption()` function to
match your house voice.

## Export

**Download High-Res PNG (2x)** runs the live preview through
`html2canvas` and downloads a 2160×2160 (or 2160×3840 for Story,
or 2400×1350 for 16:9) PNG. There is no server-side call — the
image is rendered entirely client-side.

## Browser support

- Chrome / Edge / FireFox / Safari (current versions)
- html2canvas 1.4.1 loaded from cdnjs CDN
- Google Fonts (Anton, Fraunces, DM Sans) loaded from Google Fonts

No build tooling, no Node, no npm. Drop and go.

## Installation paths

### Standalone (new static site)

Copy the folder anywhere reachable via HTTP. Open it.

### Inside an existing site (e.g. Next.js / Astro / Eleventy)

Drop `index.html` + `sample-listings.js` into your `public/` (or
equivalent). They'll be served at `/social-desk/` (or similar).

### Linking from your main nav

Add a nav link:

```html
<a href="/social-desk/index.html">Social Asset Desk</a>
```

The workspace is self-contained and won't conflict with your
existing CSS — it uses scoped class names that start with
`ws-` (workspace) and CSS variables.

## License

The asset is extracted from [DMV Signal](https://voltride.example)'s
internal tooling. The visual templates, branding system, and link
to `voltride.example` are retained for convenience. Replace the
brand references before going public.

## Support

The behavior of the workspace is documented inline in `index.html`
— every section is comment-flagged (search for `// =====`).
