import api from './api';

const premiumService = {
    /**
     * Fetch all active subscription plans.
     */
    getPlans: () => api.get('/premium/plans/'),

    /**
     * Fetch the current user's active subscription state.
     */
    getActive: () => api.get('/premium/active/'),

    /**
     * Create a new premium payment (self-purchase or gift).
     * Amount is NEVER sent from frontend — resolved server-side from plan.
     */
    createPayment: (data) => api.post('/premium/payments/', {
        plan_id: data.plan_id,
        payment_type: data.payment_type || 'subscription',
        giftee_system_id: data.giftee_system_id || null,
        gift_message: data.gift_message || '',
    }),

    /**
     * List user's premium payments with pagination.
     */
    getPayments: (params = {}) => api.get('/premium/payments/', { params }),

    /**
     * Get a specific payment detail.
     */
    getPayment: (paymentId) => api.get(`/premium/payments/${paymentId}/`),

    /**
     * Submit a tx_hash for blockchain verification.
     */
    verifyPayment: (paymentId, txHash) => api.post(`/premium/payments/${paymentId}/verify/`, {
        tx_hash: txHash,
    }),

    /**
     * Cancel a pending payment.
     */
    cancelPayment: (paymentId) => api.delete(`/premium/payments/${paymentId}/cancel/`),

    /**
     * Get sent gifts history.
     */
    getGiftsSent: () => api.get('/premium/gifts/sent/'),

    /**
     * Get received gifts history.
     */
    getGiftsReceived: () => api.get('/premium/gifts/received/'),

    /**
     * Search for a user by Discord username (for gifting).
     */
    searchGiftUser: (username) => api.get('/premium/gifts/search/', {
        params: { username },
    }),
};

export default premiumService;
