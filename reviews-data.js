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

const BLACK_CAT_REVIEW_FOUR = {
    id: 'seed-black-cat-004',
    name: 'Darius K.',
    productName: "Jordan 4 Retro 'Black Cat' 2020",
    comment: "My fourth pair of these I've ordered for me and family. Awesome shoe and quality.",
    originalComment: "My fourth pair of these I’ve ordered for me and family awesome shoe and quality",
    rating: 5,
    isHidden: false,
    images: [],
    createdAtLabel: 'Verified buyer post'
};

const BLACK_CAT_REVIEW_FIVE = {
    id: 'seed-black-cat-005',
    name: 'Cam R.',
    productName: "Jordan 4 Retro 'Black Cat' 2020",
    comment: 'Amazing shoes and amazing quality. Already wore them and got a lot of compliments. Prefer these over the 2025 version.',
    originalComment: 'amazing shoes and amazing quality already wore them and got a lot of compliments prefer these over the 2025 version',
    rating: 5,
    isHidden: false,
    images: [
        'https://i.imgur.com/FoqfYo7.jpg',
        'https://i.imgur.com/0XR2zFC.jpg',
        'https://i.imgur.com/JUxFWl1.jpg'
    ],
    createdAtLabel: 'Verified buyer post'
};

const BLACK_CAT_REVIEW_SIX = {
    id: 'seed-black-cat-006',
    name: 'OG**',
    productName: "Jordan 4 Retro 'Black Cat' 2020",
    comment: 'Great quality.',
    originalComment: 'Great quality',
    rating: 5,
    isHidden: false,
    images: [],
    createdAtLabel: 'Verified buyer post'
};

const KIDS_TRAVIS_REVIEW_ONE = {
    id: 'seed-kids-travis-001',
    name: 'Ho**',
    productId: 'seed-kids-travis-black-phantom-ps',
    productName: "Travis Scott x Air Jordan 1 Retro Low OG SP PS 'Black Phantom'",
    comment: 'Bought these for my niece and she loved them. I also own a pair. Kick Who did an amazing job!',
    originalComment: 'Bought these for my niece she loved them I also Own a pair kick who did an amazing job !',
    rating: 5,
    isHidden: false,
    images: [],
    createdAtLabel: 'Verified buyer post'
};

const KIDS_TRAVIS_REVIEW_TWO = {
    id: 'seed-kids-travis-002',
    name: 'SN**',
    productId: 'seed-kids-travis-black-phantom-ps',
    productName: "Travis Scott x Air Jordan 1 Retro Low OG SP PS 'Black Phantom'",
    comment: 'Every color, we will be getting.',
    originalComment: 'Every color we will be getting',
    rating: 5,
    isHidden: false,
    images: [],
    createdAtLabel: 'Verified buyer post'
};

const KIDS_TRAVIS_REVIEW_THREE = {
    id: 'seed-kids-travis-003',
    name: 'Jo**',
    productId: 'seed-kids-travis-black-phantom-ps',
    productName: "Travis Scott x Air Jordan 1 Retro Low OG SP PS 'Black Phantom'",
    comment: 'I love these shoes. They are amazing and great quality.',
    originalComment: 'I love this shoes they are amazing and good quality',
    rating: 5,
    isHidden: false,
    images: [],
    createdAtLabel: 'Verified buyer post'
};

const KIDS_TRAVIS_REVIEW_FOUR = {
    id: 'seed-kids-travis-004',
    name: 'Ch**',
    productId: 'seed-kids-travis-black-phantom-ps',
    productName: "Travis Scott x Air Jordan 1 Retro Low OG SP PS 'Black Phantom'",
    comment: 'Very nice quality!!!',
    originalComment: 'Very nice quality!!!',
    rating: 5,
    isHidden: false,
    images: [
        'https://i.imgur.com/NgAQV5e.jpg',
        'https://i.imgur.com/ki6ctgF.jpg'
    ],
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
        normalizeReview(BLACK_CAT_REVIEW_THREE),
        normalizeReview(BLACK_CAT_REVIEW_FOUR),
        normalizeReview(BLACK_CAT_REVIEW_FIVE),
        normalizeReview(BLACK_CAT_REVIEW_SIX),
        normalizeReview(KIDS_TRAVIS_REVIEW_ONE),
        normalizeReview(KIDS_TRAVIS_REVIEW_TWO),
        normalizeReview(KIDS_TRAVIS_REVIEW_THREE),
        normalizeReview(KIDS_TRAVIS_REVIEW_FOUR)
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
