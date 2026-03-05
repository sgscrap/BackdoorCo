const fs = require('fs');
const path = require('path');

const categories = [
    { name: 'Men', file: 'men.html' },
    { name: 'Women', file: 'women.html' },
    { name: 'Kids', file: 'kids.html' },
    { name: 'Shoes', file: 'shoes.html' },
    { name: 'Apparel', file: 'apparel.html' },
    { name: 'Accessories', file: 'accessories.html' },
    { name: 'Electronics', file: 'electronics.html' }
];

const basePath = path.join(__dirname, 'shop-all.html');
const baseHtml = fs.readFileSync(basePath, 'utf8');

categories.forEach(cat => {
    // 1. Update Title
    let newHtml = baseHtml.replace(/<title>Back Door \| Shop All<\/title>/, `<title>Back Door | Shop ${cat.name}</title>`);

    // 2. Remove 'active' from shop-all.html link
    newHtml = newHtml.replace(
        '<a class="nav-link active" href="shop-all.html">SHOP</a>',
        '<a class="nav-link" href="shop-all.html">SHOP</a>'
    );

    // 3. Add 'active' to the specific category link
    const linkRegex = new RegExp(`<a class="nav-link" href="${cat.file}">.*?<\\/a>`);
    newHtml = newHtml.replace(linkRegex, `<a class="nav-link active" href="${cat.file}">${cat.name}</a>`);

    // 4. Inject initialFilter logic before shop-all.js loads
    const scriptInjection = `<script>window.initialFilter = '${cat.name}';</script>\n    <script src="shop-all.js">`;
    newHtml = newHtml.replace('<script src="shop-all.js">', scriptInjection);

    // Write file
    fs.writeFileSync(path.join(__dirname, cat.file), newHtml);
    console.log(`Successfully created ${cat.file}`);
});
