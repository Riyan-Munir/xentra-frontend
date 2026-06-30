import api, { cachedGet, invalidateCache } from './api'

export const profileService = {
    getMe: async (role, skipCache) => {
        const r = role || localStorage.getItem('selected_role') || 'freelancer'
        if (skipCache) return (await api.get('/profiles/me/', { params: { role: r } })).data
        return cachedGet('/profiles/me/', { role: r })
    },
    updateMe: async (role, data) => {
        const r = role || localStorage.getItem('selected_role') || 'freelancer'
        const res = await api.patch('/profiles/me/', data, { params: { role: r } })
        invalidateCache('/profiles/me/')
        return res.data
    },
}
