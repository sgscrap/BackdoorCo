export const BLACK_CAT_IMAGES = [
    'https://i.imgur.com/RK5BAet.jpg',
    'https://i.imgur.com/0LaAQgf.png',
    'https://i.imgur.com/3K8TkzE.png',
    'https://i.imgur.com/q7uV2MM.png',
    'https://i.imgur.com/XAzKOl2.png',
    'https://i.imgur.com/o4zCCXe.png',
    'https://i.imgur.com/ckIfHxm.png',
    'https://i.imgur.com/RiQyQS4.png'
];

function buildImgurImageUrl(id, extension = 'jpg') {
    return `https://i.imgur.com/${id}.${extension}`;
}

const SEEDED_PRODUCTS = [
    {
        id: 'seed-kids-travis-black-phantom-ps',
        name: "Travis Scott x Air Jordan 1 Retro Low OG SP PS 'Black Phantom'",
        sku: 'DO5442-001',
        price: 180,
        brand: 'Jordan',
        category: 'Kids',
        colorway: 'Black/Black',
        description: "Offered in little kid sizing, the Travis Scott x Air Jordan 1 Retro Low OG SP PS 'Black Phantom' combines a sleek finish with La Flame's signature touches. The low-top sports an all-black nubuck and suede upper with contrast white stitching throughout. Scott's backward Swoosh decorates the lateral side, while woven Nike tags embellish each tongue. Mismatched heel tabs display a Jordan Wings logo on the right shoe and a bee graphic on the left. Anchoring the sneaker is a black rubber cupsole with stitched sidewall construction.",
        image: buildImgurImageUrl('30H5NyD'),
        images: [
            buildImgurImageUrl('30H5NyD'),
            buildImgurImageUrl('UutZVxq'),
            buildImgurImageUrl('israMgv'),
            buildImgurImageUrl('FXy3W3z'),
            buildImgurImageUrl('bG5UpTh'),
            buildImgurImageUrl('PNAbX10')
        ],
        imageFit: 'contain',
        imagePosition: 'center center',
        sizes: [
            { size: '12.5C', stock: 1, price: 180 }
        ],
        releaseDate: 'TBD',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    }
];

const IMGUR_SIZE_SUFFIXES = new Set(['s', 'b', 't', 'm', 'l', 'h']);

function matchesBlackCat(product) {
    const name = String(product?.name || '').toLowerCase();
    const sku = String(product?.sku || '').toLowerCase();
    return (name.includes('jordan 4 retro') && name.includes('black cat')) || sku === 'fv5029 010';
}

function matchesKidsTravisBlackPhantom(product) {
    const id = String(product?.id || '').toLowerCase();
    const name = String(product?.name || '').toLowerCase();
    return id === 'seed-kids-travis-black-phantom-ps' || (name.includes('travis scott') && name.includes('black phantom'));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

const LEGACY_IMAGE_POSITIONS = {
    'center center': [50, 50],
    'center top': [50, 18],
    'center bottom': [50, 82],
    'left center': [24, 50],
    'right center': [76, 50]
};

function isFootwearProduct(product) {
    const category = String(product?.category || '').toLowerCase();
    const brand = String(product?.brand || '').toLowerCase();
    const name = String(product?.name || '').toLowerCase();
    return (
        ['sneakers', 'shoes', 'footwear'].includes(category) ||
        name.includes('jordan') ||
        name.includes('dunk') ||
        name.includes('air max') ||
        name.includes('yeezy') ||
        (brand === 'jordan' && category !== 'apparel')
    );
}

export function applyProductOverrides(product) {
    if (!product) return product;

    const nextProduct = {
        ...product,
        price: Number(product.price) || 0
    };

    if (matchesBlackCat(nextProduct)) {
        nextProduct.name = String(nextProduct.name || "Jordan 4 Retro 'Black Cat' 2020").replace(/2025/g, '2020');
        nextProduct.description = "Jordan Brand brings back a mid-2000s classic with the Jordan 4 Black Cat (2020), now available on StockX. Originally debuting in 2006, this is the first time the Black Cat colorway has seen a retro. The fourteen year Black Cat drought has officially ended.\n\nThis Jordan 4 is composed of a black nubuck suede upper with matching detailing. Black hardware, netting, and outsoles complete the design. These sneakers released in January 2020 and retailed for $190.";
        nextProduct.image = BLACK_CAT_IMAGES[0];
        nextProduct.images = [...BLACK_CAT_IMAGES];
        nextProduct.imageFit = nextProduct.imageFit || 'contain';
        nextProduct.imagePosition = nextProduct.imagePosition || 'center center';
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

export function getProductImageFit(product) {
    const value = String(product?.imageFit || '').toLowerCase();
    if (value === 'contain') return 'contain';
    if (value === 'cover') return 'cover';
    return isFootwearProduct(product) ? 'contain' : 'cover';
}

export function getProductImagePosition(product) {
    const rawX = Number(product?.imageOffsetX);
    const rawY = Number(product?.imageOffsetY);
    if (Number.isFinite(rawX) && Number.isFinite(rawY)) {
        return `${clamp(rawX, 0, 100)}% ${clamp(rawY, 0, 100)}%`;
    }

    const value = String(product?.imagePosition || '').trim().toLowerCase();
    if (LEGACY_IMAGE_POSITIONS[value]) {
        const [x, y] = LEGACY_IMAGE_POSITIONS[value];
        return `${x}% ${y}%`;
    }

    const match = value.match(/^(-?\d{1,3}(?:\.\d+)?)%\s+(-?\d{1,3}(?:\.\d+)?)%$/);
    if (match) {
        return `${clamp(Number(match[1]), 0, 100)}% ${clamp(Number(match[2]), 0, 100)}%`;
    }

    return '50% 50%';
}

export function getProductCardImageScale(product) {
    const explicit = Number(product?.imageScale);
    if (Number.isFinite(explicit) && explicit >= 0.8 && explicit <= 1.5) {
        return explicit;
    }
    if (matchesBlackCat(product)) return 1.16;
    if (matchesKidsTravisBlackPhantom(product)) return 1.12;
    if (isFootwearProduct(product)) return 1.08;
    return 1;
}

export function getProductCardImagePadding(product) {
    if (String(product?.imageFit || '').toLowerCase() === 'cover') return '0';
    if (matchesBlackCat(product)) return '2px';
    if (matchesKidsTravisBlackPhantom(product)) return '2px';
    return isFootwearProduct(product) ? '4px' : '0';
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

function getProductMatchKey(product) {
    const sku = String(product?.sku || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (sku) return `sku:${sku}`;
    return `name:${slugify(product?.name || '')}`;
}

export function getSeededProducts() {
    return SEEDED_PRODUCTS.map((product) => applyProductOverrides(product));
}

export function mergeCatalogProducts(products = []) {
    const merged = new Map();

    getSeededProducts().forEach((product) => {
        merged.set(product.id, product);
    });

    products.forEach((product) => {
        const overridden = applyProductOverrides(product);
        const matchKey = getProductMatchKey(overridden);
        const seededMatch = [...merged.values()].find((entry) => getProductMatchKey(entry) === matchKey);

        if (seededMatch) {
            merged.delete(seededMatch.id);
        }

        merged.set(overridden.id, overridden);
    });

    return [...merged.values()];
}
