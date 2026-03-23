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

const DEFAULT_ADULT_SIZE_OPTIONS = ['US 7', 'US 7.5', 'US 8', 'US 8.5', 'US 9', 'US 9.5', 'US 10', 'US 10.5', 'US 11', 'US 11.5', 'US 12', 'US 13', 'US 14', 'US 15'];

const SEEDED_PRODUCTS = [
    {
        id: 'seed-kobe-5-alternate-bruce-lee',
        name: "Nike Zoom Kobe 5 Protro 'Alternate Bruce Lee'",
        sku: 'CD4991-101',
        price: 770,
        brand: 'Nike',
        category: 'Sneakers',
        colorway: 'White/Black/Varsity Maize',
        description: "The Nike Zoom Kobe 5 Protro 'Alternate Bruce Lee' flips the iconic Bruce Lee-inspired color blocking with a bold white and varsity maize upper, sharp black detailing, and red slash marks near the heel. The low-cut silhouette keeps the responsive Protro tooling and close-to-court feel that made the Kobe 5 a standout on and off the hardwood.",
        image: 'https://slamdunk.shop/wp-content/uploads/2020/10/Nike-Zoom-Kobe-5-Protro-Alternate-Bruce-Lee.jpg',
        images: [
            'https://slamdunk.shop/wp-content/uploads/2020/10/Nike-Zoom-Kobe-5-Protro-Alternate-Bruce-Lee.jpg',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/656/original/639895_02.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/657/original/639895_03.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/659/original/639895_04.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/660/original/639895_05.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/662/original/639895_06.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/667/original/639895_07.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/668/original/639895_08.jpg.jpeg?action=crop&width=600'
        ],
        imageFit: 'contain',
        imagePosition: '50% 54%',
        imageScale: 1.14,
        sizes: [
            { size: 'US 8', stock: 0, price: 770 },
            { size: 'US 8.5', stock: 0, price: 770 },
            { size: 'US 9', stock: 0, price: 770 },
            { size: 'US 9.5', stock: 0, price: 770 },
            { size: 'US 10', stock: 0, price: 770 },
            { size: 'US 10.5', stock: 0, price: 770 },
            { size: 'US 11', stock: 0, price: 770 },
            { size: 'US 11.5', stock: 0, price: 770 },
            { size: 'US 12', stock: 0, price: 770 },
            { size: 'US 13', stock: 0, price: 770 },
            { size: 'US 14', stock: 0, price: 770 },
            { size: 'US 15', stock: 0, price: 770 }
        ],
        releaseDate: '11/24/2020',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-yeezy-slide-onyx',
        name: "adidas Yeezy Slide 'Onyx'",
        sku: 'HQ6448',
        price: 95,
        brand: 'Adidas',
        category: 'Shoes',
        colorway: 'Onyx/Onyx/Onyx',
        description: 'First revealed in February 2022 at the Donda 2 listening event in Miami, the adidas Yeezy Slide Onyx features an all-black foam construction with a soft footbed for comfort. At the base, a grooved outsole adds stability and responsiveness.\n\nThe adidas Yeezy Slide Onyx released in March 2022 and retailed for $60.',
        image: 'https://th.bing.com/th/id/R.c356107b2c0e982d8d644ea915405af3?rik=0GDK68hC3SC07g&riu=http%3a%2f%2fsneakerdogg.com%2fcdn%2fshop%2ffiles%2fadidas-Yeezy-Slide-Onyx-_2022-2023_-_HQ6448_1200x1200.png%3fv%3d1707820786&ehk=50xxt8sQQtiCFjIfgcQWRSEPxUMxygKuIjml0alOtiw%3d&risl=&pid=ImgRaw&r=0',
        cardImage: 'https://th.bing.com/th/id/R.c356107b2c0e982d8d644ea915405af3?rik=0GDK68hC3SC07g&riu=http%3a%2f%2fsneakerdogg.com%2fcdn%2fshop%2ffiles%2fadidas-Yeezy-Slide-Onyx-_2022-2023_-_HQ6448_1200x1200.png%3fv%3d1707820786&ehk=50xxt8sQQtiCFjIfgcQWRSEPxUMxygKuIjml0alOtiw%3d&risl=&pid=ImgRaw&r=0',
        images: [
            'https://th.bing.com/th/id/R.c356107b2c0e982d8d644ea915405af3?rik=0GDK68hC3SC07g&riu=http%3a%2f%2fsneakerdogg.com%2fcdn%2fshop%2ffiles%2fadidas-Yeezy-Slide-Onyx-_2022-2023_-_HQ6448_1200x1200.png%3fv%3d1707820786&ehk=50xxt8sQQtiCFjIfgcQWRSEPxUMxygKuIjml0alOtiw%3d&risl=&pid=ImgRaw&r=0',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/072/273/667/original/884794_01.jpg.jpeg?action=crop&width=750',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/072/273/660/original/884794_04.jpg.jpeg?action=crop&width=750',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/072/273/670/original/884794_02.jpg.jpeg?action=crop&width=750',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/072/273/659/original/884794_03.jpg.jpeg?action=crop&width=750'
        ],
        imageFit: 'contain',
        imagePosition: '50% 62%',
        imageScale: 1.24,
        sizes: [
            { size: 'US 4', stock: 0, price: 95 },
            { size: 'US 5', stock: 0, price: 95 },
            { size: 'US 6', stock: 0, price: 95 },
            { size: 'US 7', stock: 0, price: 95 },
            { size: 'US 8', stock: 0, price: 95 },
            { size: 'US 9', stock: 0, price: 95 },
            { size: 'US 10', stock: 0, price: 95 },
            { size: 'US 11', stock: 0, price: 95 },
            { size: 'US 12', stock: 0, price: 95 },
            { size: 'US 13', stock: 0, price: 95 },
            { size: 'US 14', stock: 0, price: 95 }
        ],
        releaseDate: '03/07/2022',
        restockDate: '07/15/2024',
        retailPrice: 60,
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-men-travis-velvet-brown',
        name: "Godkiller Travis Scott x Air Jordan 1 Low OG SP 'Velvet Brown'",
        sku: 'DM7866-202',
        price: 600,
        brand: 'Jordan',
        category: 'Sneakers',
        colorway: 'Velvet Brown/Black',
        description: "The Travis Scott x Air Jordan 1 Retro Low OG SP 'Velvet Brown' showcases Scott's signature reverse Swoosh on the black tumbled leather and brown suede upper. A woven Nike Air tag sits atop the brown nylon tongue, while mismatched Cactus Jack and Jordan Wings branding adorns the back tab of each shoe. Anchoring the sneaker is a brown rubber cupsole with stitched sidewall construction and an encapsulated Air-sole unit in the heel.",
        image: buildImgurImageUrl('ZOrZEnt'),
        images: [
            buildImgurImageUrl('ZOrZEnt'),
            buildImgurImageUrl('rAHE2Iv'),
            buildImgurImageUrl('TkQdpuE'),
            buildImgurImageUrl('4pdSP5S'),
            buildImgurImageUrl('QfIJ0PC'),
            buildImgurImageUrl('YZfxHKh'),
            buildImgurImageUrl('iDo2IAJ'),
            buildImgurImageUrl('IHVvC6S'),
            buildImgurImageUrl('gU63WYa'),
            buildImgurImageUrl('tr5UsUI'),
            buildImgurImageUrl('PYEiLrz')
        ],
        imageFit: 'contain',
        imagePosition: '50% 58%',
        imageScale: 1.28,
        sizes: [
            { size: 'US 12.5', stock: 1, price: 250 }
        ],
        releaseDate: 'TBD',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-men-travis-black-phantom',
        name: "Travis Scott x Air Jordan 1 Retro Low OG SP 'Black Phantom'",
        sku: 'DM7866 001',
        price: 250,
        brand: 'Jordan',
        category: 'Sneakers',
        colorway: 'Black/Phantom/University Red',
        description: "The Travis Scott x Air Jordan 1 Retro Low OG SP 'Black Phantom' brings La Flame's signature reverse Swoosh to a stealthy black suede build with contrast white stitching throughout. A woven Nike Air tag lands on the tongue, while mismatched Cactus Jack and Jordan Wings branding finish the heel tabs. University Red detailing adds a subtle hit of color to the monochrome low-top.",
        image: 'https://tse1.mm.bing.net/th/id/OIP.rOgfg8KHJ4brBJSX81xQXAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3',
        images: [
            'https://tse1.mm.bing.net/th/id/OIP.rOgfg8KHJ4brBJSX81xQXAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/983/original/1006990_01.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/986/original/1006990_02.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/985/original/1006990_03.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/987/original/1006990_04.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/988/original/1006990_05.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/990/original/1006990_06.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/991/original/1006990_07.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/992/original/1006990_08.jpg.jpeg?action=crop&width=600'
        ],
        imageFit: 'contain',
        imagePosition: '50% 60%',
        imageScale: 1.24,
        sizes: DEFAULT_ADULT_SIZE_OPTIONS.map((size) => ({
            size,
            stock: 1,
            price: 600
        })),
        releaseDate: '12/15/2022',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
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

function matchesVelvetBrown(product) {
    const id = String(product?.id || '').toLowerCase();
    const name = String(product?.name || '').toLowerCase();
    return id === 'seed-men-travis-velvet-brown' || (name.includes('travis scott') && name.includes('velvet brown'));
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
        nextProduct.backorderLeadTime = nextProduct.backorderLeadTime || 'Ships in 1.5-2 weeks';
        const basePrice = Number(nextProduct.price) || 0;
        const existingSizeMap = new Map((Array.isArray(nextProduct.sizes) ? nextProduct.sizes : []).map((entry) => [String(entry?.size || '').trim(), entry]));
        nextProduct.sizes = DEFAULT_ADULT_SIZE_OPTIONS.map((size) => {
            const current = existingSizeMap.get(size) || {};
            const inStock = size === 'US 10';
            return {
                size,
                stock: inStock ? Math.max(1, Number(current.stock) || 1) : 0,
                price: Number(current.price) || basePrice,
                backorder: !inStock,
                backorderLeadTime: nextProduct.backorderLeadTime
            };
        });
    }

    return nextProduct;
}

export function getProductSizes(product) {
    if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
        return product.sizes.map((entry) => ({
            size: String(entry.size || '').trim(),
            stock: Math.max(0, Number(entry.stock) || 0),
            price: Number(entry.price) || Number(product.price) || 0,
            backorder: Boolean(entry.backorder),
            backorderLeadTime: String(entry.backorderLeadTime || product?.backorderLeadTime || '').trim()
        })).filter((entry) => entry.size);
    }

    if (typeof product?.sizes === 'string' && product.sizes.trim()) {
        return product.sizes.split(',').map((size) => ({
            size: size.trim(),
            stock: Math.max(0, Number(product.stock) || 0),
            price: Number(product.price) || 0,
            backorder: Boolean(product?.allowBackorder),
            backorderLeadTime: String(product?.backorderLeadTime || '').trim()
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

export function getProductCardImage(product) {
    const overridden = applyProductOverrides(product);
    return String(overridden?.cardImage || '').trim() || getProductImages(overridden)[0] || '';
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

export function hasInStockSizes(product) {
    return getProductSizes(product).some((entry) => entry.stock > 0);
}

export function hasBackorderSizes(product) {
    return Boolean(product?.allowBackorder) || getProductSizes(product).some((entry) => Boolean(entry.backorder));
}

export function isBackorder(product, sizeEntry) {
    if (sizeEntry) {
        return Boolean(sizeEntry?.backorder) || (Boolean(product?.allowBackorder) && Math.max(0, Number(sizeEntry?.stock) || 0) <= 0);
    }
    return Boolean(product?.allowBackorder);
}

export function isBackorderOnly(product) {
    return hasBackorderSizes(product) && !hasInStockSizes(product);
}

export function getBackorderLeadTime(product, sizeEntry) {
    return String(sizeEntry?.backorderLeadTime || product?.backorderLeadTime || 'Ships in 1.5-2 weeks').trim();
}

export function isOutOfStock(product) {
    if (hasBackorderSizes(product)) return false;
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
    if (matchesVelvetBrown(product)) return 1.28;
    if (isFootwearProduct(product)) return 1.08;
    return 1;
}

export function getProductCardImagePadding(product) {
    if (String(product?.imageFit || '').toLowerCase() === 'cover') return '0';
    if (matchesBlackCat(product)) return '2px';
    if (matchesKidsTravisBlackPhantom(product)) return '2px';
    if (matchesVelvetBrown(product)) return '2px';
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
