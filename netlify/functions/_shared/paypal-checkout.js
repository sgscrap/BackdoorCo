const crypto = require('crypto');
const admin = require('firebase-admin');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

const SHIPPING_OPTIONS = [
    { id: 'standard', name: 'Standard Shipping', time: '5-7 business days', price: 9.99 },
    { id: 'express', name: 'Express Shipping', time: '2-3 business days', price: 19.99 },
    { id: 'overnight', name: 'Overnight Shipping', time: 'Next business day', price: 34.99 }
];

const FREE_SHIP_THRESHOLD = 150;
const DEFAULT_BRAND_NAME = 'backdoorco.xyz';

let firestoreDb = null;
let paypalToken = null;
let paypalTokenExpiresAt = 0;
let publicFirestoreDb = null;

const firebaseConfig = {
    apiKey: 'AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw',
    authDomain: 'backdoorco.xyz',
    projectId: 'coalition-aec44',
    storageBucket: 'coalition-aec44.firebasestorage.app',
    messagingSenderId: '312196142925',
    appId: '1:312196142925:web:ba090f602c8b5a31b20904',
    measurementId: 'G-SPJ2FDLSKZ'
};

function initializeFirebaseAdmin() {
    if (admin.apps.length) return admin.app();

    const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim();
    const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase admin environment variables.');
    }

    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        })
    });
}

