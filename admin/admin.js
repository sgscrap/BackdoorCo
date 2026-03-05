// ══════════════════════════════════════════════════
// BACKDOOR ADMIN — SHARED UTILITIES
// ══════════════════════════════════════════════════
// This module exports shared Firebase instances and helpers.
// Individual page JS files (products.js, orders.js, etc.)
// handle their own auth guards and Firestore listeners.

export { auth, db, storage, analytics } from './firebase-config.js';
