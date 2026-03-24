const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const {
            productId,
            productName,
            productSku,
            productImage,
            size,
            brand,
            askingPrice,
            offerAmount,
            customerName,
            customerEmail,
            customerPhone,
            message,
            status,
            source
        } = data;

        if (!customerName || !customerEmail || !productId || !offerAmount) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        const offerDoc = {
            productId,
            productName,
            productSku: productSku || '',
            productImage: productImage || '',
            size: size || 'One Size',
            brand: brand || '',
            askingPrice: Number(askingPrice) || 0,
            offerAmount: Number(offerAmount) || 0,
            customerName,
            customerEmail,
            customerPhone: customerPhone || '',
            message: message || '',
            status: status || 'pending',
            source: source || 'unknown',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('offers').add(offerDoc);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Offer created successfully',
                id: docRef.id
            })
        };
    } catch (error) {
        console.error('Error creating offer:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to create offer' })
        };
    }
};