function normalizePrivateKey(rawValue) {
    let privateKey = String(rawValue || '');

    if (
        (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith('\'') && privateKey.endsWith('\''))
    ) {
        privateKey = privateKey.slice(1, -1);
    }

    privateKey = privateKey
        .replace(/\\r/g, '')
        .replace(/\r/g, '')
        .replace(/\\n/g, '\n')
        .trim();

    if (privateKey.includes('-----BEGIN PRIVATE KEY-----') && privateKey.includes('-----END PRIVATE KEY-----')) {
        privateKey = privateKey
            .replace(/-----BEGIN PRIVATE KEY-----\s*/, '-----BEGIN PRIVATE KEY-----\n')
            .replace(/\s*-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----');
    }

    return privateKey;
}

function getDb() {
    if (firestoreDb) return firestoreDb;
    initializeFirebaseAdmin();
    firestoreDb = admin.firestore();
    return firestoreDb;
}

function getPublicDb() {
    if (publicFirestoreDb) return publicFirestoreDb;

    const app = getApps().find((entry) => entry.name === 'paypal-checkout-public')
        || initializeApp(firebaseConfig, 'paypal-checkout-public');

    publicFirestoreDb = getFirestore(app);
    return publicFirestoreDb;
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

function toPayPalMoney(value) {
    return normalizeMoney(value).toFixed(2);
}

function normalizeCountryCode(value) {
    const input = sanitizeText(value, 'US').toUpperCase();
    const map = {
        'UNITED STATES': 'US',
        'UNITED STATES OF AMERICA': 'US',
        US: 'US',
        CANADA: 'CA',
        CA: 'CA',
        'UNITED KINGDOM': 'GB',
        UK: 'GB',
        GB: 'GB',
        AUSTRALIA: 'AU',
        AU: 'AU'
    };

    return map[input] || (input.length === 2 ? input : 'US');
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

function normalizePendingCartItem(item) {
    return normalizeCartItem(item);
}

function getShippingOption(id, subtotal = 0) {
    const option = SHIPPING_OPTIONS.find((entry) => entry.id === id) || SHIPPING_OPTIONS[0];
    const shippingPrice = subtotal >= FREE_SHIP_THRESHOLD && option.id === 'standard' ? 0 : option.price;
    return {
        ...option,
        price: normalizeMoney(shippingPrice)
    };
}

function buildOrigin(event) {
    const host = sanitizeText(event.headers?.host, 'backdoorco.xyz');
    const proto = sanitizeText(event.headers?.['x-forwarded-proto'], 'https');
    return `${proto}://${host}`;
}

function buildOrderNumber() {
    const stamp = Date.now().toString().slice(-6);
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `BD-${stamp}${suffix}`;
}

function sanitizeSoftDescriptor(value) {
    return sanitizeText(value, 'BACKDOORCO')
        .toUpperCase()
        .replace(/[^A-Z0-9 .-]/g, '')
        .slice(0, 22) || 'BACKDOORCO';
}

function buildDraftOrder(payload) {
    const cart = Array.isArray(payload?.cart) ? payload.cart.map(normalizeCartItem).filter((item) => item.name && item.price >= 0) : [];
    if (cart.length === 0) throw new Error('Cart is empty.');

    const subtotal = normalizeMoney(cart.reduce((sum, item) => sum + item.price * item.qty, 0));
    const shippingOption = getShippingOption(payload?.shippingMethod, subtotal);
    const requestedDiscount = normalizeMoney((Number(payload?.discountAmount) || 0) / 100);
    const discount = Math.min(subtotal, Math.max(0, requestedDiscount));
    const tax = 0;
    const total = normalizeMoney(subtotal - discount + shippingOption.price + tax);

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
        country: normalizeCountryCode(payload?.shippingAddress?.country || 'US')
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
        promoCode: sanitizeText(payload?.promoCode),
        pricing: {
            subtotal,
            discount,
            shipping: shippingOption.price,
            tax,
            total
        }
    };
}

function buildPayPalItems(items) {
    return items.map((item) => ({
        name: item.name.slice(0, 127),
        description: [item.brand, item.size !== 'One Size' ? `Size ${item.size}` : '', item.backorder ? 'Backorder' : '']
            .filter(Boolean)
            .join(' | ')
            .slice(0, 127),
        unit_amount: {
            currency_code: 'USD',
            value: toPayPalMoney(item.price)
        },
        quantity: String(item.qty),
        sku: sanitizeText(item.productId || item.id).slice(0, 127),
        category: 'PHYSICAL_GOODS'
    }));
}

function buildPayPalOrderPayload(draft, origin) {
    const brandName = sanitizeText(process.env.PAYPAL_BRAND_NAME, DEFAULT_BRAND_NAME);
    const softDescriptor = sanitizeSoftDescriptor(process.env.PAYPAL_SOFT_DESCRIPTOR);
    const amountBreakdown = {
        item_total: {
            currency_code: 'USD',
            value: toPayPalMoney(draft.pricing.subtotal)
        },
        shipping: {
            currency_code: 'USD',
            value: toPayPalMoney(draft.pricing.shipping)
        },
        tax_total: {
            currency_code: 'USD',
            value: toPayPalMoney(draft.pricing.tax)
        }
    };

    if (draft.pricing.discount > 0) {
        amountBreakdown.discount = {
            currency_code: 'USD',
            value: toPayPalMoney(draft.pricing.discount)
        };
    }

    return {
        intent: 'CAPTURE',
        payer: {
            name: {
                given_name: draft.customer.firstName,
                surname: draft.customer.lastName
            },
            email_address: draft.customer.email
        },
        purchase_units: [
            {
                reference_id: draft.id,
                custom_id: `${draft.id}|${draft.shippingMethod}`,
                invoice_id: draft.orderNumber,
                description: `Backdoor order ${draft.orderNumber}`.slice(0, 127),
                soft_descriptor: softDescriptor,
                amount: {
                    currency_code: 'USD',
                    value: toPayPalMoney(draft.pricing.total),
                    breakdown: amountBreakdown
                },
                items: buildPayPalItems(draft.items),
                shipping: {
                    name: {
                        full_name: draft.customer.name || `${draft.customer.firstName} ${draft.customer.lastName}`.trim()
                    },
                    address: {
                        address_line_1: draft.shippingAddress.address1,
                        address_line_2: draft.shippingAddress.address2 || undefined,
                        admin_area_2: draft.shippingAddress.city,
                        admin_area_1: draft.shippingAddress.state,
                        postal_code: draft.shippingAddress.zip,
                        country_code: draft.shippingAddress.country
                    }
                }
            }
        ],
        payment_source: {
            paypal: {
                experience_context: {
                    brand_name: brandName,
                    shipping_preference: 'SET_PROVIDED_ADDRESS',
                    landing_page: 'NO_PREFERENCE',
                    user_action: 'PAY_NOW',
                    contact_preference: 'NO_CONTACT_INFO',
                    return_url: `${origin}/checkout.html?checkout=success`,
                    cancel_url: `${origin}/checkout.html?checkout=cancelled&step=3`
                }
            }
        }
    };
}

function getCartSubtotalFromItems(items) {
    return normalizeMoney(items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0));
}

function getPayPalBaseUrl() {
    const mode = sanitizeText(process.env.PAYPAL_ENVIRONMENT || process.env.PAYPAL_MODE, 'live').toLowerCase();
    return mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

function getPayPalCredentials() {
    const clientId = sanitizeText(process.env.PAYPAL_CLIENT_ID);
    const clientSecret = sanitizeText(process.env.PAYPAL_CLIENT_SECRET);

    if (!clientId || !clientSecret) {
        throw new Error('Missing PayPal environment variables.');
    }

    return { clientId, clientSecret };
}

async function getPayPalAccessToken() {
    if (paypalToken && Date.now() < paypalTokenExpiresAt) {
        return paypalToken;
    }

    const { clientId, clientSecret } = getPayPalCredentials();
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json'
        },
        body: 'grant_type=client_credentials'
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
        throw new Error(extractPayPalError(payload) || 'Unable to authenticate with PayPal.');
    }

    paypalToken = payload.access_token;
    paypalTokenExpiresAt = Date.now() + (Math.max(60, Number(payload.expires_in) || 300) - 30) * 1000;
    return paypalToken;
}

