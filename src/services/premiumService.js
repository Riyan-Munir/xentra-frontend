import api from './api';

const premiumService = {
    /**
     * Fetch all active subscription plans.
     */
    getPlans: () => api.get('/premium/plans/'),

    /**
     * Fetch the current user's active subscription state.
     * @param {string} [role] - 'freelancer' or 'client' to isolate profile data
     */
    getActive: (role) => api.get('/premium/active/', {
        params: role ? { role } : {},
    }),

    /**
     * List the current user's premium payments.
     * @param {Object} [params] - { page, page_size, role }
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

    // ── Blockchain session endpoints (consolidated model) ────────────────

    /**
     * Start a blockchain payment session for a premium payment.
     * Sets session_status to 'awaiting_signature' and starts the 15-min timer.
     */
    startSession: (paymentId, data = {}) => api.post(
        `/premium/payments/${paymentId}/start-session/`,
        {
            recipient_address: data.recipientAddress || '',
            amount: data.amount || 0,
            wallet_provider: data.walletProvider || '',
            selected_wallet_address: data.selectedWalletAddress || '',
            chain_id: data.chainId || 56,
            token_contract: data.tokenContract || '',
            idempotency_key: data.idempotencyKey || '',
            reference_token: data.referenceToken || '',
        },
    ),

    /**
     * Submit a transaction hash after the user signs and broadcasts.
     */
    submitTx: (paymentId, data = {}) => api.post(
        `/premium/payments/${paymentId}/submit-tx/`,
        {
            tx_hash: data.txHash || '',
            from_address: data.fromAddress || '',
        },
    ),

    /**
     * Poll the current session status for a payment.
     */
    getSessionStatus: (paymentId) => api.get(
        `/premium/payments/${paymentId}/session-status/`,
    ),

    /**
     * Cancel an active blockchain session (only allowed before tx submission).
     */
    cancelSession: (paymentId) => api.post(
        `/premium/payments/${paymentId}/cancel-session/`,
    ),

    /**
     * Get the SSE stream URL for real-time session status updates.
     * Returns the URL string — caller creates an EventSource from it.
     */
    getStreamUrl: (paymentId) => {
        const baseURL = api.defaults?.baseURL || '';
        return `${baseURL}/premium/payments/${paymentId}/stream/`;
    },
};

export default premiumService;
