import api from './api';

const callbackService = {
    /**
     * Validate a callback token and retrieve payment data.
     * Requires Bearer JWT in Authorization header.
     * @param {string} token - The plaintext callback token from the URL.
     * @returns {Promise} Response with payment data, wallet, profile info.
     */
    validate: (token) => api.post('/payments/callback/validate/', {
        callback_token: token,
    }),

    /**
     * Re-authenticate with captcha to switch profile.
     * @param {string} token - The plaintext callback token.
     * @param {string} cfToken - Cloudflare Turnstile token.
     * @returns {Promise} Response with new JWT tokens + payment data.
     */
    reAuth: (token, cfToken) => api.post('/payments/callback/re-auth/', {
        callback_token: token,
        cf_token: cfToken,
    }),

    /**
     * Get public info (required role) for a callback token.
     * No auth required.
     * @param {string} token - The plaintext callback token.
     * @returns {Promise} Response with { required_role }.
     */
    getPublicInfo: (token) => api.get('/payments/callback/info/', {
        params: { token },
    }),
};

export default callbackService;