function extractPayPalError(payload) {
    if (!payload || typeof payload !== 'object') return '';
    const detail = Array.isArray(payload.details) && payload.details[0]?.description ? payload.details[0].description : '';
    return sanitizeText(payload.message || detail || payload.error_description || payload.error);
}

async function paypalRequest(path, options = {}) {
    const token = await getPayPalAccessToken();
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...options.headers
    };

    let body = options.body;
    if (body && typeof body === 'object') {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
        method: options.method || 'GET',
        headers,
        body
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(extractPayPalError(payload) || `PayPal API request failed with status ${response.status}.`);
        error.statusCode = response.status;
        error.payload = payload;
        throw error;
    }

    return payload;
}

function getApprovalUrl(order) {
    return sanitizeText(
        order?.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href
    );
}

async function createPayPalOrder(draft, origin) {
    return paypalRequest('/v2/checkout/orders', {
        method: 'POST',
        body: buildPayPalOrderPayload(draft, origin),
        headers: {
            'PayPal-Request-Id': `create-${draft.id}`
        }
    });
}

function isAlreadyCapturedError(error) {
    const issue = sanitizeText(error?.payload?.details?.[0]?.issue).toUpperCase();
    const message = sanitizeText(error?.message).toUpperCase();
    return issue === 'ORDER_ALREADY_CAPTURED' || message.includes('ORDER_ALREADY_CAPTURED');
}

async function getPayPalOrder(orderId) {
    return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

async function capturePayPalOrder(orderId) {
    try {
        return await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
            method: 'POST',
            headers: {
                'PayPal-Request-Id': `capture-${orderId}`
            }
        });
    } catch (error) {
        if (!isAlreadyCapturedError(error)) {
            throw error;
        }
        return getPayPalOrder(orderId);
    }
}

