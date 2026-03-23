const crypto = require('crypto');
const Stripe = require('stripe');
const { initializeApp, getApps } = require('firebase/app');
const {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} = require('firebase/firestore');

const firebaseConfig = {
    apiKey: 'AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw',
    authDomain: 'coalition-aec44.firebaseapp.com',
    projectId: 'coalition-aec44',
    storageBucket: 'coalition-aec44.firebasestorage.app',
    messagingSenderId: '312196142925',
    appId: '1:312196142925:web:ba090f602c8b5a31b20904'
};

const SHIPPING_OPTIONS = [
    { id: 'standard', name: 'Standard Shipping', time: '5-7 business days', price: 9.99 },
    { id: 'express', name: 'Express Shipping', time: '2-3 business days', price: 19.99 },
    { id: 'overnight', name: 'Overnight Shipping', time: 'Next business day', price: 34.99 }
];

const FREE_SHIP_THRESHOLD = 150;

let stripeClient = null;
let firestoreDb = null;

function getStripe() {
    if (stripeClient) return stripeClient;

    const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
    if (!secretKey) {
        throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
    }

    stripeClient = new Stripe(secretKey);
    return stripeClient;
}

function getDb() {
    if (firestoreDb) return firestoreDb;

    const app = getApps()[0] || initializeApp(firebaseConfig);
    firestoreDb = getFirestore(app);
    return firestoreDb;
}

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

function sanitizeText(value, fallback = '') {
    const text = String(value ?? fallback).trim();
    return text || fallback;
}

function normalizeMoney(value) {
    return Number(Number(value || 0).toFixed(2));
}

function toStripeAmount(value) {
    return Math.max(0, Math.round(Number(value || 0) * 100));
}

function normalizeCartItem(item) {
    return {
        id: sanitizeText(item?.id || item?.productId),
        productId: sanitizeText(item?.productId || item?.id),
        name: sanitizeText(item?.name),
        brand: sanitizeText(item?.brand),
        size: sanitizeText(item?.size, 'One Size'),
        image: sanitizeText(item?.image),
        qty: Math.max(1, Number(item?.qty) || Number(item?.quantity) || 1),
        price: normalizeMoney(item?.price),
        backorder: Boolean(item?.backorder),
        backorderLeadTime: sanitizeText(item?.backorderLeadTime)
    };
}

function getShippingOption(id, subtotal = 0) {
    const option = SHIPPING_OPTIONS.find((entry) => entry.id === id) || SHIPPING_OPTIONS[0];
    const shippingPrice = subtotal >= FREE_SHIP_THRESHOLD && option.id === 'standard' ? 0 : option.price;
    return {
        ...option,
        price: normalizeMoney(shippingPrice)
    };
}

function buildLineItems(items, shippingOption) {
    const lineItems = items.map((item) => ({
        quantity: item.qty,
        price_data: {
            currency: 'usd',
            unit_amount: toStripeAmount(item.price),
            product_data: {
                name: item.name,
                description: [item.brand, item.size !== 'One Size' ? `Size ${item.size}` : '', item.backorder ? 'Backorder' : '']
                    .filter(Boolean)
                    .join(' | '),
                images: item.image ? [item.image] : undefined,
                metadata: {
                    productId: item.productId || item.id || '',
                    size: item.size,
                    backorder: String(item.backorder)
                }
            }
        }
    }));

    if (shippingOption.price > 0) {
        lineItems.push({
            quantity: 1,
            price_data: {
                currency: 'usd',
                unit_amount: toStripeAmount(shippingOption.price),
                product_data: {
                    name: shippingOption.name,
                    description: shippingOption.time
                }
            }
        });
    }

    return lineItems;
}

function buildOrigin(event) {
    const host = sanitizeText(event.headers?.host, 'backdoordmv.netlify.app');
    const proto = sanitizeText(event.headers?.['x-forwarded-proto'], 'https');
    return `${proto}://${host}`;
}

function buildOrderNumber() {
    const stamp = Date.now().toString().slice(-6);
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `BD-${stamp}${suffix}`;
}

