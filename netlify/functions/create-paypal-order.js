const {
    buildDraftOrder,
    buildOrigin,
    createPayPalOrder,
    getApprovalUrl,
    json,
    saveDraftOrder
} = require('./_shared/paypal-checkout');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed.' });
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const draft = buildDraftOrder(payload);
        const origin = buildOrigin(event);
        const order = await createPayPalOrder(draft, origin);
        const approvalUrl = getApprovalUrl(order);

        if (!approvalUrl) {
            throw new Error('PayPal did not return an approval URL.');
        }

        await saveDraftOrder(draft, order.id, order.status);

        return json(200, {
            url: approvalUrl,
            orderId: order.id,
            orderNumber: draft.orderNumber
        });
    } catch (error) {
        console.error('create-paypal-order failed', error);
        return json(400, { error: error.message || 'Unable to start PayPal checkout.' });
    }
};
