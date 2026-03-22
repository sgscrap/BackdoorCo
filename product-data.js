export const BLACK_CAT_ALBUM_URL = 'https://imgur.com/a/pV1j1Rn';
export const BLACK_CAT_IMAGES = [
    'https://i.imgur.com/0LaAQgfh.jpg',
    'https://i.imgur.com/0LaAQgf.png'
];

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
        nextProduct.name = String(nextProduct.name || "Jordan 4 Retro 'Black Cat' 2025").replace(/2025/g, '2020');
        nextProduct.image = BLACK_CAT_IMAGES[0];
        nextProduct.images = [...BLACK_CAT_IMAGES];
        nextProduct.albumUrl = BLACK_CAT_ALBUM_URL;
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
        return overridden.images.filter(Boolean);
    }
    return overridden?.image ? [overridden.image] : [];
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
