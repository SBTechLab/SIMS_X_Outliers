import { api } from '@/lib/api.js';

export const portalApi = {
  getOverview: () => api.get('/me/overview'),
  getProjects: () => api.get('/me/projects'),
  getQuotes: () => api.get('/me/quotes'),
  getInvoices: () => api.get('/me/invoices'),
  getPayments: () => api.get('/me/payments'),
  acceptQuote: (id) => api.post(`/quotes/${id}/accept`, {}),
  rejectQuote: (id) => api.post(`/quotes/${id}/reject`, {}),
  getSystems: () => api.get('/me/systems'),
  getMyTickets: (params) => api.get('/tickets', { params }),
  createTicket: (data) => api.post('/tickets', data),
  confirmTicket: (id, data) => api.patch(`/tickets/${id}/confirm`, data),
};
