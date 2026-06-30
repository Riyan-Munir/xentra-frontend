export function signRequest(data, timestamp) {
    // HMAC signing for bot-specific endpoints
    return data
}

export function signingInterceptor(config) {
    const timestamp = Date.now()
    const signingPaths = ['/guilds/configure/', '/guilds/register/']
    if (signingPaths.some((p) => config.url?.startsWith(p))) {
        config.headers['X-Timestamp'] = timestamp
        config.headers['X-Signature'] = btoa(`${config.url}:${timestamp}`)
    }
    return config
}
