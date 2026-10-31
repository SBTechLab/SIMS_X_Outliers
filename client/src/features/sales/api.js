import { api } from '@/lib/api.js';

export const salesApi = {
  // Leads
  getLeads: (params) => api.get('/leads', { params }),
  getLead: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post('/leads', data),
  updateLead: (id, data) => api.patch(`/leads/${id}`, data),
  addActivity: (id, data) => api.post(`/leads/${id}/activities`, data),
  qualifyLead: (id, data) => api.post(`/leads/${id}/qualify`, data),
  assignLead: (id, data) => api.post(`/leads/${id}/assign`, data),
  markLeadLost: (id, data) => api.post(`/leads/${id}/mark-lost`, data),

  // Surveys
  getSurveys: (params) => api.get('/surveys', { params }),
  getSurvey: (id) => api.get(`/surveys/${id}`),
  createSurvey: (data) => api.post('/surveys', data),
  approveSurvey: (id, data) => api.post(`/surveys/${id}/approve`, data),
  rejectSurvey: (id, data) => api.post(`/surveys/${id}/reject`, data),
  rescheduleSurvey: (id, data) => api.patch(`/surveys/${id}/reschedule`, data),

  // Quotes
  getQuotes: (params) => api.get('/quotes', { params }),
  getQuote: (id) => api.get(`/quotes/${id}`),
  createQuote: (data) => api.post('/quotes', data),
  updateQuote: (id, data) => api.patch(`/quotes/${id}`, data),
  sendQuote: (id) => api.post(`/quotes/${id}/send`, {}),
  acceptQuote: (id, data) => api.post(`/quotes/${id}/accept`, data),
  rejectQuote: (id, data) => api.post(`/quotes/${id}/reject`, data),

  // Projects
  getProjects: (params) => api.get('/projects', { params }),
  getProject: (id) => api.get(`/projects/${id}`),
  confirmProject: (id) => api.post(`/projects/${id}/confirm`, {}),
  cancelProject: (id, data) => api.post(`/projects/${id}/cancel`, data),

  // Payments
  getPayments: (params) => api.get('/payments', { params }),
  recordPayment: (data) => api.post('/payments', data),

  // Customers
  getCustomers: (params) => api.get('/customers', { params }),
  getCustomer: (id) => api.get(`/customers/${id}`),
  updateCustomer: (id, data) => api.patch(`/customers/${id}`, data),

  // Kit templates (for quote creation)
  getKitTemplates: (params) => api.get('/kit-templates', { params }),
  getUsers: (params) => api.get('/users', { params }),
};
