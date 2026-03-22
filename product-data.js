export const BLACK_CAT_IMAGES = [
    'https://i.imgur.com/0LaAQgf.png',
    'https://i.imgur.com/3K8TkzE.png',
    'https://i.imgur.com/q7uV2MM.png',
    'https://i.imgur.com/XAzKOl2.png',
    'https://i.imgur.com/o4zCCXe.png',
    'https://i.imgur.com/ckIfHxm.png',
    'https://i.imgur.com/RiQyQS4.png'
];

const IMGUR_SIZE_SUFFIXES = new Set(['s', 'b', 't', 'm', 'l', 'h']);

function matchesBlackCat(product) {
    const name = String(product?.name || '').toLowerCase();
    const sku = String(product?.sku || '').toLowerCase();
    return (name.includes('jordan 4 retro') && name.includes('black cat')) || sku === 'fv5029 010';
}

export function applyProductOverrides(product) {
    if (!product) return product;

    const nextProduct = {
        ...product,
        price: Number(product.price) || 0
    };

    if (matchesBlackCat(nextProduct)) {
        nextProduct.name = String(nextProduct.name || "Jordan 4 Retro 'Black Cat' 2020").replace(/2025/g, '2020');
        nextProduct.description = String(
            nextProduct.description || 'Air Jordan 4 Retro Black Cat 2020. All-black colorway with premium nubuck.'
        ).replace(/2025/g, '2020');
        nextProduct.image = BLACK_CAT_IMAGES[0];
        nextProduct.images = [...BLACK_CAT_IMAGES];
    }

    return nextProduct;
}

export function getProductSizes(product) {
    if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
        return product.sizes.map((entry) => ({
            size: String(entry.size || '').trim(),
            stock: Math.max(0, Number(entry.stock) || 0),
            price: Number(entry.price) || Number(product.price) || 0
        })).filter((entry) => entry.size);
    }

    if (typeof product?.sizes === 'string' && product.sizes.trim()) {
        return product.sizes.split(',').map((size) => ({
            size: size.trim(),
            stock: Math.max(0, Number(product.stock) || 0),
            price: Number(product.price) || 0
        })).filter((entry) => entry.size);
    }

    return [];
}

export function getProductImages(product) {
    const overridden = applyProductOverrides(product);
    if (Array.isArray(overridden?.images) && overridden.images.length > 0) {
        const seen = new Set();
        return overridden.images
            .filter(Boolean)
            .filter((image) => {
                const normalized = normalizeImageKey(image);

                if (seen.has(normalized)) {
                    return false;
                }

                seen.add(normalized);
                return true;
            });
    }
    return overridden?.image ? [overridden.image] : [];
}

function normalizeImageKey(image) {
    const rawValue = String(image || '').trim();
    if (!rawValue) return '';

    try {
        const parsed = new URL(rawValue);
        const segments = parsed.pathname.split('/').filter(Boolean);
        let basename = segments[segments.length - 1] || '';
        basename = basename.replace(/\.[a-z0-9]+$/i, '').toLowerCase();

        if ((parsed.hostname === 'i.imgur.com' || parsed.hostname === 'imgur.com') && basename.length === 8) {
            const suffix = basename.at(-1);
            if (IMGUR_SIZE_SUFFIXES.has(suffix)) {
                basename = basename.slice(0, -1);
            }
        }

        return `${parsed.hostname.toLowerCase()}/${basename}`;
    } catch {
        return rawValue
            .replace(/[?#].*$/, '')
            .replace(/\.[a-z0-9]+$/i, '')
            .toLowerCase();
    }
}

export function getTotalStock(product) {
    const sizes = getProductSizes(product);
    if (sizes.length > 0) {
        return sizes.reduce((sum, entry) => sum + Math.max(0, Number(entry.stock) || 0), 0);
    }
    return Math.max(0, Number(product?.stock) || 0);
}

export function isHidden(product) {
    return Boolean(product?.isHidden);
}

export function isFeatured(product) {
    return Boolean(product?.isFeatured) || Boolean(product?.featured);
}

export function isOutOfStock(product) {
    return Boolean(product?.isOutOfStock) || getTotalStock(product) <= 0;
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export function buildProductHref(product) {
    const overridden = applyProductOverrides(product);
    const id = encodeURIComponent(overridden.id);
    const slug = encodeURIComponent(slugify(overridden.name));
    return `product.html?id=${id}&slug=${slug}`;
}