async function saveDraftOrder(draft, orderId, paypalStatus) {
    const db = getDb();
    await db.collection('checkout_drafts').doc(draft.id).set({
        ...draft,
        provider: 'paypal',
        paypalOrderId: orderId,
        paypalStatus: sanitizeText(paypalStatus),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

async function getDraftOrder(draftId) {
    const db = getDb();
    const snapshot = await db.collection('checkout_drafts').doc(draftId).get();
    return snapshot.exists ? snapshot.data() : null;
}

function extractPayPalCapture(order) {
    return order?.purchase_units?.[0]?.payments?.captures?.[0] || null;
}

function getPayPalCustomId(order) {
    return sanitizeText(order?.purchase_units?.[0]?.custom_id);
}

function formatPaymentLabel(order) {
    const source = order?.payment_source || {};
    if (source.venmo) return 'Venmo via PayPal';
    if (source.card?.brand) return `${source.card.brand} via PayPal`;
    if (source.card) return 'Card via PayPal';
    if (source.paypal) return 'PayPal Checkout';
    return 'PayPal Checkout';
}

function estimateDeliveryDate(shippingMethod) {
    const days = shippingMethod === 'overnight' ? 1 : shippingMethod === 'express' ? 3 : 7;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

function getDraftIdFromOrder(order) {
    const customId = getPayPalCustomId(order);
    if (customId.includes('|')) {
        return sanitizeText(customId.split('|')[0]);
    }

    return sanitizeText(customId || order?.purchase_units?.[0]?.reference_id);
}

function getShippingMethodFromOrder(order) {
    const customId = getPayPalCustomId(order);
    if (customId.includes('|')) {
        return sanitizeText(customId.split('|')[1]);
    }

    return '';
}

function getOrderTotal(order, draft) {
    const capture = extractPayPalCapture(order);
    const rawValue = capture?.amount?.value || order?.purchase_units?.[0]?.amount?.value;
    const parsed = normalizeMoney(Number(rawValue));
    return parsed || draft?.pricing?.total || 0;
}

function getOrderCurrency(order) {
    return sanitizeText(
        extractPayPalCapture(order)?.amount?.currency_code ||
        order?.purchase_units?.[0]?.amount?.currency_code,
        'USD'
    ).toUpperCase();
}

function normalizePendingOrder(payload) {
    if (!payload || typeof payload !== 'object') return null;

    const items = Array.isArray(payload.cart) ? payload.cart.map(normalizePendingCartItem).filter((item) => item.name) : [];
    if (items.length === 0) return null;

    const subtotal = getCartSubtotalFromItems(items);
    const discount = normalizeMoney((Number(payload.discountAmount) || 0) / 100);
    const shippingOption = getShippingOption(payload.shippingMethod, subtotal);

    return {
        orderNumber: sanitizeText(payload.orderNumber),
        customer: {
            firstName: sanitizeText(payload.customer?.firstName),
            lastName: sanitizeText(payload.customer?.lastName),
            email: sanitizeText(payload.customer?.email).toLowerCase(),
            phone: sanitizeText(payload.customer?.phone),
            name: [sanitizeText(payload.customer?.firstName), sanitizeText(payload.customer?.lastName)].filter(Boolean).join(' ').trim()
        },
        shippingAddress: {
            address1: sanitizeText(payload.shippingAddress?.address1),
            address2: sanitizeText(payload.shippingAddress?.address2),
            city: sanitizeText(payload.shippingAddress?.city),
            state: sanitizeText(payload.shippingAddress?.state),
            zip: sanitizeText(payload.shippingAddress?.zip),
            country: normalizeCountryCode(payload.shippingAddress?.country || 'US')
        },
        items,
        shippingMethod: shippingOption.id,
        shippingLabel: shippingOption.name,
        shippingTime: shippingOption.time,
        promoCode: sanitizeText(payload.promoCode),
        pricing: {
            subtotal,
            discount,
            shipping: shippingOption.price,
            tax: 0,
            total: normalizeMoney(subtotal - discount + shippingOption.price)
        }
    };
}

function normalizePayPalOrderItems(order) {
    const items = Array.isArray(order?.purchase_units?.[0]?.items) ? order.purchase_units[0].items : [];

    return items.map((item) => ({
        id: sanitizeText(item?.sku || item?.name),
        productId: sanitizeText(item?.sku || item?.name),
        name: sanitizeText(item?.name),
        brand: sanitizeText(item?.description?.split('|')[0]),
        size: sanitizeText(
            item?.description?.split('|').map((part) => part.trim()).find((part) => part.startsWith('Size '))?.replace(/^Size\s+/, ''),
            'One Size'
        ),
        image: '',
        qty: Math.max(1, Number(item?.quantity) || 1),
        price: normalizeMoney(item?.unit_amount?.value),
        backorder: sanitizeText(item?.description).toLowerCase().includes('backorder'),
        backorderLeadTime: ''
    })).filter((item) => item.name);
}

function normalizePayPalShippingAddress(order) {
    const shipping = order?.purchase_units?.[0]?.shipping;
    const address = shipping?.address || {};
    return {
        address1: sanitizeText(address.address_line_1),
        address2: sanitizeText(address.address_line_2),
        city: sanitizeText(address.admin_area_2),
        state: sanitizeText(address.admin_area_1),
        zip: sanitizeText(address.postal_code),
        country: normalizeCountryCode(address.country_code || 'US')
    };
}

function normalizePayPalCustomer(order) {
    const payer = order?.payer || {};
    const givenName = sanitizeText(payer?.name?.given_name);
    const surname = sanitizeText(payer?.name?.surname);
    return {
        firstName: givenName,
        lastName: surname,
        email: sanitizeText(payer?.email_address).toLowerCase(),
        phone: sanitizeText(
            payer?.phone?.phone_number?.national_number ||
            payer?.phone?.national_number
        ),
        name: [givenName, surname].filter(Boolean).join(' ').trim()
    };
}

function normalizeOrderFromPayPal(order) {
    const items = normalizePayPalOrderItems(order);
    if (items.length === 0) return null;

    const subtotal = getCartSubtotalFromItems(items);
    const shippingMethod = getShippingMethodFromOrder(order) || 'standard';
    const shippingOption = getShippingOption(shippingMethod, subtotal);
    const amountBreakdown = order?.purchase_units?.[0]?.amount?.breakdown || {};
    const discount = normalizeMoney(amountBreakdown?.discount?.value || 0);
    const tax = normalizeMoney(amountBreakdown?.tax_total?.value || 0);

    return {
        orderNumber: sanitizeText(order?.purchase_units?.[0]?.invoice_id),
        customer: normalizePayPalCustomer(order),
        shippingAddress: normalizePayPalShippingAddress(order),
        items,
        shippingMethod,
        shippingLabel: shippingOption.name,
        shippingTime: shippingOption.time,
        promoCode: '',
        pricing: {
            subtotal,
            discount,
            shipping: normalizeMoney(amountBreakdown?.shipping?.value || shippingOption.price),
            tax,
            total: normalizeMoney(order?.purchase_units?.[0]?.amount?.value || subtotal - discount + shippingOption.price + tax)
        }
    };
}

async function persistPublicOrderRecord(orderId, orderData) {
    const db = getPublicDb();
    await setDoc(doc(db, 'orders', orderId), {
        ...orderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

async function createPublicOrderFromPayPal(order, pendingPayload) {
    const pending = normalizePendingOrder(pendingPayload) || normalizeOrderFromPayPal(order);
    if (!pending) {
        throw new Error('Missing fallback order data for public Firestore order write.');
    }

    const capture = extractPayPalCapture(order);
    const draftId = getDraftIdFromOrder(order) || sanitizeText(order?.id);
    const totalFromPayPal = getOrderTotal(order, pending);
    const paymentStatus = getPaymentStatus(order);
    const shippingMethod = pending.shippingMethod || getShippingMethodFromOrder(order) || 'standard';
    const shippingOption = getShippingOption(shippingMethod, pending.pricing.subtotal);
    const orderData = {
        orderNumber: pending.orderNumber || sanitizeText(order?.purchase_units?.[0]?.invoice_id, draftId),
        total: totalFromPayPal,
        subtotal: pending.pricing.subtotal,
        tax: pending.pricing.tax,
        status: 'pending',
        paymentStatus,
        source: 'paypal_checkout',
        paypalOrderId: sanitizeText(order?.id),
        paypalCaptureId: sanitizeText(capture?.id),
        paymentMethodLabel: formatPaymentLabel(order),
        paymentMethodTypes: Object.keys(order?.payment_source || {}),
        customer: pending.customer,
        customerName: sanitizeText(pending.customer?.name),
        customerEmail: sanitizeText(order?.payer?.email_address || pending.customer?.email),
        shippingAddress: pending.shippingAddress,
        items: pending.items.map((item) => ({
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
            ...pending.pricing,
            shipping: shippingOption.price,
            total: totalFromPayPal
        },
        shippingMethod,
        shippingLabel: shippingOption.name,
        shippingTime: shippingOption.time,
        promoCode: pending.promoCode || null
    };

    try {
        await persistPublicOrderRecord(draftId, orderData);
    } catch (error) {
        console.error('public firestore order create failed', error);
    }

    return orderData;
}

function getPaymentStatus(order) {
    const captureStatus = sanitizeText(extractPayPalCapture(order)?.status).toLowerCase();
    if (captureStatus === 'completed') return 'paid';
    const orderStatus = sanitizeText(order?.status).toLowerCase();
    return orderStatus || 'pending';
}

async function finalizeOrderFromPayPalOrder(order) {
    const draftId = getDraftIdFromOrder(order);
    if (!draftId) return null;

    const draft = await getDraftOrder(draftId);
    if (!draft) return null;

    const db = getDb();
    const orderRef = db.collection('orders').doc(draftId);
    const existingOrder = await orderRef.get();
    if (existingOrder.exists) {
        return existingOrder.data();
    }

    const capture = extractPayPalCapture(order);
    const totalFromPayPal = getOrderTotal(order, draft);
    const orderData = {
        orderNumber: sanitizeText(draft.orderNumber, draftId),
        total: totalFromPayPal,
        subtotal: draft.pricing.subtotal,
        tax: draft.pricing.tax,
        status: 'pending',
        paymentStatus: getPaymentStatus(order),
        source: 'paypal_checkout',
        paypalOrderId: sanitizeText(order?.id),
        paypalCaptureId: sanitizeText(capture?.id),
        paymentMethodLabel: formatPaymentLabel(order),
        paymentMethodTypes: Object.keys(order?.payment_source || {}),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        customer: draft.customer,
        customerName: sanitizeText(draft.customer?.name),
        customerEmail: sanitizeText(draft.customer?.email),
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
            total: totalFromPayPal
        },
        shippingMethod: draft.shippingMethod,
        shippingLabel: draft.shippingLabel,
        shippingTime: draft.shippingTime,
        promoCode: draft.promoCode || null
    };

    await orderRef.set(orderData, { merge: true });
    await db.collection('checkout_drafts').doc(draftId).set({
        status: 'paid',
        paymentStatus: orderData.paymentStatus,
        paypalStatus: sanitizeText(order?.status),
        finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return {
        ...orderData,
        deliveryDate: estimateDeliveryDate(draft.shippingMethod)
    };
}

module.exports = {
    buildDraftOrder,
    buildOrigin,
    capturePayPalOrder,
    createPayPalOrder,
    finalizeOrderFromPayPalOrder,
    formatPaymentLabel,
    getDraftIdFromOrder,
    getDraftOrder,
    getOrderCurrency,
    getOrderTotal,
    getShippingOption,
    getShippingMethodFromOrder,
    getPaymentStatus,
    getPayPalOrder,
    getApprovalUrl,
    json,
    normalizeMoney,
    createPublicOrderFromPayPal,
    saveDraftOrder
};
