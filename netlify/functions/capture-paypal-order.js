const {
    capturePayPalOrder,
    createPublicOrderFromPayPal,
    formatPaymentLabel,
    getOrderCurrency,
    getOrderTotal,
    getShippingMethodFromOrder,
    getShippingOption,
    getPaymentStatus,
    json
} = require('./_shared/paypal-checkout');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed.' });
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const orderId = String(payload.orderId || '').trim();
        const pendingOrder = payload.pendingOrder && typeof payload.pendingOrder === 'object' ? payload.pendingOrder : null;
        if (!orderId) {
            return json(400, { error: 'Missing orderId.' });
        }

        const order = await capturePayPalOrder(orderId);
        let finalized = null;
        try {
            finalized = await createPublicOrderFromPayPal(order, pendingOrder);
        } catch (error) {
            console.error('paypal public order persist failed', error);
        }
        const shippingMethod = finalized?.shippingMethod || getShippingMethodFromOrder(order) || 'standard';
        const shippingTime = finalized?.shippingTime || getShippingOption(shippingMethod).time;
        const orderNumber = finalized?.orderNumber || order?.purchase_units?.[0]?.invoice_id || '';
        const customerEmail = finalized?.customerEmail || order?.payer?.email_address || '';
        const total = finalized?.total || getOrderTotal(order, finalized);
        const currency = getOrderCurrency(order);
        const paymentLabel = finalized?.paymentMethodLabel || formatPaymentLabel(order);

        return json(200, {
            orderId: order.id,
            paid: getPaymentStatus(order) === 'paid',
            status: order.status,
            paymentStatus: getPaymentStatus(order),
            orderNumber,
            customerEmail,
            total,
            currency,
            paymentLabel,
            shippingMethod,
            shippingTime
        });
    } catch (error) {
        console.error('capture-paypal-order failed', error);
        return json(400, { error: error.message || 'Unable to capture PayPal order.' });
    }
};
