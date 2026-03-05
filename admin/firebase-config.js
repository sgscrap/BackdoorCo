// ══════════════════════════════════════════
// BACKDOOR ADMIN — FIREBASE CONFIG
// ══════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js';

const firebaseConfig = {
    apiKey: "AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw",
    authDomain: "coalition-aec44.firebaseapp.com",
    projectId: "coalition-aec44",
    storageBucket: "coalition-aec44.firebasestorage.app",
    messagingSenderId: "312196142925",
    appId: "1:312196142925:web:ba090f602c8b5a31b20904",
    measurementId: "G-SPJ2FDLSKZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
export default app;
