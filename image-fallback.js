// ================================
// image-fallback.js
// Branded fallback for broken catalogue / review images.
// Swaps a failed <img> to the branded placeholder exactly once and then
// detaches, so a dead URL can never trigger an endless error loop.
// Loaded as a classic script (no module) so the global is available to both
// inline onerror attributes and module-rendered markup.
// ================================
(function () {
    'use strict';

    // Resolve the placeholder against this script's own URL so the fallback
    // also works from sub-directory pages (e.g. /portal/).
    var PLACEHOLDER = 'products/catalog/image-unavailable.svg';
    try {
        var self = document.currentScript && document.currentScript.src;
        if (self) PLACEHOLDER = new URL('products/catalog/image-unavailable.svg', self).href;
    } catch (e) { /* keep the root-relative default */ }

    function catalogImageFallback(img) {
        if (!img || img.dataset.catalogFallback === 'applied') return;
        img.dataset.catalogFallback = 'applied';
        img.removeAttribute('srcset');
        img.onerror = null;
        img.removeAttribute('onerror');
        img.src = PLACEHOLDER;
        if (img.classList) img.classList.add('catalog-image-fallback');
    }

    window.catalogImageFallback = catalogImageFallback;
    window.CATALOG_IMAGE_PLACEHOLDER = PLACEHOLDER;
})();
