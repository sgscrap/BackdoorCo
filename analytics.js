/* ══════════════════════════════════════════
   EMAIL ANALYTICS — CHART ENGINE
══════════════════════════════════════════ */

function renderCharts(days) {
    const opens = document.getElementById('opensChart');
    const clicks = document.getElementById('clicksChart');
    if (!opens) return;

    const count = parseInt(days);
    // Mock data generation
    const dataO = Array.from({ length: count }, () => Math.floor(Math.random() * 80) + 20);
    const dataC = dataO.map(v => Math.floor(v * (Math.random() * 0.2 + 0.05)));

    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const genHtml = (data) => data.map((v, i) => `
        <div class="chart-bar-wrap">
            <div class="chart-bar" style="height: ${v}%">
                <div style="position:absolute; top:-20px; left:50%; transform:translateX(-50%); font-size:9px; color:var(--accent); font-weight:700">
                    ${Math.floor(v * 12)}
                </div>
            </div>
            <div class="chart-label">${labels[i % 7]}</div>
        </div>
    `).join('');

    opens.innerHTML = genHtml(dataO);
    clicks.innerHTML = genHtml(dataC);

    // Also trigger the performance table in email.js if it exists
    if (typeof renderPerfTable === 'function') {
        renderPerfTable();
    }
}

// Initial render if on analytics page
if (window.location.hash === '#analytics') {
    renderCharts('7');
}
