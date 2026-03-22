import { db } from './admin/firebase-config.js';
import {
    collection,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { mergeVisibleReviews } from './reviews-data.js';

const grid = document.getElementById('reviewsPageGrid');

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

onSnapshot(collection(db, 'reviews'), (snapshot) => {
    const dynamicReviews = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    renderReviewsPage(mergeVisibleReviews(dynamicReviews));
}, () => {
    renderReviewsPage(mergeVisibleReviews([]));
});

function renderReviewsPage(reviews) {
    if (!grid) return;

    if (!reviews.length) {
        grid.innerHTML = '<div class="reviews-empty-state">No reviews are live yet.</div>';
        return;
    }

    grid.innerHTML = reviews.map((review) => `
        <article class="reviews-page-card">
            <div class="reviews-page-main-image">
                ${review.image ? `<img src="${escapeHtml(review.image)}" alt="${escapeHtml(review.name)} review post">` : '<i class="fa-solid fa-camera"></i>'}
            </div>
            <div class="reviews-page-body-card">
                <div class="product-review-card-head">
                    <div>
                        <div class="product-review-name">${escapeHtml(review.name)}</div>
                        <div class="product-review-stars">${'&#9733;'.repeat(review.rating)}</div>
                    </div>
                    <div class="product-review-meta">${escapeHtml(review.productName || 'Backdoor review')}</div>
                </div>
                <p class="product-review-comment">${escapeHtml(review.comment)}</p>
                ${review.images.length > 1 ? `
                    <div class="product-review-gallery product-review-gallery--full">
                        ${review.images.map((image, index) => `
                            <div class="product-review-thumb product-review-thumb--static">
                                <img src="${escapeHtml(image)}" alt="${escapeHtml(review.name)} review image ${index + 1}">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </article>
    `).join('');
}
