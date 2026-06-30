import axios from 'axios'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: `${API_BASE}/api` })

const cache = new Map()
const CACHE_TTL = 30000

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true
            const refresh = localStorage.getItem('refresh_token')
            if (refresh) {
                try {
                    const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh })
                    localStorage.setItem('access_token', data.access)
                    original.headers.Authorization = `Bearer ${data.access}`
                    return api(original)
                } catch { localStorage.clear(); window.location.href = '/login' }
            }
        }
        if (error.response?.status === 403) {
            if (error.response.data?.require_captcha) {
                window.dispatchEvent(new CustomEvent('xentra:captcha_required', { detail: error.response.data }))
            }
            if (error.response.data?.require_dismiss) {
                window.dispatchEvent(new CustomEvent('xentra:hacking_alert', { detail: error.response.data }))
            }
        }
        return Promise.reject(error)
    }
)

export function cachedGet(url, params) {
    const key = `${url}?${JSON.stringify(params)}`
    if (cache.has(key)) {
        const entry = cache.get(key)
        if (Date.now() - entry.time < CACHE_TTL) return Promise.resolve(entry.data)
    }
    return api.get(url, { params }).then((res) => {
        cache.set(key, { data: res.data, time: Date.now() })
        return res.data
    })
}

export function invalidateCache(pattern) {
    for (const key of cache.keys()) {
        if (key.startsWith(pattern)) cache.delete(key)
    }
}

export function clearCache() { cache.clear() }

export async function captchaVerify(token) {
    const { data } = await api.post('/system-audits/captcha/verify/', { token })
    return data
}

export async function checkPendingHacking() {
    const { data } = await api.get('/system-audits/pending-hacking/')
    return data
}

export async function dismissHacking(ids) {
    const { data } = await api.post('/system-audits/dismiss-hacking/', { ids })
    return data
}

export default api
