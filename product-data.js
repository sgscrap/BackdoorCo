export const BLACK_CAT_IMAGES = [
    'https://i.imgur.com/RK5BAet.jpg',
    'https://i.imgur.com/0LaAQgf.png',
    'https://i.imgur.com/3K8TkzE.png',
    'https://i.imgur.com/q7uV2MM.png',
    'https://i.imgur.com/XAzKOl2.png',
    'https://i.imgur.com/o4zCCXe.png',
    'https://i.imgur.com/ckIfHxm.png',
    'https://i.imgur.com/RiQyQS4.png'
];

function buildImgurImageUrl(id, extension = 'jpg') {
    return `https://i.imgur.com/${id}.${extension}`;
}

const DEFAULT_ADULT_SIZE_OPTIONS = ['US 7', 'US 7.5', 'US 8', 'US 8.5', 'US 9', 'US 9.5', 'US 10', 'US 10.5', 'US 11', 'US 11.5', 'US 12', 'US 13', 'US 14', 'US 15'];
const DEFAULT_EU_SIZE_OPTIONS = ['EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45', 'EU 46'];

const SEEDED_PRODUCTS = [
    {
        id: 'seed-dior-b30-countdown-tech-beige-brown-orange',
        name: 'B30 Countdown Tech Sneaker',
        sku: '3SN342ABF_H726',
        slug: 'b30-countdown-tech-sneaker-beige-brown-orange',
        cardImage: buildImgurImageUrl('Bd6LKRo'),
        price: 625,
        retailPrice: 1250,
        addedAt: '2026-05-07T15:20:00-04:00',
        brand: 'Dior',
        category: 'Sneakers',
        colorway: 'Beige/Brown/Orange/Gray',
        description: 'The B30 Countdown Tech sneaker is crafted in beige semi-transparent N3O nylon with brown and orange technical fabric and gray rubber. The sporty low-top silhouette features Dior B30 and CD30 signatures, a lace-up closure, welded construction, and an ultralightweight outsole in a blend of brown rubber and foam with gray trim.',
        image: buildImgurImageUrl('Bd6LKRo'),
        images: [
            buildImgurImageUrl('Bd6LKRo'),
            buildImgurImageUrl('jhWUd9n'),
            buildImgurImageUrl('0z709mm'),
            buildImgurImageUrl('wGMIXin'),
            buildImgurImageUrl('ZdTY76W')
        ],
        imageFit: 'contain',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: DEFAULT_EU_SIZE_OPTIONS.map((size) => ({ size, stock: 1, price: 625 })),
        releaseDate: 'Spring 2026',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-dior-b30-countdown-tech-white-gray-green',
        name: 'B30 Countdown Tech Sneaker',
        sku: '3SN342ABF_H728',
        slug: 'b30-countdown-tech-sneaker-white-gray-green',
        cardImage: buildImgurImageUrl('zuylE1R'),
        price: 625,
        retailPrice: 1250,
        addedAt: '2026-05-07T15:28:00-04:00',
        brand: 'Dior',
        category: 'Sneakers',
        colorway: 'White/Gray/Green',
        description: 'The B30 Countdown Tech sneaker is crafted in white semi-transparent N3O nylon with gray and green technical fabric and gray rubber. The sporty low-top silhouette features Dior B30 and CD30 signatures, a lace-up closure, welded construction, and an ultralightweight outsole built for a technical runner profile.',
        image: buildImgurImageUrl('zuylE1R'),
        images: [
            buildImgurImageUrl('zuylE1R'),
            buildImgurImageUrl('GkxxUEI'),
            buildImgurImageUrl('KrtJ3kM'),
            buildImgurImageUrl('1q1sLyi'),
            buildImgurImageUrl('xAP8Dur')
        ],
        imageFit: 'contain',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: DEFAULT_EU_SIZE_OPTIONS.map((size) => ({ size, stock: 1, price: 625 })),
        releaseDate: 'Spring 2026',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-kobe-5-alternate-bruce-lee',
        name: "Nike Zoom Kobe 5 Protro 'Alternate Bruce Lee'",
        sku: 'CD4991-101',
        price: 800,
        brand: 'Nike',
        category: 'Sneakers',
        colorway: 'White/Black/Varsity Maize',
        description: "The Nike Zoom Kobe 5 Protro 'Alternate Bruce Lee' flips the iconic Bruce Lee-inspired color blocking with a bold white and varsity maize upper, sharp black detailing, and red slash marks near the heel. The low-cut silhouette keeps the responsive Protro tooling and close-to-court feel that made the Kobe 5 a standout on and off the hardwood.",
        image: 'https://slamdunk.shop/wp-content/uploads/2020/10/Nike-Zoom-Kobe-5-Protro-Alternate-Bruce-Lee.jpg',
        images: [
            'https://slamdunk.shop/wp-content/uploads/2020/10/Nike-Zoom-Kobe-5-Protro-Alternate-Bruce-Lee.jpg',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/656/original/639895_02.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/657/original/639895_03.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/659/original/639895_04.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/660/original/639895_05.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/662/original/639895_06.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/667/original/639895_07.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/084/266/668/original/639895_08.jpg.jpeg?action=crop&width=600'
        ],
        imageFit: 'contain',
        imagePosition: '50% 54%',
        imageScale: 1.14,
        sizes: [
            { size: 'US 8', stock: 0, price: 800 },
            { size: 'US 8.5', stock: 0, price: 800 },
            { size: 'US 9', stock: 0, price: 800 },
            { size: 'US 9.5', stock: 0, price: 800 },
            { size: 'US 10', stock: 0, price: 800 },
            { size: 'US 10.5', stock: 0, price: 800 },
            { size: 'US 11', stock: 0, price: 800 },
            { size: 'US 11.5', stock: 0, price: 800 },
            { size: 'US 12', stock: 0, price: 800 },
            { size: 'US 13', stock: 0, price: 800 },
            { size: 'US 14', stock: 0, price: 800 },
            { size: 'US 15', stock: 0, price: 800 }
        ],
        releaseDate: '11/24/2020',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-kobe-6-protro-asg-hollywood-3d-2026',
        name: "Nike Kobe 6 Protro 'ASG Hollywood 3D' (2026)",
        sku: 'KB6-ASG-3D',
        slug: 'nike-kobe-6-protro-asg-hollywood-3d-2026',
        cardImage: buildImgurImageUrl('542ZtOL'),
        price: 220,
        brand: 'Nike',
        category: 'Sneakers',
        colorway: 'Dark Grey/Daring Red-Chlorine Blue',
        description: "The Nike Kobe 6 Protro 'ASG Hollywood 3D' returns in 2026, bringing back the iconic 3D graphic upper originally debuted during the 2011 All-Star Game in Los Angeles. The mismatched Chlorine Blue and Daring Red accents pop against the textured dark grey base, completing the classic anaglyph 3D aesthetic.",
        image: buildImgurImageUrl('542ZtOL'),
        images: [
            buildImgurImageUrl('542ZtOL'),
            buildImgurImageUrl('IZwwDuX'),
            buildImgurImageUrl('7GNOHJu'),
            buildImgurImageUrl('JsVXqd1'),
            buildImgurImageUrl('ra2ZBs1'),
            buildImgurImageUrl('WWrU9aP'),
            buildImgurImageUrl('HaZcoi6'),
            buildImgurImageUrl('93HJGu2'),
            buildImgurImageUrl('pVQtloE'),
            buildImgurImageUrl('F344KZK')
        ],
        imageFit: 'contain',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: ['US 8', 'US 8.5', 'US 9', 'US 9.5', 'US 10', 'US 10.5', 'US 11', 'US 11.5', 'US 12', 'US 13', 'US 14', 'US 15'].map((size) => ({ size, stock: 1, price: 220 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-jordan-4-retro-toro-bravo-2026',
        name: "Jordan 4 Retro 'Toro Bravo' (2026)",
        sku: 'J4-TORO-2026',
        slug: 'jordan-4-retro-toro-bravo-2026',
        cardImage: buildImgurImageUrl('Ls3CLOC'),
        price: 175,
        brand: 'Jordan',
        category: 'Sneakers',
        colorway: 'Fire Red/White-Black-Cement Grey',
        description: "The Air Jordan 4 Retro 'Toro Bravo' returns in 2026, bringing back the highly coveted all-red nubuck upper first seen in 2013. Black accents on the wings, midsole, and heel tab contrast sharply with the vibrant red base, while Cement Grey detailing appears on the eyelets, tongue tag, and outsole.",
        image: buildImgurImageUrl('Ls3CLOC'),
        images: [
            buildImgurImageUrl('Ls3CLOC'),
            buildImgurImageUrl('K9Llix1'),
            buildImgurImageUrl('SOJZOGy'),
            buildImgurImageUrl('UBUUZZp'),
            buildImgurImageUrl('NBl14B8'),
            buildImgurImageUrl('fbKmhq7'),
            buildImgurImageUrl('NgXzN0P'),
            buildImgurImageUrl('BaQfz3Y'),
            buildImgurImageUrl('yAA7Oen'),
            buildImgurImageUrl('2ZsP4HT')
        ],
        imageFit: 'contain',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: DEFAULT_ADULT_SIZE_OPTIONS.map((size) => ({ size, stock: 1, price: 175 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-prada-americas-cup-burgundy-silver',
        name: "Prada America's Cup 'Burgundy/Silver'",
        sku: 'PRDA-AMC-001',
        slug: 'prada-americas-cup-burgundy-silver',
        cardImage: buildImgurImageUrl('sRovUH4'),
        price: 547,
        brand: 'Prada',
        category: 'Sneakers',
        colorway: 'Burgundy/Silver',
        description: "The Prada America's Cup sneaker in Burgundy and Silver. Technical nylon and leather upper with the iconic Prada logo tape, rubber cupsole, and grippy outsole. A staple of the Prada sportswear lineage.",
        image: buildImgurImageUrl('sRovUH4'),
        images: [
            buildImgurImageUrl('sRovUH4'),
            buildImgurImageUrl('ohctVER'),
            buildImgurImageUrl('fdIQWEt'),
            buildImgurImageUrl('Grq1Nuu'),
            buildImgurImageUrl('9aa0zDH')
        ],
        imageFit: 'contain',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: DEFAULT_ADULT_SIZE_OPTIONS.map((size) => ({ size, stock: 1, price: 547 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-prada-americas-cup-pearl-silver',
        name: "Prada America's Cup 'Pearl/Silver'",
        sku: 'PRDA-AMC-002',
        slug: 'prada-americas-cup-pearl-silver',
        cardImage: buildImgurImageUrl('wKQ1X0p'),
        price: 547,
        brand: 'Prada',
        category: 'Sneakers',
        colorway: 'Pearl/Silver',
        description: "Patent leather and technical fabric Prada America's Cup sneakers in pearl and silver.",
        image: buildImgurImageUrl('wKQ1X0p'),
        images: [
            buildImgurImageUrl('wKQ1X0p'),
            buildImgurImageUrl('J7CWvDY'),
            buildImgurImageUrl('6UIokac'),
            buildImgurImageUrl('HulQ6be'),
            buildImgurImageUrl('BmZMMXZ')
        ],
        imageFit: 'contain',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: DEFAULT_ADULT_SIZE_OPTIONS.map((size) => ({ size, stock: 1, price: 547 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-prada-americas-cup-green-silver',
        name: "Prada America's Cup 'Green/Silver'",
        sku: 'PRDA-AMC-003',
        slug: 'prada-americas-cup-green-silver',
        cardImage: buildImgurImageUrl('VP14puK'),
        price: 547,
        brand: 'Prada',
        category: 'Sneakers',
        colorway: 'Green/Silver',
        description: "Patent leather and technical fabric Prada America's Cup sneakers in green and silver.",
        image: buildImgurImageUrl('VP14puK'),
        images: [
            buildImgurImageUrl('VP14puK'),
            buildImgurImageUrl('ZHvnW3z'),
            buildImgurImageUrl('HcABYp9'),
            buildImgurImageUrl('ZU6HtQa'),
            buildImgurImageUrl('o0zsq1G')
        ],
        imageFit: 'contain',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: DEFAULT_ADULT_SIZE_OPTIONS.map((size) => ({ size, stock: 1, price: 547 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-prada-americas-cup-red-silver',
        name: "Prada America's Cup 'Red/Silver'",
        sku: 'PRDA-AMC-004',
        slug: 'prada-americas-cup-red-silver',
        cardImage: buildImgurImageUrl('BU2UBWf'),
        price: 547,
        brand: 'Prada',
        category: 'Sneakers',
        colorway: 'Red/Silver',
        description: "The Prada America's Cup sneaker in Red and Silver. Technical nylon and leather upper with the iconic Prada logo tape, rubber cupsole, and grippy outsole. A staple of the Prada sportswear lineage.",
        image: buildImgurImageUrl('BU2UBWf'),
        images: [
            buildImgurImageUrl('BU2UBWf'),
            buildImgurImageUrl('hriT299'),
            buildImgurImageUrl('jSw7uOJ'),
            buildImgurImageUrl('btnfnok'),
            buildImgurImageUrl('8Oqi7Zf'),
            buildImgurImageUrl('ryElfZm')
        ],
        imageFit: 'contain',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: DEFAULT_ADULT_SIZE_OPTIONS.map((size) => ({ size, stock: 1, price: 547 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-prada-americas-cup-yellow-silver',
        name: "Prada America's Cup 'Sunny Yellow/Silver'",
        sku: 'PRDA-AMC-005',
        slug: 'prada-americas-cup-yellow-silver',
        cardImage: buildImgurImageUrl('mNJWyDX'),
        price: 547,
        brand: 'Prada',
        category: 'Sneakers',
        colorway: 'Sunny Yellow/Silver',
        description: "The Prada America's Cup sneaker in Sunny Yellow and Silver. Technical nylon and leather upper with the iconic Prada logo tape, rubber cupsole, and grippy outsole. A staple of the Prada sportswear lineage.",
        image: buildImgurImageUrl('mNJWyDX'),
        images: [
            buildImgurImageUrl('mNJWyDX'),
            buildImgurImageUrl('GbffweV'),
            buildImgurImageUrl('IbeS8Kp'),
            buildImgurImageUrl('LOIvZJM'),
            buildImgurImageUrl('Sl2Mk0O'),
            buildImgurImageUrl('xQYETKD')
        ],
        imageFit: 'contain',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: DEFAULT_ADULT_SIZE_OPTIONS.map((size) => ({ size, stock: 1, price: 547 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-gucci-cotton-jersey-tshirt-forest-green',
        name: "Gucci Cotton Jersey T-Shirt with Embroidery",
        sku: '854394 XJHN0 3254',
        slug: 'gucci-cotton-jersey-tshirt-forest-green',
        cardImage: buildImgurImageUrl('bMJpkUt'),
        price: 550,
        retailPrice: 690,
        brand: 'Gucci',
        category: 'Apparel',
        colorway: 'Forest green',
        description: "Silhouettes, fabrics, and craftsmanship draw from the House codes and speaks to the present without losing sight of the heritage. This medium cotton jersey T-shirt is complete with an Interlocking G embroidery.\n\nProduct Details\nForest green medium cotton jersey\nInterlocking G embroidery\nCrewneck\nShort sleeves\nLength: 28.1\" based on a size S\nFabric: 100% Cotton\nEmbroidery: 100% Polyester",
        image: buildImgurImageUrl('bMJpkUt'),
        images: [
            buildImgurImageUrl('bMJpkUt'),
            buildImgurImageUrl('jLxsojK'),
            buildImgurImageUrl('cWemGLK')
        ],
        imageFit: 'cover',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => ({ size, stock: 1, price: 550 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-loewe-logo-embroidered-cotton-jersey-tshirt',
        name: 'LOEWE Logo-Embroidered Cotton-Jersey T-Shirt',
        sku: 'LOEWE-LOGO-TEE-001',
        slug: 'loewe-logo-embroidered-cotton-jersey-t-shirt',
        cardImage: buildImgurImageUrl('GlgWRVT'),
        price: 249.99,
        retailPrice: 450,
        addedAt: '2026-05-19T00:51:00-04:00',
        brand: 'LOEWE',
        category: 'Apparel',
        colorway: 'White',
        description: 'LOEWE logo-embroidered cotton-jersey T-shirt with a clean crewneck profile, short sleeves, and signature front logo detailing. A premium everyday tee built from soft cotton jersey.',
        image: buildImgurImageUrl('GlgWRVT'),
        images: [
            buildImgurImageUrl('GlgWRVT'),
            buildImgurImageUrl('zgnwMeg')
        ],
        imageFit: 'cover',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: ['S', 'M', 'L', 'XL'].map((size) => ({ size, stock: 1, price: 249.99 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-loewe-logo-embroidered-cotton-jersey-tshirt-white',
        name: "LOEWE Logo-Embroidered Cotton-Jersey T-Shirt 'White'",
        sku: 'LOEWE-LOGO-TEE-WHT-001',
        slug: 'loewe-logo-embroidered-cotton-jersey-t-shirt-white',
        cardImage: buildImgurImageUrl('ZtPjsgZ'),
        price: 249.99,
        retailPrice: 450,
        addedAt: '2026-05-19T00:54:00-04:00',
        brand: 'LOEWE',
        category: 'Apparel',
        colorway: 'White',
        description: 'White LOEWE logo-embroidered cotton-jersey T-shirt with a clean crewneck profile, short sleeves, and signature logo detailing. A premium everyday tee built from soft cotton jersey.',
        image: buildImgurImageUrl('ZtPjsgZ'),
        images: [
            buildImgurImageUrl('ZtPjsgZ'),
            buildImgurImageUrl('vqSkGyF')
        ],
        imageFit: 'cover',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: ['S', 'M', 'L', 'XL'].map((size) => ({ size, stock: 1, price: 249.99 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-loewe-logo-embroidered-cotton-jersey-tshirt-navy',
        name: "LOEWE Logo-Embroidered Cotton-Jersey T-Shirt 'Navy'",
        sku: 'LOEWE-LOGO-TEE-NVY-001',
        slug: 'loewe-logo-embroidered-cotton-jersey-t-shirt-navy',
        cardImage: buildImgurImageUrl('4vxxaTO'),
        price: 249.99,
        retailPrice: 450,
        addedAt: '2026-05-19T01:01:00-04:00',
        brand: 'LOEWE',
        category: 'Apparel',
        colorway: 'Navy',
        description: 'Navy LOEWE logo-embroidered cotton-jersey T-shirt with a clean crewneck profile, short sleeves, and signature logo detailing. A premium everyday tee built from soft cotton jersey.',
        image: buildImgurImageUrl('4vxxaTO'),
        images: [
            buildImgurImageUrl('4vxxaTO'),
            buildImgurImageUrl('ro83Of4')
        ],
        imageFit: 'cover',
        imagePosition: '50% 50%',
        imageScale: 1.0,
        sizes: ['S', 'M', 'L', 'XL'].map((size) => ({ size, stock: 1, price: 249.99 })),
        releaseDate: 'TBD',
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-yeezy-slide-onyx',
        name: "adidas Yeezy Slide 'Onyx'",
        sku: 'HQ6448',
        price: 95,
        brand: 'Adidas',
        category: 'Shoes',
        colorway: 'Onyx/Onyx/Onyx',
        description: 'First revealed in February 2022 at the Donda 2 listening event in Miami, the adidas Yeezy Slide Onyx features an all-black foam construction with a soft footbed for comfort. At the base, a grooved outsole adds stability and responsiveness.\n\nThe adidas Yeezy Slide Onyx released in March 2022 and retailed for $60.',
        image: 'https://th.bing.com/th/id/R.c356107b2c0e982d8d644ea915405af3?rik=0GDK68hC3SC07g&riu=http%3a%2f%2fsneakerdogg.com%2fcdn%2fshop%2ffiles%2fadidas-Yeezy-Slide-Onyx-_2022-2023_-_HQ6448_1200x1200.png%3fv%3d1707820786&ehk=50xxt8sQQtiCFjIfgcQWRSEPxUMxygKuIjml0alOtiw%3d&risl=&pid=ImgRaw&r=0',
        cardImage: 'https://th.bing.com/th/id/R.c356107b2c0e982d8d644ea915405af3?rik=0GDK68hC3SC07g&riu=http%3a%2f%2fsneakerdogg.com%2fcdn%2fshop%2ffiles%2fadidas-Yeezy-Slide-Onyx-_2022-2023_-_HQ6448_1200x1200.png%3fv%3d1707820786&ehk=50xxt8sQQtiCFjIfgcQWRSEPxUMxygKuIjml0alOtiw%3d&risl=&pid=ImgRaw&r=0',
        images: [
            'https://th.bing.com/th/id/R.c356107b2c0e982d8d644ea915405af3?rik=0GDK68hC3SC07g&riu=http%3a%2f%2fsneakerdogg.com%2fcdn%2fshop%2ffiles%2fadidas-Yeezy-Slide-Onyx-_2022-2023_-_HQ6448_1200x1200.png%3fv%3d1707820786&ehk=50xxt8sQQtiCFjIfgcQWRSEPxUMxygKuIjml0alOtiw%3d&risl=&pid=ImgRaw&r=0',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/072/273/667/original/884794_01.jpg.jpeg?action=crop&width=750',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/072/273/660/original/884794_04.jpg.jpeg?action=crop&width=750',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/072/273/670/original/884794_02.jpg.jpeg?action=crop&width=750',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/072/273/659/original/884794_03.jpg.jpeg?action=crop&width=750'
        ],
        imageFit: 'contain',
        imagePosition: '50% 62%',
        imageScale: 1.24,
        sizes: [
            { size: 'US 4', stock: 0, price: 95 },
            { size: 'US 5', stock: 0, price: 95 },
            { size: 'US 6', stock: 0, price: 95 },
            { size: 'US 7', stock: 0, price: 95 },
            { size: 'US 8', stock: 0, price: 95 },
            { size: 'US 9', stock: 0, price: 95 },
            { size: 'US 10', stock: 0, price: 95 },
            { size: 'US 11', stock: 0, price: 95 },
            { size: 'US 12', stock: 0, price: 95 },
            { size: 'US 13', stock: 0, price: 95 },
            { size: 'US 14', stock: 0, price: 95 }
        ],
        releaseDate: '03/07/2022',
        restockDate: '07/15/2024',
        retailPrice: 60,
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-men-travis-velvet-brown',
        name: "Travis Scott x Air Jordan 1 Low OG SP 'Velvet Brown'",
        sku: 'DM7866-202',
        price: 400,
        brand: 'Jordan',
        category: 'Sneakers',
        colorway: 'Velvet Brown/Black',
        description: "The Travis Scott x Air Jordan 1 Retro Low OG SP 'Velvet Brown' showcases Scott's signature reverse Swoosh on the black tumbled leather and brown suede upper. A woven Nike Air tag sits atop the brown nylon tongue, while mismatched Cactus Jack and Jordan Wings branding adorns the back tab of each shoe. Anchoring the sneaker is a brown rubber cupsole with stitched sidewall construction and an encapsulated Air-sole unit in the heel.",
        image: buildImgurImageUrl('ZOrZEnt'),
        images: [
            buildImgurImageUrl('ZOrZEnt'),
            buildImgurImageUrl('rAHE2Iv'),
            buildImgurImageUrl('TkQdpuE'),
            buildImgurImageUrl('4pdSP5S'),
            buildImgurImageUrl('QfIJ0PC'),
            buildImgurImageUrl('YZfxHKh'),
            buildImgurImageUrl('iDo2IAJ'),
            buildImgurImageUrl('IHVvC6S'),
            buildImgurImageUrl('gU63WYa'),
            buildImgurImageUrl('tr5UsUI'),
            buildImgurImageUrl('PYEiLrz')
        ],
        imageFit: 'contain',
        imagePosition: '50% 58%',
        imageScale: 1.28,
        sizes: [
            { size: 'M/US7', stock: 0, price: 400, backorder: true },
            { size: 'M/US7.5', stock: 0, price: 400, backorder: true },
            { size: 'M/US8', stock: 0, price: 400, backorder: true },
            { size: 'M/US8.5', stock: 0, price: 400, backorder: true },
            { size: 'M/US9', stock: 0, price: 400, backorder: true },
            { size: 'M/US9.5', stock: 0, price: 400, backorder: true },
            { size: 'M/US10', stock: 0, price: 400, backorder: true },
            { size: 'M/US10.5', stock: 0, price: 400, backorder: true },
            { size: 'M/US11', stock: 0, price: 400, backorder: true },
            { size: 'M/US11.5', stock: 0, price: 400, backorder: true },
            { size: 'M/US12', stock: 0, price: 400, backorder: true },
            { size: 'M/US13', stock: 0, price: 400, backorder: true },
            { size: 'M/US14', stock: 0, price: 400, backorder: true }
        ],
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        releaseDate: 'TBD',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-off-white-industrial-belt-yellow-black',
        name: 'OFF-WHITE Industrial Belt',
        sku: 'OW-IND-BELT-YB-SS19',
        price: 90,
        brand: 'OFF-WHITE',
        category: 'Accessories',
        colorway: 'Yellow/Black',
        season: 'SS19',
        retailPrice: 225,
        description: "The Off-White Industrial Belt is potentially the most well-recognized and popular item the brand has ever made. The yellow and black version is the most classic iteration of the belt and features Off-White branding as well as red stitching down the middle. This belt has been seen on celebrities both inside and outside of Virgil Abloh's direct circle, from Lil Uzi Vert to Tan France. This particular Off-White Industrial Belt retailed for $225 USD but has primarily resold on StockX for below retail.",
        image: 'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/083/103/227/original/654066_01.jpg.jpeg?width=750',
        cardImage: 'https://images.stockx.com/images/Off-White-Classic-Industrial-Belt-Yellow-Black.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color&updated_at=1666885806',
        images: [
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/083/103/227/original/654066_01.jpg.jpeg?width=750',
            'https://images.stockx.com/images/Off-White-Classic-Industrial-Belt-Yellow-Black.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color&updated_at=1666885806',
            'https://tse3.mm.bing.net/th/id/OIP.nE5vDaPkpCUPwzOqWhL_VgHaNA?rs=1&pid=ImgDetMain&o=7&rm=3',
            'https://tse2.mm.bing.net/th/id/OIP.MzpTNm0tD1jlpmx1sxMxAQHaLW?rs=1&pid=ImgDetMain&o=7&rm=3'
        ],
        imageFit: 'contain',
        imagePosition: '50% 52%',
        imageScale: 1.08,
        sizes: [
            { size: 'One Size', stock: 0, price: 90 }
        ],
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        releaseDate: '01/01/2019',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-men-travis-black-phantom',
        name: "Travis Scott x Air Jordan 1 Retro Low OG SP 'Black Phantom'",
        sku: 'DM7866 001',
        price: 600,
        brand: 'Jordan',
        category: 'Sneakers',
        colorway: 'Black/Phantom/University Red',
        description: "The Travis Scott x Air Jordan 1 Retro Low OG SP 'Black Phantom' brings La Flame's signature reverse Swoosh to a stealthy black suede build with contrast white stitching throughout. A woven Nike Air tag lands on the tongue, while mismatched Cactus Jack and Jordan Wings branding finish the heel tabs. University Red detailing adds a subtle hit of color to the monochrome low-top.",
        image: 'https://tse1.mm.bing.net/th/id/OIP.rOgfg8KHJ4brBJSX81xQXAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3',
        images: [
            'https://tse1.mm.bing.net/th/id/OIP.rOgfg8KHJ4brBJSX81xQXAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/983/original/1006990_01.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/986/original/1006990_02.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/985/original/1006990_03.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/987/original/1006990_04.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/988/original/1006990_05.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/990/original/1006990_06.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/991/original/1006990_07.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/080/011/992/original/1006990_08.jpg.jpeg?action=crop&width=600'
        ],
        imageFit: 'contain',
        imagePosition: '50% 60%',
        imageScale: 1.24,
        sizes: DEFAULT_ADULT_SIZE_OPTIONS.map((size) => ({
            size,
            stock: 0,
            price: 600
        })),
        releaseDate: '12/15/2022',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-nb-2002r-protection-pack-sea-salt',
        name: "New Balance 2002R 'Protection Pack Sea Salt'",
        sku: 'M2002RDH',
        price: 185,
        brand: 'New Balance',
        category: 'Sneakers',
        colorway: 'Sea Salt/White',
        description: "The New Balance 2002R 'Sea Salt' is taken from the three-piece 'Protection Pack,' conceived by New Balance designer Yue Wu as a visual representation of sneakers that last a lifetime. The upper is crafted from white leather with eroded suede overlays throughout the forefoot, quarter panel and heel. Details include a tonal 'N' logo, exposed foam tongue and 2002R branding in red and blue. The sneaker rides on a distressed ABZORB midsole, supported underfoot by a durable N-ergy outsole.",
        image: 'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/112/723/647/original/793106_01.jpg.jpeg?action=crop&width=600',
        cardImage: 'https://www.picclickimg.com/O20AAOSwSJdigd~g/New-Balance-2002R-Protection-Pack-Sea-Salt-Sneakers.webp',
        images: [
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/112/723/647/original/793106_01.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/112/723/653/original/793106_02.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/112/723/645/original/793106_03.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/112/723/644/original/793106_04.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/112/723/652/original/793106_05.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/112/723/643/original/793106_06.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/112/723/642/original/793106_07.jpg.jpeg?action=crop&width=600',
            'https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/112/723/649/original/793106_08.jpg.jpeg?action=crop&width=600'
        ],
        imageFit: 'cover',
        imagePosition: '50% 56%',
        imageScale: 1.22,
        sizes: [
            { size: 'US 5', stock: 0, price: 185 },
            { size: 'US 5.5', stock: 0, price: 185 },
            { size: 'US 6', stock: 0, price: 185 },
            { size: 'US 6.5', stock: 0, price: 185 },
            { size: 'US 7', stock: 0, price: 185 },
            { size: 'US 7.5', stock: 0, price: 185 },
            { size: 'US 8', stock: 0, price: 185 },
            { size: 'US 8.5', stock: 0, price: 185 },
            { size: 'US 9', stock: 0, price: 185 },
            { size: 'US 9.5', stock: 0, price: 185 },
            { size: 'US 10', stock: 0, price: 185 },
            { size: 'US 10.5', stock: 0, price: 185 },
            { size: 'US 11', stock: 0, price: 185 },
            { size: 'US 11.5', stock: 0, price: 185 },
            { size: 'US 12', stock: 0, price: 185 }
        ],
        releaseDate: '04/01/2022',
        retailPrice: 150,
        allowBackorder: true,
        backorderLeadTime: 'Ships in 1.5-2 weeks',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    },
    {
        id: 'seed-kids-travis-black-phantom-ps',
        name: "Travis Scott x Air Jordan 1 Retro Low OG SP PS 'Black Phantom'",
        sku: 'DO5442-001',
        price: 180,
        brand: 'Jordan',
        category: 'Kids',
        colorway: 'Black/Black',
        description: "Offered in little kid sizing, the Travis Scott x Air Jordan 1 Retro Low OG SP PS 'Black Phantom' combines a sleek finish with La Flame's signature touches. The low-top sports an all-black nubuck and suede upper with contrast white stitching throughout. Scott's backward Swoosh decorates the lateral side, while woven Nike tags embellish each tongue. Mismatched heel tabs display a Jordan Wings logo on the right shoe and a bee graphic on the left. Anchoring the sneaker is a black rubber cupsole with stitched sidewall construction.",
        image: buildImgurImageUrl('30H5NyD'),
        images: [
            buildImgurImageUrl('30H5NyD'),
            buildImgurImageUrl('UutZVxq'),
            buildImgurImageUrl('israMgv'),
            buildImgurImageUrl('FXy3W3z'),
            buildImgurImageUrl('bG5UpTh'),
            buildImgurImageUrl('PNAbX10')
        ],
        imageFit: 'contain',
        imagePosition: 'center center',
        sizes: [
            { size: '12.5C', stock: 1, price: 180 }
        ],
        releaseDate: 'TBD',
        status: 'active',
        isHidden: false,
        isOutOfStock: false,
        isFeatured: false,
        seeded: true,
        createdAt: { seconds: 0 }
    }
];

const IMGUR_SIZE_SUFFIXES = new Set(['s', 'b', 't', 'm', 'l', 'h']);

function matchesBlackCat(product) {
    const name = String(product?.name || '').toLowerCase();
    const sku = String(product?.sku || '').toLowerCase();
    return (name.includes('jordan 4 retro') && name.includes('black cat')) || sku === 'fv5029 010';
}

function matchesKidsTravisBlackPhantom(product) {
    const id = String(product?.id || '').toLowerCase();
    const name = String(product?.name || '').toLowerCase();
    return id === 'seed-kids-travis-black-phantom-ps' || (name.includes('travis scott') && name.includes('black phantom'));
}

function matchesVelvetBrown(product) {
    const id = String(product?.id || '').toLowerCase();
    const name = String(product?.name || '').toLowerCase();
    return id === 'seed-men-travis-velvet-brown' || (name.includes('travis scott') && name.includes('velvet brown'));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

const LEGACY_IMAGE_POSITIONS = {
    'center center': [50, 50],
    'center top': [50, 18],
    'center bottom': [50, 82],
    'left center': [24, 50],
    'right center': [76, 50]
};

const PRADA_SNEAKER_PRICE = 547;

function isFootwearProduct(product) {
    const category = String(product?.category || '').toLowerCase();
    const brand = String(product?.brand || '').toLowerCase();
    const name = String(product?.name || '').toLowerCase();
    return (
        ['sneakers', 'shoes', 'footwear'].includes(category) ||
        name.includes('jordan') ||
        name.includes('dunk') ||
        name.includes('air max') ||
        name.includes('yeezy') ||
        (brand === 'jordan' && category !== 'apparel')
    );
}

function isPradaSneaker(product) {
    const brand = String(product?.brand || '').toLowerCase();
    const name = String(product?.name || '').toLowerCase();
    const category = String(product?.category || '').toLowerCase();
    return (
        (brand === 'prada' || name.includes('prada')) &&
        (category === 'sneakers' || category === 'shoes' || name.includes("america's cup"))
    );
}

export function applyProductOverrides(product) {
    if (!product) return product;

    const nextProduct = {
        ...product,
        price: Number(product.price) || 0
    };

    // Auto-correct brand for any Prada product mislabeled as another brand
    const productId = String(nextProduct.id || '').toLowerCase();
    const productName = String(nextProduct.name || '').toLowerCase();
    if ((productId.includes('prada') || productName.includes("prada")) && nextProduct.brand !== 'Prada') {
        nextProduct.brand = 'Prada';
    }

    if (isPradaSneaker(nextProduct)) {
        nextProduct.price = PRADA_SNEAKER_PRICE;
        nextProduct.isOutOfStock = false;
        nextProduct.allowBackorder = true;
        nextProduct.sizes = DEFAULT_ADULT_SIZE_OPTIONS.map((size) => ({
            size,
            stock: 1,
            price: PRADA_SNEAKER_PRICE,
            backorder: false
        }));
    }

    // Default shoes to backorder flow when out of stock
    if (isFootwearProduct(nextProduct) && nextProduct.allowBackorder !== false) {
        nextProduct.allowBackorder = true;
        nextProduct.backorderLeadTime = nextProduct.backorderLeadTime || 'Ships in 1.5-2 weeks';
    }

    if (matchesBlackCat(nextProduct)) {
        nextProduct.name = String(nextProduct.name || "Jordan 4 Retro 'Black Cat' 2020").replace(/2025/g, '2020');
        nextProduct.description = "Jordan Brand brings back a mid-2000s classic with the Jordan 4 Black Cat (2020), now available on StockX. Originally debuting in 2006, this is the first time the Black Cat colorway has seen a retro. The fourteen year Black Cat drought has officially ended.\n\nThis Jordan 4 is composed of a black nubuck suede upper with matching detailing. Black hardware, netting, and outsoles complete the design. These sneakers released in January 2020 and retailed for $190.";
        nextProduct.image = BLACK_CAT_IMAGES[0];
        nextProduct.images = [...BLACK_CAT_IMAGES];
        nextProduct.imageFit = nextProduct.imageFit || 'contain';
        nextProduct.imagePosition = nextProduct.imagePosition || 'center center';
        nextProduct.backorderLeadTime = nextProduct.backorderLeadTime || 'Ships in 1.5-2 weeks';
        const basePrice = Number(nextProduct.price) || 0;
        const existingSizeMap = new Map((Array.isArray(nextProduct.sizes) ? nextProduct.sizes : []).map((entry) => [String(entry?.size || '').trim(), entry]));
        nextProduct.sizes = DEFAULT_ADULT_SIZE_OPTIONS.map((size) => {
            const current = existingSizeMap.get(size) || {};
            const inStock = size === 'US 10';
            return {
                size,
                stock: inStock ? Math.max(1, Number(current.stock) || 1) : 0,
                price: Number(current.price) || basePrice,
                backorder: !inStock,
                backorderLeadTime: nextProduct.backorderLeadTime
            };
        });
    }

    return nextProduct;
}

export function getProductSizes(product) {
    if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
        return product.sizes.map((entry) => ({
            size: String(entry.size || '').trim(),
            stock: Math.max(0, Number(entry.stock) || 0),
            price: Number(entry.price) || Number(product.price) || 0,
            backorder: Boolean(entry.backorder),
            backorderLeadTime: String(entry.backorderLeadTime || product?.backorderLeadTime || '').trim()
        })).filter((entry) => entry.size);
    }

    if (typeof product?.sizes === 'string' && product.sizes.trim()) {
        return product.sizes.split(',').map((size) => ({
            size: size.trim(),
            stock: Math.max(0, Number(product.stock) || 0),
            price: Number(product.price) || 0,
            backorder: Boolean(product?.allowBackorder),
            backorderLeadTime: String(product?.backorderLeadTime || '').trim()
        })).filter((entry) => entry.size);
    }

    return [];
}

export function getProductImages(product) {
    const overridden = applyProductOverrides(product);
    if (Array.isArray(overridden?.images) && overridden.images.length > 0) {
        const seen = new Set();
        return overridden.images
            .filter(Boolean)
            .filter((image) => {
                const normalized = normalizeImageKey(image);

                if (seen.has(normalized)) {
                    return false;
                }

                seen.add(normalized);
                return true;
            });
    }
    return overridden?.image ? [overridden.image] : [];
}

export function getProductCardImage(product) {
    const overridden = applyProductOverrides(product);
    return String(overridden?.cardImage || '').trim() || getProductImages(overridden)[0] || '';
}

function normalizeImageKey(image) {
    const rawValue = String(image || '').trim();
    if (!rawValue) return '';

    try {
        const parsed = new URL(rawValue);
        const segments = parsed.pathname.split('/').filter(Boolean);
        let basename = segments[segments.length - 1] || '';
        basename = basename.replace(/\.[a-z0-9]+$/i, '').toLowerCase();

        if ((parsed.hostname === 'i.imgur.com' || parsed.hostname === 'imgur.com') && basename.length === 8) {
            const suffix = basename.at(-1);
            if (IMGUR_SIZE_SUFFIXES.has(suffix)) {
                basename = basename.slice(0, -1);
            }
        }

        return `${parsed.hostname.toLowerCase()}/${basename}`;
    } catch {
        return rawValue
            .replace(/[?#].*$/, '')
            .replace(/\.[a-z0-9]+$/i, '')
            .toLowerCase();
    }
}

export function getTotalStock(product) {
    const sizes = getProductSizes(product);
    if (sizes.length > 0) {
        return sizes.reduce((sum, entry) => sum + Math.max(0, Number(entry.stock) || 0), 0);
    }
    return Math.max(0, Number(product?.stock) || 0);
}

export function isHidden(product) {
    return Boolean(product?.isHidden);
}

export function isFeatured(product) {
    return Boolean(product?.isFeatured) || Boolean(product?.featured);
}

export function hasInStockSizes(product) {
    return getProductSizes(product).some((entry) => entry.stock > 0);
}

export function hasBackorderSizes(product) {
    return Boolean(product?.allowBackorder) || getProductSizes(product).some((entry) => Boolean(entry.backorder));
}

export function isBackorder(product, sizeEntry) {
    if (sizeEntry) {
        return Boolean(sizeEntry?.backorder) || (Boolean(product?.allowBackorder) && Math.max(0, Number(sizeEntry?.stock) || 0) <= 0);
    }
    return Boolean(product?.allowBackorder);
}

export function isBackorderOnly(product) {
    return hasBackorderSizes(product) && !hasInStockSizes(product);
}

export function getBackorderLeadTime(product, sizeEntry) {
    return String(sizeEntry?.backorderLeadTime || product?.backorderLeadTime || 'Ships in 1.5-2 weeks').trim();
}

export function isOutOfStock(product) {
    if (hasBackorderSizes(product)) return false;
    return Boolean(product?.isOutOfStock) || getTotalStock(product) <= 0;
}

export function getProductImageFit(product) {
    const value = String(product?.imageFit || '').toLowerCase();
    if (value === 'contain') return 'contain';
    if (value === 'cover') return 'cover';
    return isFootwearProduct(product) ? 'contain' : 'cover';
}

export function getProductImagePosition(product) {
    const rawX = Number(product?.imageOffsetX);
    const rawY = Number(product?.imageOffsetY);
    if (Number.isFinite(rawX) && Number.isFinite(rawY)) {
        return `${clamp(rawX, 0, 100)}% ${clamp(rawY, 0, 100)}%`;
    }

    const value = String(product?.imagePosition || '').trim().toLowerCase();
    if (LEGACY_IMAGE_POSITIONS[value]) {
        const [x, y] = LEGACY_IMAGE_POSITIONS[value];
        return `${x}% ${y}%`;
    }

    const match = value.match(/^(-?\d{1,3}(?:\.\d+)?)%\s+(-?\d{1,3}(?:\.\d+)?)%$/);
    if (match) {
        return `${clamp(Number(match[1]), 0, 100)}% ${clamp(Number(match[2]), 0, 100)}%`;
    }

    return '50% 50%';
}

export function getProductCardImageScale(product) {
    const explicit = Number(product?.imageScale);
    if (Number.isFinite(explicit) && explicit >= 0.8 && explicit <= 1.5) {
        return explicit;
    }
    if (matchesBlackCat(product)) return 1.16;
    if (matchesKidsTravisBlackPhantom(product)) return 1.12;
    if (matchesVelvetBrown(product)) return 1.28;
    if (isFootwearProduct(product)) return 1.08;
    return 1;
}

export function getProductCardImagePadding(product) {
    if (String(product?.imageFit || '').toLowerCase() === 'cover') return '0';
    if (matchesBlackCat(product)) return '2px';
    if (matchesKidsTravisBlackPhantom(product)) return '2px';
    if (matchesVelvetBrown(product)) return '2px';
    return isFootwearProduct(product) ? '4px' : '0';
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export function buildProductHref(product) {
    const overridden = applyProductOverrides(product);
    const id = encodeURIComponent(overridden.id);
    const slug = encodeURIComponent(slugify(overridden.name));
    return `product.html?id=${id}&slug=${slug}`;
}

function getProductMatchKey(product) {
    const sku = String(product?.sku || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (sku) return `sku:${sku}`;
    return `name:${slugify(product?.name || '')}`;
}

function parseTimestamp(value) {
    if (!value) return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (Number.isFinite(value.seconds)) return value.seconds * 1000;
    if (Number.isFinite(value._seconds)) return value._seconds * 1000;
    return 0;
}

export function getProductSortTimestamp(product) {
    return Math.max(
        parseTimestamp(product?.addedAt),
        parseTimestamp(product?.updatedAt),
        parseTimestamp(product?.createdAt),
        parseTimestamp(product?.releaseDate)
    );
}

export function getSeededProducts() {
    return SEEDED_PRODUCTS.map((product) => applyProductOverrides(product));
}

export function mergeCatalogProducts(products = []) {
    const merged = new Map();

    getSeededProducts().forEach((product) => {
        merged.set(product.id, product);
    });

    products.forEach((product) => {
        const overridden = applyProductOverrides(product);
        const matchKey = getProductMatchKey(overridden);
        const seededMatch = [...merged.values()].find((entry) => getProductMatchKey(entry) === matchKey);

        if (seededMatch) {
            merged.delete(seededMatch.id);
        }

        merged.set(overridden.id, overridden);
    });

    return [...merged.values()];
}
