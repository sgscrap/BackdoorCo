const {
    finalizeOrderFromSession,
    getDraftOrder,
    getStripe,
    json,
    normalizeMoney
} = require('./_shared/stripe-checkout');

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return json(405, { error: 'Method not allowed.' });
    }

    const sessionId = String(event.queryStringParameters?.session_id || '').trim();
    if (!sessionId) {
        return json(400, { error: 'Missing session_id.' });
    }

    try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent']
        });

        const paid = session.payment_status === 'paid';
        let finalized = null;
        if (paid) {
            finalized = await finalizeOrderFromSession(session);
        }

        const draft = session.metadata?.draftId ? await getDraftOrder(session.metadata.draftId) : null;

        return json(200, {
            sessionId: session.id,
            paid,
            status: session.status,
            paymentStatus: session.payment_status,
            orderNumber: draft?.orderNumber || session.metadata?.orderNumber || '',
            customerEmail: session.customer_details?.email || draft?.customer?.email || '',
            total: normalizeMoney((Number(session.amount_total) || 0) / 100),
            currency: String(session.currency || 'usd').toUpperCase(),
            paymentLabel: finalized?.paymentMethodLabel || 'Stripe Checkout',
            shippingMethod: draft?.shippingMethod || '',
            shippingTime: draft?.shippingTime || '',
            orderId: draft?.id || session.metadata?.draftId || ''
        });
    } catch (error) {
        console.error('checkout-session-status failed', error);
        return json(400, { error: error.message || 'Unable to load checkout session.' });
    }
};
