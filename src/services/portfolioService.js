import api from './api';

export const portfolioService = {
  getPortfolios: async () => {
    const res = await api.get('/profiles/portfolios/');
    return res.data;
  },

  createPortfolio: async (data) => {
    const res = await api.post('/profiles/portfolios/', data);
    return res.data;
  },

  updatePortfolio: async (id, data) => {
    const res = await api.patch(`/profiles/portfolios/${id}/`, data);
    return res.data;
  },

  deletePortfolio: async (id) => {
    const res = await api.delete(`/profiles/portfolios/${id}/`);
    return res.data;
  },

  createPortfolioItem: async (data) => {
    const res = await api.post('/profiles/portfolio-items/', data);
    return res.data;
  },

  updatePortfolioItem: async (id, data) => {
    const res = await api.patch(`/profiles/portfolio-items/${id}/`, data);
    return res.data;
  },

  deletePortfolioItem: async (id) => {
    const res = await api.delete(`/profiles/portfolio-items/${id}/`);
    return res.data;
  }
};
