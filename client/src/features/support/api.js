import { api } from '@/lib/api.js';

export const supportApi = {
  getDashboard: () => api.get('/support/dashboard'),
  lookup: (q) => api.get('/support/lookup', { params: { q } }),
  getCustomer360: (customerId) => api.get(`/support/customers/${customerId}`),
  checkWarranty: (serialNumber) => api.get(`/support/warranties/${encodeURIComponent(serialNumber)}`),

  // Tickets (used by both support and technician)
  getTickets: (params) => api.get('/tickets', { params }),
  getTicket: (id) => api.get(`/tickets/${id}`),
  createTicket: (data) => api.post('/tickets', data),
  assignTicket: (id, data) => api.patch(`/tickets/${id}/assign`, data),
  updateStatus: (id, data) => api.patch(`/tickets/${id}/status`, data),
  resolveTicket: (id, data) => api.patch(`/tickets/${id}/resolve`, data),
  confirmTicket: (id, data) => api.patch(`/tickets/${id}/confirm`, data),
  addActivity: (id, data) => api.post(`/tickets/${id}/activities`, data),
  addPart: (id, data) => api.post(`/tickets/${id}/parts`, data),

  // Warranties
  getWarranties: (params) => api.get('/warranties', { params }),
};
