const {
    finalizeOrderFromSession,
    getStripe,
    json
} = require('./_shared/stripe-checkout');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed.' });
    }

    const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
        return json(400, { error: 'Missing STRIPE_WEBHOOK_SECRET environment variable.' });
    }

    try {
        const stripe = getStripe();
        const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
        const stripeEvent = stripe.webhooks.constructEvent(event.body, signature, webhookSecret);

        if (stripeEvent.type === 'checkout.session.completed' || stripeEvent.type === 'checkout.session.async_payment_succeeded') {
            await finalizeOrderFromSession(stripeEvent.data.object);
        }

        return json(200, { received: true });
    } catch (error) {
        console.error('stripe-webhook failed', error);
        return json(400, { error: error.message || 'Webhook verification failed.' });
    }
};
