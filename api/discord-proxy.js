// ────────────────────────────────────────────────────────────
// Vercel Serverless Function, Discord API Proxy
// ────────────────────────────────────────────────────────────
// Route:    POST /api/discord-proxy
// Auth:     X-Proxy-Key header matching DISCORD_PROXY_KEY env var
// Body:     { method, url, data?, headers?, params? }
// Response: { status_code, body }
//
// This function runs on AWS Lambda (Vercel's infrastructure),
// which uses unblocked IP ranges, Cloudflare Bot Management
// blocks HF Spaces' IP range at the TLS handshake level, so
// we route all Discord API calls through here.
// ────────────────────────────────────────────────────────────

const ALLOWED_HOSTS = ['discord.com', 'cdn.discordapp.com', 'discordapp.com'];

export default async function handler(req, res) {
    // ── CORS headers (for development) ────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Key');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed. Use POST.' });
    }

    // ── Authenticate ───────────────────────────────────────
    const proxyKey = req.headers['x-proxy-key'];
    const expectedKey = process.env.DISCORD_PROXY_KEY;

    if (!expectedKey) {
        console.error('[discord-proxy] DISCORD_PROXY_KEY is not configured in Vercel environment variables');
        return res.status(500).json({ status: 'error', message: 'Proxy key not configured on server' });
    }

    // Use timing-safe comparison
    if (!proxyKey || proxyKey.length !== expectedKey.length) {
        return res.status(403).json({ status: 'error', message: 'Invalid or missing X-Proxy-Key' });
    }

    // Constant-time comparison to prevent timing attacks
    let match = true;
    for (let i = 0; i < expectedKey.length; i++) {
        match = match && (proxyKey[i] === expectedKey[i]);
    }
    if (!match) {
        return res.status(403).json({ status: 'error', message: 'Invalid X-Proxy-Key' });
    }

    // ── Parse request body ─────────────────────────────────
    let method, targetUrl, data, headers, params;
    try {
        ({ method, url: targetUrl, data, headers, params } = req.body || {});
    } catch {
        return res.status(400).json({ status: 'error', message: 'Invalid JSON body' });
    }

    if (!method || !targetUrl) {
        return res.status(400).json({ status: 'error', message: 'Missing required fields: method, url' });
    }

    // ── Validate URL, only allow Discord domains ──────────
    let parsedUrl;
    try {
        parsedUrl = new URL(targetUrl);
    } catch {
        return res.status(400).json({ status: 'error', message: 'Invalid URL' });
    }

    const isAllowed = ALLOWED_HOSTS.some(host =>
        parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.' + host)
    );
    if (!isAllowed) {
        return res.status(403).json({
            status: 'error',
            message: `Domain not allowed: ${parsedUrl.hostname}`,
        });
    }

    // Only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ status: 'error', message: 'Only HTTPS URLs are allowed' });
    }

    // ── Build fetch options ────────────────────────────────
    const fetchOptions = {
        method: method.toUpperCase(),
        headers: {
            ...(headers || {}),
            // Ensure standard headers
            'Accept': 'application/json',
        },
    };

    // Add body for non-GET requests
    if (data && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD') {
        const contentType = (headers && headers['Content-Type']) || 'application/json';

        if (contentType.includes('application/x-www-form-urlencoded')) {
            // URL-encoded form data
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(data)) {
                params.append(key, value);
            }
            fetchOptions.body = params.toString();
        } else {
            // JSON by default
            fetchOptions.body = JSON.stringify(data);
            if (!headers || !headers['Content-Type']) {
                fetchOptions.headers['Content-Type'] = 'application/json';
            }
        }
    }

    // Add query params for GET requests
    let fullUrl = targetUrl;
    if (params && method.toUpperCase() === 'GET') {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            searchParams.append(key, value);
        }
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + searchParams.toString();
    }

    // ── Forward to Discord ─────────────────────────────────
    // Use AbortController for timeout (Node 18+)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    fetchOptions.signal = controller.signal;

    let discordResponse;
    try {
        discordResponse = await fetch(fullUrl, fetchOptions);
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            console.error(`[discord-proxy] Request to ${targetUrl} timed out after 30s`);
            return res.status(504).json({ status: 'error', message: 'Discord API request timed out' });
        }
        console.error(`[discord-proxy] fetch error for ${targetUrl}:`, error.message);
        return res.status(502).json({ status: 'error', message: `Discord API request failed: ${error.message}` });
    }
    clearTimeout(timeout);

    // ── Read response body ─────────────────────────────────
    const contentType = discordResponse.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
        try {
            body = await discordResponse.json();
        } catch {
            // Fallback to text if JSON parsing fails
            body = await discordResponse.text();
        }
    } else {
        body = await discordResponse.text();
    }

    // ── Return to caller ───────────────────────────────────
    return res.status(200).json({
        status_code: discordResponse.status,
        body: body,
    });
}
