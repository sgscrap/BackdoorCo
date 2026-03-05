// ⚡ BACKDOOR PRODUCT SEEDER
// Seeds all current products into Firebase Firestore
// Run once from admin/seed.html

async function seedProducts() {
    const btn = document.getElementById('seedBtn');
    const log = document.getElementById('seedLog');

    btn.disabled = true;
    btn.textContent = 'Seeding...';

    // Use the compat SDK already loaded
    const db = firebase.firestore();

    const products = [
        {
            name: "Acne Studios 1996 Rhinestone Logo T-Shirt - Black",
            sku: "FN-UX-TSHI000231",
            price: 350,
            stock: 45,
            category: "Apparel",
            brand: "Acne Studios",
            status: "active",
            image: "products/acne-1996-rhinestone-1.png",
            images: ["products/acne-1996-rhinestone-1.png", "products/acne-1996-rhinestone-2.png"],
            description: "Acne Studios 1996 Rhinestone Logo T-Shirt in Black. Premium cotton with rhinestone branding.",
            sizes: "S, M, L, XL",
            colorway: "Black",
            featured: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Acne Studios 1996 Logo T-Shirt - Relaxed Fit Deep Blue",
            sku: "FN-UX-TSHI000013",
            price: 250,
            stock: 45,
            category: "Apparel",
            brand: "Acne Studios",
            status: "active",
            image: "products/acne-1996-logo-tshirt.png",
            description: "Acne Studios 1996 Logo T-Shirt Relaxed Fit in Deep Blue.",
            sizes: "S, M, L, XL",
            colorway: "Deep Blue",
            featured: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Godspeed Surf Day T-shirt",
            sku: "GS-SURF-001",
            price: 100,
            stock: 45,
            category: "Apparel",
            brand: "Godspeed",
            status: "active",
            image: "products/godspeed-surf-day.png",
            description: "Classic fit Godspeed Surf Day graphic t-shirt. Free shipping (1-2 weeks) or Express shipping (3-5 days, +$10).",
            sizes: "S, M, L, XL",
            colorway: "White/Blue",
            featured: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Virgil Abloh Archive™ x Air Jordan 1 High OG \"Alaska\" Retro",
            sku: "AA3834-100",
            price: 1647,
            stock: 20,
            category: "Sneakers",
            brand: "Jordan",
            status: "active",
            image: "products/jordan-1-ow-alaska.png",
            description: "The elusive Off-White x Air Jordan 1 'Alaska' (White) featuring deconstructed leather and Virgil Abloh's signature typography.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "White/White",
            featured: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Pharrell x VIRGINIA x Adistar Jellyfish 'Royal Blue'",
            sku: "JP9263",
            price: 249,
            stock: 16,
            category: "Sneakers",
            brand: "Adidas",
            status: "active",
            image: "products/pharrell-jellyfish-blue.jpg",
            description: "Pharrell Williams x VIRGINIA x Adidas Adistar Jellyfish Royal Blue.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Royal Blue",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Pharrell x VIRGINIA x Adistar Jellyfish 'Solid Grey Black'",
            sku: "JP9265",
            price: 249,
            stock: 12,
            category: "Sneakers",
            brand: "Adidas",
            status: "active",
            image: "products/pharrell-jellyfish-grey.jpg",
            description: "A sleek colorway of the Pharrell collaboration featuring solid grey and black tones.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Solid Grey/Black",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Caitlin Clark x Zoom Kobe 6 Protro 'Light Armory Blue'",
            sku: "IO3672-400",
            price: 249,
            stock: 14,
            category: "Sneakers",
            brand: "Nike",
            status: "active",
            image: "products/kobe-6-caitlin-clark.jpg",
            description: "Caitlin Clark x Nike Zoom Kobe 6 Protro Light Armory Blue.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Light Armory Blue",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Cactus Plant Flea Market x Air Force 1 Low Premium 'Moss'",
            sku: "FQ7069-300",
            price: 299,
            stock: 7,
            category: "Sneakers",
            brand: "Nike",
            status: "active",
            image: "products/af1-cpfm-moss.jpg",
            description: "Tumbled leather upper with prominent logos inspired by the Air More Uptempo; 'Air' and 'Sunshine' wordmarks.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Moss",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Fragment Design x Travis Scott x Jordan 1 Low OG SP 'Sail Military Blue'",
            sku: "DM7866-140",
            price: 899,
            stock: 4,
            category: "Sneakers",
            brand: "Jordan",
            status: "active",
            image: "products/jordan-1-fragment-travis.jpg",
            description: "Fragment Design x Travis Scott x Air Jordan 1 Low OG SP Sail Military Blue.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Sail/Military Blue",
            featured: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Steve Wiebe x Jordan 10 Retro 'HOH'",
            sku: "DD9587-002",
            price: 499,
            stock: 5,
            category: "Sneakers",
            brand: "Jordan",
            status: "active",
            image: "products/jordan-10-hoh.jpg",
            description: "Exclusive House of Hoops collaboration featuring premium materials and unique colorway.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "White/Black",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Jordan 5 Retro 'Wolf Grey' 2026 GS",
            sku: "DD0587-002",
            price: 260,
            stock: 9,
            category: "Sneakers",
            brand: "Jordan",
            status: "active",
            image: "products/jordan-5-wolf-grey.jpg",
            description: "Air Jordan 5 Retro Wolf Grey 2026 Grade School.",
            sizes: "3.5Y, 4Y, 5Y, 6Y, 7Y",
            colorway: "Wolf Grey",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Jordan 10 Retro 'Shadow' 2025",
            sku: "HJ6779-001",
            price: 260,
            stock: 10,
            category: "Sneakers",
            brand: "Jordan",
            status: "active",
            image: "products/jordan-10-shadow.jpg",
            description: "Classic Jordan 10 silhouette in the iconic Shadow colorway with premium materials.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Black/Dark Charcoal",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Paris Saint-Germain x Jordan 5 Retro 'Off Noir'",
            sku: "HQ3004-001",
            price: 250,
            stock: 8,
            category: "Sneakers",
            brand: "Jordan",
            status: "active",
            image: "products/jordan-5-psg.jpg",
            description: "Paris Saint-Germain x Air Jordan 5 Retro Off Noir.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Off Noir/Black",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Jalen Brunson x Zoom Kobe 6 Protro 'Statue of Liberty'",
            sku: "JQ5774-300",
            price: 250,
            stock: 9,
            category: "Sneakers",
            brand: "Nike",
            status: "active",
            image: "products/kobe-6-brunson.jpg",
            description: "Jalen Brunson PE featuring Statue of Liberty inspired colorway with turquoise and copper accents.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Green/White",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Jordan 4 Retro 'Black Cat' 2025",
            sku: "FV5029-010",
            price: 250,
            stock: 7,
            category: "Sneakers",
            brand: "Jordan",
            status: "active",
            image: "products/jordan-4-black-cat.jpg",
            description: "Air Jordan 4 Retro Black Cat 2025. All-black colorway with premium nubuck.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Black/Black",
            featured: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Zoom Kobe 6 Protro 'Reverse Grinch'",
            sku: "FV4921-600",
            price: 260,
            stock: 3,
            category: "Sneakers",
            brand: "Nike",
            status: "active",
            image: "products/kobe-6-reverse-grinch.jpg",
            description: "Limited edition Reverse Grinch colorway with bright crimson and electric green.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Red/Green",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Air Jordan 3 Retro OG SP 'For The Love'",
            sku: "HV8571-100",
            price: 190,
            stock: 7,
            category: "Sneakers",
            brand: "Jordan",
            status: "active",
            image: "products/jordan-3-for-the-love.jpg",
            description: "Air Jordan 3 Retro OG SP For The Love. White/Diffused Blue with elephant print.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "White/Blue",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Jordan 14 'Black University Blue'",
            sku: "DH4121-041",
            price: 275,
            stock: 7,
            category: "Sneakers",
            brand: "Jordan",
            status: "active",
            image: "products/jordan-14-black-blue.jpg",
            description: "Matte black nubuck upper with University Blue vents; inspired by MJ's love of luxury sports cars.",
            sizes: "7, 8, 9, 10, 11, 12",
            colorway: "Black/University Blue",
            featured: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            name: "Nike x NOCTA 'Sunset' Puffer Jacket - Mica Green / Cyber",
            sku: "FNB196-330",
            price: 420,
            stock: 15,
            category: "Apparel",
            brand: "Nike",
            status: "active",
            image: "products/nocta-sunset-jacket.jpg",
            description: "Nike x NOCTA Sunset Puffer Jacket Mica Green Cyber. Oversized fit with down fill.",
            sizes: "S, M, L, XL, XXL",
            colorway: "Mica Green/Cyber",
            featured: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }
    ];

    let success = 0;
    let failed = 0;

    log.innerHTML = '<div style="color:rgba(255,255,255,0.5)">Starting seed...</div>';

    for (const product of products) {
        try {
            await db.collection('products').add(product);
            success++;
            log.innerHTML += `<div class="log-success">✓ Added: ${product.name}</div>`;
        } catch (err) {
            failed++;
            log.innerHTML += `<div class="log-error">✗ Failed: ${product.name} — ${err.message}</div>`;
        }
        log.scrollTop = log.scrollHeight;
    }

    btn.textContent = `Done! ${success} added, ${failed} failed`;
    btn.style.background = '#4ade80';
}

window.seedProducts = seedProducts;
