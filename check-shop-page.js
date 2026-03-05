const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            defaultViewport: {
                width: 1920,
                height: 1080
            }
        });

        const page = await browser.newPage();

        // Go to shop all page via local server
        await page.goto('http://localhost:3000/shop-all.html', {
            waitUntil: 'networkidle2'
        });

        // Wait a small amount for the firebase snapshot to resolve
        await new Promise(r => setTimeout(r, 1500));

        await page.screenshot({
            path: 'shop-all-layout.png',
            fullPage: true
        });

        console.log("Screenshot saved.");
        await browser.close();
        process.exit(0);

    } catch (e) {
        console.error("Puppeteer error:", e);
        process.exit(1);
    }
})();
