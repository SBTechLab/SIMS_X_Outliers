import { api } from '@/lib/api.js';

// The api interceptor already unwraps { success, data, meta } — call api.get/post/patch directly.
export const directorApi = {
  // Reports
  getOverview: (params) => api.get('/reports/overview', { params }),
  getProfitability: (params) => api.get('/reports/profitability', { params }),
  getProjectProfit: (projectId) => api.get(`/reports/profitability/${projectId}`),
  getPipeline: () => api.get('/reports/pipeline'),
  getUnfinished: () => api.get('/reports/unfinished'),
  getServiceReport: () => api.get('/reports/service'),

  // Invoices
  getInvoices: (params) => api.get('/invoices', { params }),
  getInvoice: (id) => api.get(`/invoices/${id}`),
  updateInvoiceStatus: (id, status) => api.patch(`/invoices/${id}/status`, { status }),

  // Subsidies
  getSubsidies: (params) => api.get('/subsidies', { params }),
  getSubsidy: (id) => api.get(`/subsidies/${id}`),
  updateSubsidy: (id, data) => api.patch(`/subsidies/${id}`, data),

  // Expenses
  getExpenses: (params) => api.get('/expenses', { params }),
  createExpense: (data) => api.post('/expenses', data),

  // Payouts
  getPayouts: (params) => api.get('/payouts', { params }),
  getPayout: (id) => api.get(`/payouts/${id}`),
  generatePayouts: (data) => api.post('/payouts/generate', data),
  approvePayout: (id) => api.patch(`/payouts/${id}/approve`, {}),
  markPayoutPaid: (id, data) => api.patch(`/payouts/${id}/mark-paid`, data),
  getPendingTimeLogs: (params) => api.get('/payouts/time-logs/pending', { params }),
  approveTimeLog: (id) => api.patch(`/payouts/time-logs/${id}/approve`, {}),
};
