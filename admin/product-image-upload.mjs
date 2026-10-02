// Save-time image helpers for the admin product form (admin/products.js).
//
// Extracted into its own ES module — like localize-image.mjs and
// catalog-upload.mjs — so the "upload, then write the result into the saved
// product" path can be unit-tested without a browser DOM or Firebase. The
// uploader itself is admin/catalog-upload.mjs, which is local-first: it prefers
// the local mirror server and only falls back to Cloudinary when that is down.

// The bytes to upload: a pending crop wins over the raw input file, and is
// named after its real type so a lossless crop is not given a .jpg label.
export function uploadFileFor(imageFile, croppedBlob) {
    if (croppedBlob) {
        const type = String(croppedBlob.type || 'image/png');
        const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
        // Match the original form naming: a crop of a picked file keeps that
        // file's base name; a crop with no input file is just "cropped".
        const name = imageFile
            ? `${String(imageFile.name || 'upload').replace(/\.[^.]+$/, '')}-crop.${ext}`
            : `cropped.${ext}`;
        return new File([croppedBlob], name, { type });
    }
    return imageFile || null;
}

// Apply an upload result to the image fields being saved. A truthy result (a
// local path from the mirror server, or a Cloudinary URL) becomes the primary
// image and moves to the front of the gallery; an empty result keeps the URL
// the admin typed.
export function applyUploadedImage(uploaded, { currentUrl = '', gallery = [] } = {}) {
    const imageUrl = uploaded || currentUrl;
    const nextGallery = uploaded
        ? [uploaded, ...gallery.filter((url) => url !== uploaded)]
        : [...gallery];
    return { imageUrl, gallery: nextGallery };
}

// The image fields written into the saved product document: primary first, the
// gallery de-duplicated (case-insensitively) and never empty.
export function buildProductImageFields(imageUrl, gallery = []) {
    const primary = String(imageUrl || '').trim();
    const candidates = Array.isArray(gallery) && gallery.length ? gallery : [primary];
    const seen = new Set();
    const images = [];
    for (const candidate of [primary, ...candidates]) {
        const value = String(candidate || '').trim();
        if (!value) continue;
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        images.push(value);
    }
    return { image: primary, cardImage: primary, images };
}
