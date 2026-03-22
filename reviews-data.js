const BLACK_CAT_REVIEW = {
    id: 'seed-black-cat-001',
    name: 'Je***',
    productName: "Jordan 4 Retro 'Black Cat' 2020",
    comment: 'THE BEST BLACK CAT \u2764\uFE0F',
    originalComment: 'THE BEST BLACK CAT \u2764\uFE0F',
    rating: 5,
    isHidden: false,
    images: [
        'https://i.imgur.com/VNqnsef.jpg',
        'https://i.imgur.com/aP7Rpac.jpg',
        'https://i.imgur.com/Au4g6uI.jpg'
    ],
    createdAtLabel: 'Verified buyer post'
};

const BLACK_CAT_REVIEW_TWO = {
    id: 'seed-black-cat-002',
    name: 'YN***',
    productName: "Jordan 4 Retro 'Black Cat' 2020",
    comment: 'Fast shipping! Best quality! Simply the best! My little brother will be happy! Thanks again.',
    originalComment: "Fast shipping! best quality! simply the best ! my little brother will be happy! thanks again'",
    rating: 5,
    isHidden: false,
    images: [
        'https://i.imgur.com/8dtgMtK.jpg',
        'https://i.imgur.com/gFB1ti2.jpg',
        'https://i.imgur.com/yEu1MgJ.jpg'
    ],
    createdAtLabel: 'Verified buyer post'
};

const BLACK_CAT_REVIEW_THREE = {
    id: 'seed-black-cat-003',
    name: 'Mi**',
    productName: "Jordan 4 Retro 'Black Cat' 2020",
    comment: 'True to size, amazing quality, incredible. 10/10. Fast shipping.',
    originalComment: 'true to size amazing quality, incredible, 10/10 , Fast shipping',
    rating: 5,
    isHidden: false,
    images: [],
    createdAtLabel: 'Verified buyer post'
};

function normalizeReview(review) {
    const images = Array.isArray(review?.images)
        ? review.images.filter(Boolean)
        : [review?.image].filter(Boolean);

    return {
        ...review,
        name: String(review?.name || 'Anonymous').trim() || 'Anonymous',
        productName: String(review?.productName || '').trim(),
        comment: String(review?.comment || review?.originalComment || '').trim(),
        originalComment: String(review?.originalComment || review?.comment || '').trim(),
        rating: Math.min(5, Math.max(1, Number(review?.rating) || 5)),
        isHidden: Boolean(review?.isHidden),
        images,
        image: images[0] || ''
    };
}

export function getSeededReviews() {
    return [
        normalizeReview(BLACK_CAT_REVIEW),
        normalizeReview(BLACK_CAT_REVIEW_TWO),
        normalizeReview(BLACK_CAT_REVIEW_THREE)
    ];
}

export function reviewMatchesProduct(review, product) {
    const reviewName = String(review?.productName || '').toLowerCase();
    const productName = String(product?.name || '').toLowerCase();
    const productId = String(product?.id || '').toLowerCase();
    const reviewProductId = String(review?.productId || '').toLowerCase();

    if (reviewProductId && productId && reviewProductId === productId) return true;
    if (reviewName && productName && reviewName === productName) return true;

    const isBlackCatReview = reviewName.includes('black cat');
    const isBlackCatProduct = productName.includes('black cat');
    return isBlackCatReview && isBlackCatProduct;
}

export function mergeVisibleReviews(dynamicReviews = []) {
    const merged = [...getSeededReviews(), ...dynamicReviews.map(normalizeReview)];
    const seen = new Set();

    return merged.filter((review) => {
        const key = String(review.id || `${review.name}|${review.comment}`).toLowerCase();
        if (review.isHidden || !review.comment) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
