// Local-first product image uploader.
//
// Tries the local mirror upload server (`node scripts/mirror-catalog-images.js
// --serve`), which writes the image into products/catalog/ and returns its local
// path. When that server is not reachable — the deployed admin is a static site
// with no write access to the repo — it falls back to Cloudinary so uploads
// keep working.
import { cloudifyUpload } from './cloudify.mjs';

const DEFAULT_ENDPOINT = '/api/catalog-upload';

export function catalogUploadEndpoint() {
    return (typeof window !== 'undefined' && window.CATALOG_UPLOAD_ENDPOINT) || DEFAULT_ENDPOINT;
}

// The local `--serve` process injects a per-run token into the HTML it serves.
// A page loaded from another origin cannot read it, so it cannot write here.
function catalogUploadToken() {
    return (typeof window !== 'undefined' && window.CATALOG_UPLOAD_TOKEN) || '';
}

// Once the local endpoint proves unavailable we stop retrying it for the rest
// of the session; every upload would otherwise pay a failed round-trip first.
let localUploadUnavailable = false;

async function uploadToLocalCatalog(file) {
    const name = encodeURIComponent(file.name || 'product-image');
    const headers = { 'Content-Type': file.type || 'application/octet-stream' };
    const token = catalogUploadToken();
    if (token) headers['X-Catalog-Token'] = token;
    const response = await fetch(`${catalogUploadEndpoint()}?name=${name}`, {
        method: 'POST',
        headers,
        body: file,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json().catch(() => null);
    if (!data || !data.local) throw new Error('no local path returned');
    return data.local;
}

export async function uploadCatalogImage(file) {
    if (!file) return null;

    if (!localUploadUnavailable) {
        try {
            return await uploadToLocalCatalog(file);
        } catch (error) {
            localUploadUnavailable = true;
            console.info(`[catalog-upload] local mirror upload unavailable (${error.message}); falling back to Cloudinary`);
        }
    }

    return cloudifyUpload(file);
}

// True when an upload result is a repo-local path rather than a remote URL.
export function isLocalCatalogPath(value) {
    return typeof value === 'string' && value.startsWith('products/');
}
