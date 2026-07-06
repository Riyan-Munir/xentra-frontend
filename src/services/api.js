import axios from 'axios';
import { FrontendPacketFactory } from '../packet_templates/frontend_factory.js';
import { signingInterceptor } from './requestSigning.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

/**
 * Simple in-memory response cache with TTL.
 * GET responses cached for 30s to avoid redundant re-fetches (e.g., profile on section switches).
 */
const responseCache = new Map();
const CACHE_TTL = 30_000;

const getCacheKey = (config) => `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;

// ── Refresh token queue ───────────────────────────────────────────────
// If multiple requests 401 at the same time, only one refresh is in flight.
let isRefreshing = false;
let pendingRequests = [];

function processPendingRequests(newToken) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (newToken) {
      resolve(newToken);
    } else {
      reject(new Error('Token refresh failed'));
    }
  });
  pendingRequests = [];
}

/**
 * Silent JWT refresh — attempts to get a new access_token using the
 * stored refresh_token.  Returns the new access_token string, or null
 * if the refresh fails.
 */
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    // Strip trailing slash from base URL to avoid double-slash in path
    const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
    const response = await axios.post(
      `${baseUrl}/users/auth/token/refresh/`,
      { refresh: refreshToken }
    );
    const newToken = response.data.access;
    localStorage.setItem('access_token', newToken);
    return newToken;
  } catch {
    // Refresh failed — clear auth state
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return null;
  }
}

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // HMAC signing for bot-specific endpoints (only when VITE_REQUEST_SIGNING_SECRET is set)
  const signedConfig = await signingInterceptor(config);

  // Skip packet wrapping for GET requests to avoid unnecessary overhead
  if (signedConfig.method === 'get') return signedConfig;

  const isJsonRequest = signedConfig.headers?.['Content-Type']
    ? signedConfig.headers['Content-Type'].includes('application/json')
    : true;

  if (isJsonRequest && signedConfig.data && typeof signedConfig.data === 'object') {
    const packet = FrontendPacketFactory.createPacket(
      'frontend_request',
      signedConfig.data,
      'frontend'
    );
    signedConfig.data = packet.toDict();
  }

  return signedConfig;
});

api.interceptors.response.use(
  (response) => {
    // Cache GET responses
    if (response.config?.method === 'get') {
      responseCache.set(getCacheKey(response.config), {
        data: response.data,
        timestamp: Date.now()
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 429) {
      const message = error.response.data?.message || 'Rate limit exceeded. Please wait.';
      error.message = message;
      if (error.response.data) error.response.data.error = message;
      return Promise.reject(error);
    }

    // ── Captcha challenge intercept ─────────────────────────────
    // When the WAF blocks an anonymous request, it returns 403 with
    // require_captcha: true and a captcha_site_key.  Fire a custom DOM
    // event so the Dashboard can render the CaptchaChallenge overlay.
    if (
      error.response?.status === 403 &&
      error.response?.data?.require_captcha
    ) {
      window.dispatchEvent(
        new CustomEvent('xentra:captcha_required', {
          detail: error.response.data,
        })
      );
      return Promise.reject(error);
    }

    // Global hacking-alert intercept — fires a custom DOM event so Dashboard
    // can set hackingState.has_pending=true without the call site needing to
    // handle it individually.
    if (
      error.response?.status === 403 &&
      error.response?.data?.require_dismiss
    ) {
      window.dispatchEvent(
        new CustomEvent('xentra:hacking_alert', {
          detail: error.response.data,
        })
      );
      return Promise.reject(error);
    }

    // ── 401 → silent token refresh, then retry ─────────────────────
    // Session only expires from UI inactivity (15 min timer in Dashboard),
    // never from backend 401.  The JWT is refreshed transparently.
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/users/auth/token/refresh/'
    ) {
      if (isRefreshing) {
        // Queue this request until the in-flight refresh completes
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const newToken = await refreshAccessToken();

      if (newToken) {
        // Refresh succeeded — retry all queued requests
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processPendingRequests(newToken);
        isRefreshing = false;
        return api(originalRequest);
      } else {
        // Refresh failed — reject all queued requests
        processPendingRequests(null);
        isRefreshing = false;
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Cached GET — returns cached response if fresh (< 30s), otherwise fetches.
 * Pass { skipCache: true } to bypass cache (e.g., after mutation).
 */
api.cachedGet = async (url, config = {}) => {
  const cacheKey = getCacheKey({ method: 'get', url, params: config.params });

  if (!config.skipCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return { data: cached.data };
    }
  }

  return api.get(url, config);
};

/**
 * Invalidate all cached entries whose URL contains the given prefix.
 */
api.invalidateCache = (urlPrefix) => {
  for (const [key] of responseCache) {
    if (key.includes(urlPrefix)) {
      responseCache.delete(key);
    }
  }
};

/**
 * Clear the entire response cache (e.g., on role switch or logout).
 */
api.clearCache = () => {
  responseCache.clear();
};

/**
 * Fetch pending hacking attempt notifications for the current user.
 * The dashboard shows a mandatory popup if `has_pending` is true.
 */
export async function checkPendingHacking() {
  const resp = await api.get('/system-audits/pending-hacking/');
  return resp.data;
}

/**
 * Dismiss hacking attempt notifications.
 * @param {string[]} [notificationIds] - Optional array of specific IDs to dismiss.
 *        If omitted, ALL pending notifications are dismissed.
 */
export async function dismissHacking(notificationIds = null) {
  const payload = notificationIds ? { notification_ids: notificationIds } : {};
  const resp = await api.post('/system-audits/dismiss-hacking/', payload);
  return resp.data;
}

/**
 * Submit a Turnstile captcha token for verification.
 * Called by CaptchaChallenge after the user completes the widget.
 * The backend clears the pending captcha flag for the caller's IP.
 */
export async function captchaVerify(token) {
  const resp = await api.post('/system-audits/captcha/verify/', { cf_token: token });
  return resp.data;
}

/**
 * Fetch the public Cloudflare Turnstile site key so the frontend can render
 * the captcha widget before the user authenticates (login page).
 */
export async function fetchCaptchaChallenge() {
  const resp = await api.get('/system-audits/captcha/challenge/');
  return resp.data; // { site_key: string }
}

export default api;
