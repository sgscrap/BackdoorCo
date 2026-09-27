/**
 * Auth Guard Toggle — Enable/disable admin lockscreens across all admin JS files.
 *
 * Usage:
 *   node scripts/auth-guard-toggle.js on     → Enable auth guards (production)
 *   node scripts/auth-guard-toggle.js off    → Disable auth guards (development)
 *   node scripts/auth-guard-toggle.js status  → Show current state
 */

const fs = require("fs");
const path = require("path");

const ADMIN_DIR = path.join(__dirname, "..", "admin");

// ──────────────────────────────────────────────
// File definitions: each entry has the auth ON and OFF versions
// ──────────────────────────────────────────────

const files = {
  // ── Compact pattern (7 files) ──
  "analytics.js": {
    on: `onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initAnalytics();
});`,
    off: `onAuthStateChanged(auth, user => {
    document.getElementById('userName').textContent = user?.email?.split('@')[0] || 'Admin';
    document.getElementById('userAvatar').textContent = user?.email?.[0]?.toUpperCase() || 'A';
    initAnalytics();
});`,
  },

  "customers.js": {
    on: `onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initCustomers();
});`,
    off: `onAuthStateChanged(auth, user => {
    document.getElementById('userName').textContent = user?.email?.split('@')[0] || 'Admin';
    document.getElementById('userAvatar').textContent = user?.email?.[0]?.toUpperCase() || 'A';
    initCustomers();
});`,
  },

  "dashboard.js": {
    on: `onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initDashboard();
});`,
    off: `onAuthStateChanged(auth, user => {
    document.getElementById('userName').textContent = user?.email?.split('@')[0] || 'Admin';
    document.getElementById('userAvatar').textContent = user?.email?.[0]?.toUpperCase() || 'A';
    initDashboard();
});`,
  },

  "offers.js": {
    on: `onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initOffers();
});`,
    off: `onAuthStateChanged(auth, user => {
    document.getElementById('userName').textContent = user?.email?.split('@')[0] || 'Admin';
    document.getElementById('userAvatar').textContent = user?.email?.[0]?.toUpperCase() || 'A';
    initOffers();
});`,
  },

  "orders.js": {
    on: `onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initOrders();
});`,
    off: `onAuthStateChanged(auth, user => {
    document.getElementById('userName').textContent = user?.email?.split('@')[0] || 'Admin';
    document.getElementById('userAvatar').textContent = user?.email?.[0]?.toUpperCase() || 'A';
    initOrders();
});`,
  },

  "reviews.js": {
    on: `onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    initReviews();
});`,
    off: `onAuthStateChanged(auth, user => {
    document.getElementById('userName').textContent = user?.email?.split('@')[0] || 'Admin';
    document.getElementById('userAvatar').textContent = user?.email?.[0]?.toUpperCase() || 'A';
    initReviews();
});`,
  },

  "settings.js": {
    on: `onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('userName').textContent = user.email.split('@')[0];
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    loadSettings();
    loadBadges();
});`,
    off: `onAuthStateChanged(auth, user => {
    document.getElementById('userName').textContent = user?.email?.split('@')[0] || 'Admin';
    document.getElementById('userAvatar').textContent = user?.email?.[0]?.toUpperCase() || 'A';
    loadSettings();
    loadBadges();
});`,
  },

  // ── Products pattern ──
  "products.js": {
    on: `onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("userName").textContent = user.email.split("@")[0];
  document.getElementById("userAvatar").textContent =
    user.email[0].toUpperCase();

  initProducts();
});`,
    off: `onAuthStateChanged(auth, (user) => {
  document.getElementById("userName").textContent = user?.email?.split("@")[0] || "Admin";
  document.getElementById("userAvatar").textContent =
    user?.email?.[0]?.toUpperCase() || "A";

  initProducts();
});`,
  },

  // ── Restock pattern ──
  "restock.js": {
    on: `onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const name = user.email?.split("@")[0] || "Admin";`,
    off: `onAuthStateChanged(auth, async (user) => {
  const name = user?.email?.split("@")[0] || "Admin";`,
  },

  // ── Social pattern ──
  "social.js": {
    on: `onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const name = user.email?.split("@")[0] || "Admin";`,
    off: `onAuthStateChanged(auth, (user) => {
  const name = user?.email?.split("@")[0] || "Admin";`,
  },

  // ── Admin main page ──
  "admin.js": {
    on: `    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('adminDashboard').classList.remove('hidden');
            renderDashboard();
        } else {
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('adminDashboard').classList.add('hidden');
        }
    });`,
    off: `    auth.onAuthStateChanged(user => {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        renderDashboard();
    });`,
  },
};

// ──────────────────────────────────────────────
// Core logic
// ──────────────────────────────────────────────

function checkStatus(filename) {
  const filePath = path.join(ADMIN_DIR, filename);
  const content = fs.readFileSync(filePath, "utf8");
  const hasGuard = content.includes("if (!user) { window.location.href") ||
                   content.includes("if (!user) {\n    window.location.href") ||
                   content.includes("document.getElementById('loginScreen').classList.remove('hidden')");
  return hasGuard ? "ON" : "OFF";
}

function setAuth(filename, enable) {
  const filePath = path.join(ADMIN_DIR, filename);
  let content = fs.readFileSync(filePath, "utf8");
  const def = files[filename];
  if (!def) return { file: filename, status: "unknown" };

  const current = checkStatus(filename);
  const target = enable ? "ON" : "OFF";

  if (current === target) {
    return { file: filename, status: "unchanged", state: current };
  }

  const from = enable ? def.off : def.on;
  const to = enable ? def.on : def.off;

  if (!content.includes(from)) {
    return { file: filename, status: "error", error: "Could not find expected pattern in file" };
  }

  content = content.replace(from, to);
  fs.writeFileSync(filePath, content, "utf8");
  return { file: filename, status: "toggled", from: current, to: target };
}

// ──────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────

const command = process.argv[2];

if (command === "status") {
  console.log("\n🔐 Auth Guard Status:\n");
  let on = 0, off = 0;
  for (const f of Object.keys(files)) {
    const state = checkStatus(f);
    const icon = state === "ON" ? "🔒" : "🔓";
    console.log(`  ${icon} admin/${f.padEnd(20)} ${state}`);
    if (state === "ON") on++; else off++;
  }
  console.log(`\n  ${on} locked, ${off} unlocked\n`);
} else if (command === "on" || command === "off") {
  const enable = command === "on";
  console.log(`\n${enable ? "🔒 Enabling" : "🔓 Disabling"} auth guards...\n`);
  for (const f of Object.keys(files)) {
    const result = setAuth(f, enable);
    const icon = result.status === "toggled" ? "✅" : result.status === "unchanged" ? "⏭️" : "❌";
    console.log(`  ${icon} admin/${f.padEnd(20)} ${result.status === "toggled" ? `${result.from} → ${result.to}` : result.status}`);
    if (result.error) console.log(`      ${result.error}`);
  }
  console.log("\nDone.\n");
} else {
  console.log(`
Usage: node scripts/auth-guard-toggle.js <command>

Commands:
  on      Enable all auth guards (production mode)
  off     Disable all auth guards (development mode)
  status  Show current state of all admin files
`);
}
