# Bike photos go here

Drop JPG / WebP / PNG photos for your listings into this folder.

The sample listings in `sample-listings.js` reference:

- `assets/sample-honda-crf450r.jpg`
- `assets/sample-yamaha-yz250f.jpg`
- `assets/sample-ktm-350excf.jpg`
- `assets/sample-kawasaki-kx450.jpg`
- `assets/sample-husqvarna-fc350.jpg`
- `assets/sample-suzuki-rmz450.jpg`
- `assets/sample-beta-300rr.jpg`
- `assets/sample-gasgas-mc450f.jpg`

If you replace the listings with your own entries, point each
listing's `artwork` field to whatever path you want (e.g.
`assets/honda-crf450r-front-quarter.jpg`, or an absolute URL to
your CDN).

A 1:1 aspect ratio (1080x1080 or 1200x1200) renders best in the
single-bike card. A 4:3 or 16:9 still works — the card auto-crops
with `object-fit: cover`.

200-400 KB per image is the sweet spot; the export is already
2x so the preview already has plenty of resolution.
