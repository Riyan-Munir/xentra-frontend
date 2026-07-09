import api from './api';

const walletService = {
    /**
     * List wallets for the authenticated user.
     * @param {'freelancer'|'client'} walletType — role type filter
     * @returns {Promise} — Array of wallet objects
     */
    list: (walletType) => {
        const params = walletType ? { type: walletType } : {};
        return api.get('/wallets/', { params });
    },

    /**
     * Register a new wallet address.
     * @param {'freelancer'|'client'} walletType
     * @param {{ address: string, label?: string }} data
     * @returns {Promise} — Created wallet object
     */
    create: (walletType, { address, label = '' }) =>
        api.post('/wallets/', {
            wallet_type: walletType,
            address: address.trim(),
            label: label.trim(),
        }),

    /**
     * Get a signing challenge (verification token) for a pending wallet.
     * @param {'freelancer'|'client'} walletType
     * @param {string} walletId — wallet UUID or prefixed ID
     * @returns {Promise} — { verification_token, message }
     */
    getChallenge: (walletType, walletId) =>
        api.post('/wallets/challenge/', {
            wallet_type: walletType,
            wallet_id: walletId,
        }),

    /**
     * Verify wallet ownership by submitting the EIP-191 signature.
     * @param {'freelancer'|'client'} walletType
     * @param {string} walletId
     * @param {string} signature — hex-encoded signature
     * @returns {Promise} — Updated wallet object
     */
    verify: (walletType, walletId, signature) =>
        api.post('/wallets/verify/', {
            wallet_type: walletType,
            wallet_id: walletId,
            signature: signature.trim(),
        }),

    /**
     * Set a verified wallet as the user's default.
     * @param {'freelancer'|'client'} walletType
     * @param {string} walletId
     * @returns {Promise} — Updated wallet object
     */
    setDefault: (walletType, walletId) =>
        api.post('/wallets/set-default/', {
            wallet_type: walletType,
            wallet_id: walletId,
        }),

    /**
     * Disable (soft-delete) a wallet.
     * @param {'freelancer'|'client'} walletType
     * @param {string} walletId
     * @returns {Promise} — { status: 'disabled', wallet }
     */
    remove: (walletType, walletId) =>
        api.delete(`/wallets/${walletId}/`),

    /**
     * Get wallet details by ID.
     * @param {string} walletId
     * @returns {Promise} — Wallet object
     */
    getDetail: (walletId) =>
        api.get(`/wallets/${walletId}/`),
};

export default walletService;
