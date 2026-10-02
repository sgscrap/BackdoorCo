// portal/portal.js
//
// Auth-gated read-only view of the `restock_ideas` Firestore collection.
// Hard gate: Firebase Auth + custom-claim admin. Soft gate: <meta robots>
// noindex set in index.html. Recommended deployment: keep /portal/ *off* the
// public sitemap.xml + footer links.

(function () {
  'use strict';

  if (!window.firebase || !window.firebaseConfig) {
    document.getElementById('portalLoading').textContent =
      'Firebase SDK failed to load.';
    return;
  }

  firebase.initializeApp(window.firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  const loadingEl = document.getElementById('portalLoading');
  const contentEl = document.getElementById('portalContent');
  const gridEl = document.getElementById('portalGrid');
  const searchEl = document.getElementById('portalSearch');
  const countEl = document.getElementById('portalCount');

  let allIdeas = [];
  let unsubscribe = null;

  // ----- auth + admin claim gate ------------------------------------------
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      loadingEl.innerHTML = 'Please sign in via <code>/admin/</code> to view the Portal.';
      return;
    }
    let isAdmin = false;
    try {
      const tok = await user.getIdTokenResult(true);
      isAdmin = !!tok.claims.admin;
    } catch (_) { /* fall through */ }
    if (!isAdmin) {
      loadingEl.textContent = 'Access denied. This Portal is admin-only.';
      return;
    }
    startListening();
  });

  // ----- Firestore listener ------------------------------------------------
  function startListening() {
    loadingEl.style.display = 'none';
    contentEl.style.display = '';
    if (unsubscribe) unsubscribe();
    unsubscribe = db
      .collection('restock_ideas')
      .orderBy('updatedAt', 'desc')
      .onSnapshot(
        (snap) => {
          allIdeas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          render();
        },
        (err) => {
          gridEl.innerHTML = '<div class="portal-empty"><h2>Could not load restock ideas</h2><div>' + escapeHtml(err.message) + '</div></div>';
        }
      );
  }

  // ----- search + render ---------------------------------------------------
  searchEl?.addEventListener('input', render);

  function render() {
    if (!gridEl) return;
    const q = (searchEl?.value || '').toLowerCase().trim();
    const filtered = !q
      ? allIdeas
      : allIdeas.filter((d) => {
          return (
            (d.title || '').toLowerCase().includes(q) ||
            (d.brand || '').toLowerCase().includes(q) ||
            (d.status || '').toLowerCase().includes(q) ||
            (Array.isArray(d.targetSizes) ? d.targetSizes.join(' ') : '').toLowerCase().includes(q)
          );
        });

    countEl.textContent = filtered.length + ' / ' + allIdeas.length + ' ideas';

    if (!filtered.length) {
      gridEl.innerHTML =
        '<div class="portal-empty"><h2>No restock ideas match your search</h2>' +
        '<div>Add the first one from the <a href="../admin/restock.html">Restock Desk</a> →</div></div>';
      return;
    }

    gridEl.innerHTML = filtered.map(buildCardHtml).join('');
  }

  // ----- card markup -------------------------------------------------------
  function buildCardHtml(d) {
    const title = d.title || d.productName || 'Untitled';
    const brand = d.brand || '';
    const image = d.image || d.cardImage || '';
    const retailPrice = num(d.retailPrice ?? d.targetRetailPrice ?? d.targetPrice);
    const retailStrike = num(d.retailOldPrice ?? d.retailComparePrice);
    const sourcingPrice = num(d.purchaseCost ?? d.sourcingCost);
    const retailUrl = d.retailUrl || '';
    const sourcingUrl = d.purchaseUrl || d.sourcingUrl || '';
    const sizes = Array.isArray(d.targetSizes) ? d.targetSizes : [];
    const status = d.status || 'Watching';
    const statusKey = String(status).toLowerCase().replace(/[^a-z]/g, '') || 'watching';
    const updatedAt = d.updatedAt || d.createdAt;
    const updatedDate = formatDate(updatedAt);
    const updatedAgo = formatRelative(updatedAt);
    const marginAbs = (sourcingPrice != null && retailPrice != null) ? (retailPrice - sourcingPrice) : null;
    const marginPct = (marginAbs != null && retailPrice > 0) ? Math.round((marginAbs / retailPrice) * 100) : null;

    const img = image
      ? '<img src="' + escapeHtml(image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="catalogImageFallback(this);">'
      : 'No image yet';

    return (
      '<article class="portal-card">' +
        '<div class="img-wrap">' + img + '</div>' +
        '<div class="body">' +
          (brand ? '<div class="brand">' + escapeHtml(brand) + '</div>' : '') +
          '<div class="title">' + escapeHtml(title) + '</div>' +
          '<div class="price-row">' +
            '<span class="retail-price">' + formatMoney(retailPrice, d.currency) + '</span>' +
            (retailStrike ? '<span class="retail-strike">' + formatMoney(retailStrike, d.currency) + '</span>' : '') +
            (marginAbs != null
              ? '<span class="margin-line ' + (marginAbs < 0 ? 'negative' : 'positive') + '">' +
                (marginAbs < 0 ? '▼' : '▲') + ' ' + formatMoney(marginAbs, d.currency) +
                (marginPct != null ? ' (' + marginPct + '%)' : '') +
                '</span>'
              : '') +
          '</div>' +
          '<div class="meta-line">' +
            (sizes.length ? '<span class="pill">' + escapeHtml(sizes.slice(0, 6).join(' · ')) + (sizes.length > 6 ? ' +' + (sizes.length - 6) : '') + '</span>' : '') +
            '<span class="pill status-' + escapeHtml(statusKey) + '">' + escapeHtml(status) + '</span>' +
            (updatedAgo ? '<span class="pill pill-time" title="' + escapeHtml(updatedDate) + '">' + escapeHtml(updatedAgo) + '</span>' : '') +
          '</div>' +
          '<div class="links">' +
            (retailUrl ? '<a class="btn primary" href="' + escapeHtml(retailUrl) + '" target="_blank" rel="noopener noreferrer">Retail ↗</a>' : '') +
            (sourcingUrl ? '<a class="btn" href="' + escapeHtml(sourcingUrl) + '" target="_blank" rel="noopener noreferrer">Source ↗</a>' : '') +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  // ----- helpers -----------------------------------------------------------
  function num(v) {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function formatMoney(n, currency) {
    if (n == null) return '—';
    const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
    return symbol + n.toFixed(2);
  }
  function formatDate(ts) {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
      if (isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    } catch { return ''; }
  }
  function formatRelative(ts) {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
      if (isNaN(d.getTime())) return '';
      const diff = Date.now() - d.getTime();
      if (diff < 0) return 'just now';
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + 'm ago';
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + 'h ago';
      const days = Math.floor(hrs / 24);
      if (days < 30) return days + 'd ago';
      const months = Math.floor(days / 30);
      if (months < 12) return months + 'mo ago';
      return Math.floor(months / 12) + 'y ago';
    } catch { return ''; }
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
})();
