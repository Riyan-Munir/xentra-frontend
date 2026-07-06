/**
 * HMAC-SHA256 request signing for frontend-to-backend communication.
 *
 * ⚠️ IMPORTANT SECURITY NOTE:
 * Exposing REQUEST_SIGNING_SECRET in the browser makes it visible to anyone
 * who inspects the JavaScript source. Therefore:
 *
 * - **Bot** → **Backend**: Uses this signing utility server-side (secure).
 * - **Frontend** → **Backend**: Uses JWT Bearer tokens (Discord OAuth2).
 *   HMAC signing for the frontend is DISABLED by default, the frontend
 *   authenticates via Bearer tokens, which is the correct approach for
 *   browser-based clients.
 *
 * If you need frontend requests to be HMAC-signed in the future:
 *   1. Set VITE_REQUEST_SIGNING_SECRET in the Vercel environment.
 *   2. Uncomment the `signingInterceptor` line in api.js.
 *
 * Algorithm
 * ---------
 * Mirrors the backend's ``_compute_signature()`` in ``common/signing.py``:
 *
 *     HMAC-SHA256(secret, method | '\\n' | path | '\\n' | body_hash | '\\n' | timestamp | '\\n' | nonce)
 */

/**
 * @returns {string|null} The HMAC signing secret, or null if not configured.
 */
function getSigningSecret() {
    const secret = import.meta.env.VITE_REQUEST_SIGNING_SECRET;
    return secret && secret.length > 0 ? secret : null;
}

/**
 * Compute SHA-256 hex digest using the Web Crypto API.
 *
 * @param {string} str - Input string
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
async function sha256Hex(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute HMAC-SHA256 hex digest using the Web Crypto API.
 *
 * @param {string} secret - HMAC key
 * @param {string} data - Data to sign
 * @returns {Promise<string>} Hex-encoded HMAC-SHA256
 */
async function hmacSha256Hex(secret, data) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const sigArray = Array.from(new Uint8Array(signature));
    return sigArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute HMAC-SHA256 signature, identical algorithm to backend's
 * ``_compute_signature()`` in ``common/signing.py``.
 *
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE, …)
 * @param {string} path - URL path (e.g., /api/v1/rooms/bot/quota-check/)
 * @param {string} bodyStr - Raw request body as string
 * @param {string} timestamp - Unix epoch seconds as string
 * @param {string} nonce - Unique nonce
 * @param {string} secret - HMAC signing key
 * @returns {Promise<string>} Hex signature
 */
async function computeSignature(method, path, bodyStr, timestamp, nonce, secret) {
    const bodyHash = await sha256Hex(bodyStr);
    const canonical = [method.toUpperCase(), path, bodyHash, timestamp, nonce].join('\n');
    return hmacSha256Hex(secret, canonical);
}

/**
 * Build HMAC signing headers for an outgoing request.
 *
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE, …)
 * @param {string} path - URL **path** only (e.g. /api/v1/rooms/bot/quota-check/).
 *        Do NOT include scheme/host.
 * @param {string|object} [body=''] - Request body. Objects are JSON-stringified.
 * @returns {Promise<object|null>} Headers dict or null if secret not configured.
 */
export async function getSigningHeaders(method, path, body = '') {
    const secret = getSigningSecret();
    if (!secret) return null;

    let bodyStr = '';
    if (typeof body === 'string') {
        bodyStr = body;
    } else if (body !== null && body !== undefined) {
        bodyStr = JSON.stringify(body);
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = (await sha256Hex(`${timestamp}:${path}:${performance.now()}`)).slice(0, 32);
    const signature = await computeSignature(method, path, bodyStr, timestamp, nonce, secret);

    return {
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Signature': signature,
    };
}

/**
 * Determine if a path matches a bot-specific endpoint prefix.
 *
 * @param {string} path - URL path
 * @returns {boolean}
 */
export function isBotEndpoint(path) {
    return (
        path.startsWith('/api/v1/rooms/bot/') ||
        path.startsWith('/api/v1/jobs/bot/') ||
        path.startsWith('/api/v1/users/bot/')
    );
}

/**
 * Axios request interceptor that automatically adds HMAC signing headers
 * to requests to bot-specific endpoints.
 *
 * ⚠️ Only use this if VITE_REQUEST_SIGNING_SECRET is set in the Vercel
 * environment. By default, the frontend authenticates via JWT Bearer tokens
 * (Discord OAuth2), which is the correct approach for browser-based clients.
 *
 * Usage (in api.js)::
 *
 *   import { signingInterceptor } from '../services/requestSigning.js';
 *   api.interceptors.request.use(signingInterceptor);
 *
 * @param {object} config - Axios request config
 * @returns {Promise<object>} Updated config with signing headers
 */
export async function signingInterceptor(config) {
    // Only sign requests going to bot-specific backend endpoints
    if (!config.url || !isBotEndpoint(config.url)) {
        return config;
    }

    let bodyStr = '';
    if (config.data) {
        bodyStr = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
    }

    const headers = await getSigningHeaders(
        config.method.toUpperCase(),
        config.url,
        bodyStr,
    );

    if (headers) {
        Object.assign(config.headers, headers);
    }

    return config;
}
