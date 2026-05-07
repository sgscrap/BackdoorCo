const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

const MIN_STANDARD_RATIO = 0.65;
const MIN_HIGH_VALUE_RATIO = 0.55;
const MIN_HIGH_VALUE_AMOUNT = 250;
const MIN_OFFER_AMOUNT = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^[0-9+().\-\s]{7,24}$/;
const SPAM_TEXT_RE = /(https?:\/\/|www\.|telegram|whatsapp|crypto|loan|casino|seo|backlink|rank\s+on\s+google)/i;
const TEST_TEXT_RE = /^(test|asdf|qwerty|none|null|na|n\/a)$/i;

function json(statusCode, payload) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        },
        body: JSON.stringify(payload)
    };
}

function cleanText(value, maxLength = 500) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function normalizeEmail(value) {
    return cleanText(value, 160).toLowerCase();
}

function normalizeMoney(value) {
    return Number(Number(value || 0).toFixed(2));
}

function hasRealName(value) {
    const name = cleanText(value, 100);
    if (name.length < 3 || TEST_TEXT_RE.test(name)) return false;
    return /[a-z]/i.test(name) && name.replace(/[^a-z]/gi, '').length >= 3;
}

function getOfferRatio(offerAmount, askingPrice) {
    if (!askingPrice || askingPrice <= 0) return 0;
    return Number((offerAmount / askingPrice).toFixed(4));
}

function getLeadScore({ offerAmount, askingPrice, customerName, customerEmail, customerPhone, message }) {
    const ratio = getOfferRatio(offerAmount, askingPrice);
    let score = 0;

    if (hasRealName(customerName)) score += 20;
    if (EMAIL_RE.test(customerEmail)) score += 25;
    if (!customerPhone || PHONE_RE.test(customerPhone)) score += 10;
    if (offerAmount >= MIN_OFFER_AMOUNT) score += 10;
    if (ratio >= MIN_HIGH_VALUE_RATIO) score += 15;
    if (ratio >= MIN_STANDARD_RATIO) score += 20;
    if (offerAmount >= MIN_HIGH_VALUE_AMOUNT) score += 10;
    if (message && !SPAM_TEXT_RE.test(message)) score += 5;

    return Math.min(100, score);
}

function validateProminentLead(input) {
    const reasons = [];
    const offerAmount = normalizeMoney(input.offerAmount);
    const askingPrice = normalizeMoney(input.askingPrice);
    const ratio = getOfferRatio(offerAmount, askingPrice);

    if (!input.productId) reasons.push('missing_product');
    if (!hasRealName(input.customerName)) reasons.push('invalid_name');
    if (!EMAIL_RE.test(input.customerEmail)) reasons.push('invalid_email');
    if (input.customerPhone && !PHONE_RE.test(input.customerPhone)) reasons.push('invalid_phone');
    if (!offerAmount || offerAmount < MIN_OFFER_AMOUNT) reasons.push('offer_too_small');
    if (!askingPrice || askingPrice <= 0) reasons.push('missing_asking_price');
    if (askingPrice && offerAmount >= askingPrice) reasons.push('offer_not_below_ask');
    if (SPAM_TEXT_RE.test(input.message || '')) reasons.push('spam_message');

    const prominentRatio = ratio >= MIN_STANDARD_RATIO || (offerAmount >= MIN_HIGH_VALUE_AMOUNT && ratio >= MIN_HIGH_VALUE_RATIO);
    if (!prominentRatio) reasons.push('offer_below_prominent_threshold');

    return {
        accepted: reasons.length === 0,
        reasons,
        ratio,
        score: getLeadScore({ ...input, offerAmount, askingPrice })
    };
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed.' });
    }

    try {
        const data = JSON.parse(event.body || '{}');
        const lead = {
            productId: cleanText(data.productId, 160),
            productName: cleanText(data.productName, 240),
            productSku: cleanText(data.productSku, 120),
            productImage: cleanText(data.productImage, 600),
            size: cleanText(data.size || 'One Size', 80),
            brand: cleanText(data.brand, 120),
            askingPrice: normalizeMoney(data.askingPrice),
            offerAmount: normalizeMoney(data.offerAmount),
            customerName: cleanText(data.customerName, 120),
            customerEmail: normalizeEmail(data.customerEmail),
            customerPhone: cleanText(data.customerPhone, 40),
            message: cleanText(data.message, 700),
            source: cleanText(data.source || 'unknown', 80)
        };

        const quality = validateProminentLead(lead);
        if (!quality.accepted) {
            console.warn('Rejected non-prominent lead', {
                reasons: quality.reasons,
                productId: lead.productId,
                offerRatio: quality.ratio,
                leadScore: quality.score
            });
            return json(422, {
                error: 'This offer does not meet the review threshold.',
                code: 'lead_not_prominent'
            });
        }

        const offerDoc = {
            ...lead,
            status: 'pending',
            leadType: 'prominent_offer',
            prominentLead: true,
            leadScore: quality.score,
            offerRatio: quality.ratio,
            reviewPriority: quality.score >= 90 ? 'high' : 'standard',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('offers').add(offerDoc);

        return json(200, {
            message: 'Offer created successfully',
            id: docRef.id,
            leadScore: quality.score,
            reviewPriority: offerDoc.reviewPriority
        });
    } catch (error) {
        console.error('Error creating offer:', error);
        return json(500, { error: 'Failed to create offer' });
    }
};
