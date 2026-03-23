const {
    buildDraftOrder,
    buildLineItems,
    buildOrigin,
    getStripe,
    json,
    saveDraftOrder
} = require('./_shared/stripe-checkout');

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

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            submit_type: 'pay',
            billing_address_collection: 'auto',
            customer_email: draft.customer.email,
            phone_number_collection: { enabled: true },
            allow_promotion_codes: true,
            line_items: buildLineItems(draft.items, shipping),
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
        });

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
