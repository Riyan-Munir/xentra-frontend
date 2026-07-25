import api from './api';

/**
 * Payment Session Service — manages PaymentSession lifecycle from the frontend.
 *
 * Endpoints mirror the backend session API:
 *   POST   /api/v1/blockchain/session/create/
 *   POST   /api/v1/blockchain/session/<id>/submit/
 *   GET    /api/v1/blockchain/session/<id>/status/
 *   POST   /api/v1/blockchain/session/<id>/cancel/
 */
const paymentSessionService = {
    /**
     * Create a new PaymentSession for a given payment.
     * @param {Object} data
     * @param {number} data.paymentContentTypeId - ContentType ID of the payment model
     * @param {string} data.paymentObjectId - UUID of the payment record
     * @param {string} [data.sessionType='SUBSCRIPTION'] - PaymentSessionType enum value
     * @param {string} data.recipientAddress - Wallet that will receive the USDT
     * @param {number} data.amount - Human-readable USDT amount (e.g., 5.00)
     * @param {string} data.walletProvider - WalletProvider key (e.g., 'METAMASK')
     * @param {number} [data.chainId=56] - BSC chain ID
     * @param {string} [data.tokenContract] - USDT contract address (default from backend)
     * @returns {Promise} Response with session_id, reference_token, recipient_address,
     *                    amount, token_contract, chain_id, wallet_provider, expires_at, status
     */
    createSession: (data) => api.post('/blockchain/session/create/', {
        payment_content_type_id: data.paymentContentTypeId,
        payment_object_id: data.paymentObjectId,
        session_type: (data.sessionType || 'subscription').toLowerCase(),
        recipient_address: data.recipientAddress,
        amount: data.amount,
        wallet_provider: data.walletProvider,
        chain_id: data.chainId || 56,
        token_contract: data.tokenContract || undefined,
        selected_wallet_address: data.selectedWalletAddress || '',
    }),

    /**
     * Submit a transaction hash after the user has sent USDT from their wallet.
     * @param {string} sessionId - UUID of the PaymentSession
     * @param {string} txHash - The transaction hash (0x...)
     * @param {string} [fromAddress] - Optional sender wallet address (avoids scanner log parsing)
     * @returns {Promise} Response with session_id, status, status_display, tx_hash
     */
    submitTransaction: (sessionId, txHash, fromAddress) =>
        api.post(`/blockchain/session/${sessionId}/submit/`, {
            tx_hash: txHash,
            ...(fromAddress ? { from_address: fromAddress } : {}),
        }),

    /**
     * Poll the current status of a PaymentSession.
     * @param {string} sessionId - UUID of the PaymentSession
     * @returns {Promise} Response with session_id, status, status_display,
     *                    is_expired, is_terminal, remaining_seconds
     */
    getStatus: (sessionId) =>
        api.get(`/blockchain/session/${sessionId}/status/`),

    /**
     * Cancel a PaymentSession (only allowed in CREATED state).
     * @param {string} sessionId - UUID of the PaymentSession
     * @returns {Promise} Response with session_id, status, status_display
     */
    cancelSession: (sessionId) =>
        api.post(`/blockchain/session/${sessionId}/cancel/`),
};

export default paymentSessionService;
