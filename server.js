const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(cors());

// Also serve static files so we don't need http-server
app.use(express.static(__dirname));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'products'));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        let name = req.body.name || 'uploaded-product';
        name = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
        cb(null, `${name}${ext}`);
    }
});
const upload = multer({ storage: storage });

function updateArrayInFile(filename, productObj, variableName) {
    const fullPath = path.join(__dirname, filename);
    let content = fs.readFileSync(fullPath, 'utf-8');

    // Convert new product to string
    const stringified = JSON.stringify(productObj, null, 4);
    // Indent
    const indented = stringified.split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n');
    const insertStr = '\n    ' + indented + ',';

    // Regex to find `const/let [varName] = [`
    const regex = new RegExp(`(?:const|let)\\s+${variableName}\\s*=\\s*\\[`);
    const match = content.match(regex);
    if (!match) return;

    const insertPos = match.index + match[0].length;

    // Insert new product at position
    const newContent = content.slice(0, insertPos) + insertStr + content.slice(insertPos);

    fs.writeFileSync(fullPath, newContent);
}

app.post('/api/products', upload.single('imageFile'), (req, res) => {
    try {
        let sizes = [];
        try {
            sizes = JSON.parse(req.body.sizes);
        } catch (err) { }

        const id = parseInt(req.body.id) || Date.now();
        const price = parseFloat(req.body.price) || 0;
        const category = req.body.category || 'Sneakers';
        const brand = req.body.brand;
        const name = req.body.name;

        let imagePath = 'products/placeholder.jpg';
        if (req.file) {
            imagePath = 'products/' + req.file.filename;
        }

        const productAppAndAdmin = {
            id,
            name,
            brand,
            price,
            sku: req.body.sku || '',
            colorway: req.body.colorway || 'Default',
            releaseDate: new Date().toLocaleDateString('en-US'),
            category,
            badge: "new",
            sizes,
            description: req.body.description || '',
            image: imagePath,
            images: [imagePath]
        };

        const emoji = category.toLowerCase() === 'apparel' ? '👕' : '👟';

        // For checkout.js
        const productCheckout = {
            id,
            emoji,
            brand,
            name,
            price,
            retail: price,
            badge: 'new',
            sizes: sizes.map(s => ({ s: s.size, stock: s.stock }))
        };

        // For accounts.js
        const productAccounts = {
            id,
            name,
            brand,
            price,
            emoji,
            sku: productAppAndAdmin.sku
        };

        updateArrayInFile('app.js', productAppAndAdmin, 'products');

        // Admin JS adds a "status" field optionally
        productAppAndAdmin.status = "active";
        updateArrayInFile('admin.js', productAppAndAdmin, 'products');

        updateArrayInFile('checkout.js', productCheckout, 'PRODUCTS');
        updateArrayInFile('accounts.js', productAccounts, 'PRODUCTS');

        // Automatically add, commit, push in background
        exec('git add . && git commit -m "feat: added ' + name + ' via Dashboard" && git push', (err, stdout, stderr) => {
            res.json({ success: true, message: 'Saved successfully & pushed!', gitErr: err, gitOutput: stdout + stderr });
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.toString() });
    }
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`AutoDeploy Admin Backend listening at http://localhost:${PORT}`);
    console.log(`Also serving static files on port ${PORT}`);
});
