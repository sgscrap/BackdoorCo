const {
    buildDraftOrder,
    buildLineItems,
    buildOrigin,
    getStripe,
    json,
    saveDraftOrder
} = require('./_shared/stripe-checkout');

const CHECKOUT_COUNTRIES = ['US', 'CA', 'GB', 'AU'];

function getPreferredPaymentMethodTypes(draft) {
    const total = Number(draft?.pricing?.total || 0);
    const country = String(draft?.shippingAddress?.country || 'US').toUpperCase();
    const methods = ['card'];

    if (country === 'US') {
        if (total >= 1 && total <= 4000) {
            methods.push('afterpay_clearpay', 'klarna');
        }

        if (total >= 35 && total <= 30000) {
            methods.push('affirm');
        }
    }

    return [...new Set(methods)];
}

function shouldRetryWithDynamicPaymentMethods(error) {
    const message = String(error?.message || '').toLowerCase();
    return (
        message.includes('payment_method_types') ||
        message.includes('afterpay') ||
        message.includes('klarna') ||
        message.includes('affirm') ||
        message.includes('not available') ||
        message.includes('not activated') ||
        message.includes('not supported')
    );
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed.' });
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const draft = buildDraftOrder(payload);
        const stripe = getStripe();
        const origin = buildOrigin(event);
        const shipping = {
            id: draft.shippingMethod,
            name: draft.shippingLabel,
            time: draft.shippingTime,
            price: draft.pricing.shipping
        };

        const sessionConfig = {
            mode: 'payment',
            submit_type: 'pay',
            billing_address_collection: 'auto',
            shipping_address_collection: {
                allowed_countries: CHECKOUT_COUNTRIES
            },
            customer_email: draft.customer.email,
            phone_number_collection: { enabled: true },
            allow_promotion_codes: true,
            line_items: buildLineItems(draft.items, shipping),
            locale: 'auto',
            success_url: `${origin}/checkout.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/checkout.html?checkout=cancelled&step=3`,
            payment_intent_data: {
                description: `Backdoor order ${draft.orderNumber}`,
                statement_descriptor_suffix: 'BACKDOOR',
                metadata: {
                    draftId: draft.id,
                    orderNumber: draft.orderNumber,
                    store: 'Backdoor'
                }
            },
            metadata: {
                draftId: draft.id,
                orderNumber: draft.orderNumber,
                store: 'Backdoor'
            }
        };

        let session;

        try {
            session = await stripe.checkout.sessions.create({
                ...sessionConfig,
                payment_method_types: getPreferredPaymentMethodTypes(draft)
            });
        } catch (error) {
            if (!shouldRetryWithDynamicPaymentMethods(error)) {
                throw error;
            }

            session = await stripe.checkout.sessions.create(sessionConfig);
        }

        await saveDraftOrder(draft, session.id);

        return json(200, {
            url: session.url,
            sessionId: session.id,
            orderNumber: draft.orderNumber
        });
    } catch (error) {
        console.error('create-checkout-session failed', error);
        return json(400, { error: error.message || 'Unable to create checkout session.' });
    }
};
