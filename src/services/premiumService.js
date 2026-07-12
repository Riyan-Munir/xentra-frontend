import api from './api';

/**
 * Base path for all premium endpoints.
 * Backend mounts premium_payments.urls at /api/v1/premium/
 */
const PREMIUM_BASE = '/premium';

export const premiumService = {
    /**
     * Fetch available subscription plans (filtered by role on backend).
     * GET /api/v1/premium/plans/
     */
    getPlans: async () => {
        const res = await api.cachedGet(`${PREMIUM_BASE}/plans/`);
        return res.data;
    },

    /**
     * Fetch the current user's active subscription (or null if free tier).
     * GET /api/v1/premium/active/
     */
    getActiveSubscription: async (skipCache = false) => {
        const res = await api.cachedGet(`${PREMIUM_BASE}/active/`, { skipCache });
        return res.data;
    },

    /**
     * Create a new premium payment (self-purchase or gift).
     * POST /api/v1/premium/payments/
     * @param {object} data - { plan_id, payment_type, giftee_system_id?, gift_message? }
     */
    createPayment: async (data) => {
        const res = await api.post(`${PREMIUM_BASE}/payments/`, data);
        api.invalidateCache(`${PREMIUM_BASE}/active`);
        return res.data;
    },

    /**
     * Submit a transaction hash for blockchain verification.
     * POST /api/v1/premium/payments/{payment_id}/verify/
     * Note: paymentId is the human-readable payment_id (e.g. FPM_XXXXXXXX), not the UUID.
     * @param {string} paymentId - The human-readable payment ID
     * @param {string} txHash - The BSC transaction hash
     */
    verifyPayment: async (paymentId, txHash) => {
        const res = await api.post(`${PREMIUM_BASE}/payments/${paymentId}/verify/`, { tx_hash: txHash });
        api.invalidateCache(`${PREMIUM_BASE}/active`);
        return res.data;
    },

    /**
     * Cancel a pending payment.
     * DELETE /api/v1/premium/payments/{payment_id}/cancel/
     * @param {string} paymentId - The human-readable payment ID
     */
    cancelPayment: async (paymentId) => {
        const res = await api.delete(`${PREMIUM_BASE}/payments/${paymentId}/cancel/`);
        return res.data;
    },

    /**
     * Fetch gifts sent by the current user.
     * GET /api/v1/premium/gifts/sent/
     */
    getSentGifts: async () => {
        const res = await api.get(`${PREMIUM_BASE}/gifts/sent/`);
        return res.data;
    },

    /**
     * Fetch gifts received by the current user.
     * GET /api/v1/premium/gifts/received/
     */
    getReceivedGifts: async () => {
        const res = await api.get(`${PREMIUM_BASE}/gifts/received/`);
        return res.data;
    },

    /**
     * Search for a user by Discord username (for gift flow).
     * Returns user with client/freelancer profiles if found.
     * @param {string} discordUsername - Discord username to search
     */
    searchUser: async (discordUsername) => {
        const res = await api.get(`/profiles/search/?discord_username=${encodeURIComponent(discordUsername)}`);
        return res.data;
    },
};
