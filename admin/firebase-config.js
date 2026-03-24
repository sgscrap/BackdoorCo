// 🔐 BACKDOOR ADMIN - FIREBASE CONFIGURATION
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw",
    authDomain: "backdoorco.xyz",
    projectId: "coalition-aec44",
    storageBucket: "coalition-aec44.firebasestorage.app",
    messagingSenderId: "312196142925",
    appId: "1:312196142925:web:ba090f602c8b5a31b20904",
    measurementId: "G-SPJ2FDLSKZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// For legacy compatibility if any script still expects a global firebaseConfig
window.firebaseConfig = firebaseConfig;
