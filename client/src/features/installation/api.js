import { api } from '@/lib/api.js';

export const installationApi = {
  getInstallations: (params) => api.get('/installations', { params }),
  getInstallation: (id) => api.get(`/installations/${id}`),
  scheduleInstallation: (id, data) => api.patch(`/installations/${id}/schedule`, data),
  startInstallation: (id) => api.patch(`/installations/${id}/start`),
  completeInstallation: (id, data) => api.patch(`/installations/${id}/complete`, data),

  // Technician uses the same ticket endpoints
  getMyTickets: (params) => api.get('/tickets', { params }),
  getTicket: (id) => api.get(`/tickets/${id}`),
  addActivity: (id, data) => api.post(`/tickets/${id}/activities`, data),
  addPart: (id, data) => api.post(`/tickets/${id}/parts`, data),
  resolveTicket: (id, data) => api.patch(`/tickets/${id}/resolve`, data),
};
