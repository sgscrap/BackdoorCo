const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1920,1080'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: 'homepage-most-wanted.png', fullPage: true });
    console.log('Homepage screenshot saved.');
    await browser.close();
})().catch(e => console.error(e.message));
