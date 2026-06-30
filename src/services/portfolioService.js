import api from './api'

export const portfolioService = {
    getPortfolios: async () => { const { data } = await api.get('/profiles/portfolios/'); return data },
    createPortfolio: async (formData) => { const { data } = await api.post('/profiles/portfolios/', formData); return data },
    updatePortfolio: async (id, formData) => { const { data } = await api.patch(`/profiles/portfolios/${id}/`, formData); return data },
    deletePortfolio: async (id) => { await api.delete(`/profiles/portfolios/${id}/`) },
    createPortfolioItem: async (formData) => { const { data } = await api.post('/profiles/portfolio-items/', formData); return data },
    updatePortfolioItem: async (id, formData) => { const { data } = await api.patch(`/profiles/portfolio-items/${id}/`, formData); return data },
    deletePortfolioItem: async (id) => { await api.delete(`/profiles/portfolio-items/${id}/`) },
}