function buildDraftOrder(payload) {
    const cart = Array.isArray(payload?.cart) ? payload.cart.map(normalizeCartItem).filter((item) => item.name && item.price >= 0) : [];
    if (cart.length === 0) throw new Error('Cart is empty.');

    const subtotal = normalizeMoney(cart.reduce((sum, item) => sum + item.price * item.qty, 0));
    const shippingOption = getShippingOption(payload?.shippingMethod, subtotal);
    const tax = 0;
    const total = normalizeMoney(subtotal + shippingOption.price + tax);

    const customer = {
        firstName: sanitizeText(payload?.customer?.firstName),
        lastName: sanitizeText(payload?.customer?.lastName),
        email: sanitizeText(payload?.customer?.email).toLowerCase(),
        phone: sanitizeText(payload?.customer?.phone),
        name: [sanitizeText(payload?.customer?.firstName), sanitizeText(payload?.customer?.lastName)].filter(Boolean).join(' ').trim()
    };

    if (!customer.firstName || !customer.lastName || !customer.email) {
        throw new Error('Missing customer information.');
    }

    const shippingAddress = {
        street: sanitizeText(payload?.shippingAddress?.street || payload?.shippingAddress?.address1),
        address1: sanitizeText(payload?.shippingAddress?.address1 || payload?.shippingAddress?.street),
        address2: sanitizeText(payload?.shippingAddress?.address2),
        city: sanitizeText(payload?.shippingAddress?.city),
        state: sanitizeText(payload?.shippingAddress?.state),
        zip: sanitizeText(payload?.shippingAddress?.zip),
        country: sanitizeText(payload?.shippingAddress?.country, 'United States')
    };

    if (!shippingAddress.address1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip) {
        throw new Error('Missing shipping address.');
    }

    return {
        id: crypto.randomUUID(),
        orderNumber: buildOrderNumber(),
        status: 'checkout_created',
        paymentStatus: 'unpaid',
        customer,
        shippingAddress,
        items: cart,
        shippingMethod: shippingOption.id,
        shippingLabel: shippingOption.name,
        shippingTime: shippingOption.time,
        promoCode: null,
        pricing: {
            subtotal,
            discount: 0,
            shipping: shippingOption.price,
            tax,
            total
        }
    };
}

async function saveDraftOrder(draft, sessionId) {
    const db = getDb();
    await setDoc(doc(db, 'checkout_drafts', draft.id), {
        ...draft,
        checkoutSessionId: sessionId,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    }, { merge: true });
}

async function getDraftOrder(draftId) {
    const db = getDb();
    const snapshot = await getDoc(doc(db, 'checkout_drafts', draftId));
    return snapshot.exists() ? snapshot.data() : null;
}

function formatPaymentLabel(session) {
    const methods = Array.isArray(session?.payment_method_types) ? session.payment_method_types : [];
    if (methods.includes('card')) return 'Card via Stripe';
    if (methods.length === 0) return 'Stripe Checkout';
    return methods.map((method) => method.replace(/_/g, ' ')).join(', ');
}

function estimateDeliveryDate(shippingMethod) {
    const days = shippingMethod === 'overnight' ? 1 : shippingMethod === 'express' ? 3 : 7;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

async function finalizeOrderFromSession(session) {
    const draftId = sanitizeText(session?.metadata?.draftId);
    if (!draftId) return null;

    const draft = await getDraftOrder(draftId);
    if (!draft) return null;

    const db = getDb();
    const orderRef = doc(db, 'orders', draftId);
    const existingOrder = await getDoc(orderRef);
    if (existingOrder.exists()) {
        return existingOrder.data();
    }

    const totalFromStripe = normalizeMoney((Number(session?.amount_total) || 0) / 100);
    const orderData = {
        orderNumber: sanitizeText(draft.orderNumber, draftId),
        total: totalFromStripe || draft.pricing.total,
        subtotal: draft.pricing.subtotal,
        tax: draft.pricing.tax,
        status: 'pending',
        paymentStatus: sanitizeText(session?.payment_status, 'paid'),
        source: 'stripe_checkout',
        checkoutSessionId: sanitizeText(session?.id),
        paymentIntentId: sanitizeText(typeof session?.payment_intent === 'string' ? session.payment_intent : session?.payment_intent?.id),
        paymentMethodLabel: formatPaymentLabel(session),
        paymentMethodTypes: Array.isArray(session?.payment_method_types) ? session.payment_method_types : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        customer: draft.customer,
        shippingAddress: draft.shippingAddress,
        items: draft.items.map((item) => ({
            productId: item.productId || item.id,
            name: item.name,
            brand: item.brand,
            size: item.size,
            qty: item.qty,
            quantity: item.qty,
            price: item.price,
            image: item.image,
            backorder: item.backorder,
            backorderLeadTime: item.backorderLeadTime
        })),
        pricing: {
            ...draft.pricing,
            total: totalFromStripe || draft.pricing.total
        },
        shippingMethod: draft.shippingMethod,
        shippingLabel: draft.shippingLabel,
        shippingTime: draft.shippingTime,
        promoCode: draft.promoCode
    };

    await setDoc(orderRef, orderData, { merge: true });
    await updateDoc(doc(db, 'checkout_drafts', draftId), {
        status: 'paid',
        paymentStatus: sanitizeText(session?.payment_status, 'paid'),
        finalizedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    return {
        ...orderData,
        deliveryDate: estimateDeliveryDate(draft.shippingMethod)
    };
}

module.exports = {
    buildDraftOrder,
    buildLineItems,
    buildOrigin,
    finalizeOrderFromSession,
    formatPaymentLabel,
    getDraftOrder,
    getShippingOption,
    getStripe,
    json,
    normalizeMoney,
    saveDraftOrder
};
