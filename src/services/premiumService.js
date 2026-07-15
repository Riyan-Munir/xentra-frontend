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
     * List the current user's premium payments.
     * @param {Object} [params] - { page, page_size }
     */
    getPayments: (params = {}) => api.get('/premium/payments/', { params }),

    /**
     * Get a single payment by its payment_id.
     */
    getPayment: (paymentId) => api.get(`/premium/payments/${paymentId}/`),

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
     * Cancel a pending premium payment.
     */
    cancelPayment: (paymentId) => api.delete(`/premium/payments/${paymentId}/cancel/`),

    /**
     * Search for a user by Discord username (for gifting).
     */
    searchGiftUser: (username) => api.get('/premium/gifts/search/', {
        params: { username },
    }),
};

export default premiumService;
