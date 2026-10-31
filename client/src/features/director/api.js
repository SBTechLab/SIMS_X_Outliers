import { api } from '@/lib/api.js';

export const directorApi = {
  // Reports
  getOverview: (params) => api.get('/reports/overview', { params }).then((r) => r.data),
  getProfitability: (params) => api.get('/reports/profitability', { params }).then((r) => r.data),
  getProjectProfit: (projectId) => api.get(`/reports/profitability/${projectId}`).then((r) => r.data),
  getPipeline: () => api.get('/reports/pipeline').then((r) => r.data),
  getUnfinished: () => api.get('/reports/unfinished').then((r) => r.data),
  getServiceReport: () => api.get('/reports/service').then((r) => r.data),

  // Invoices
  getInvoices: (params) => api.get('/invoices', { params }).then((r) => r.data),
  getInvoice: (id) => api.get(`/invoices/${id}`).then((r) => r.data),
  updateInvoiceStatus: (id, status) => api.patch(`/invoices/${id}/status`, { status }).then((r) => r.data),

  // Subsidies
  getSubsidies: (params) => api.get('/subsidies', { params }).then((r) => r.data),
  getSubsidy: (id) => api.get(`/subsidies/${id}`).then((r) => r.data),
  updateSubsidy: (id, data) => api.patch(`/subsidies/${id}`, data).then((r) => r.data),

  // Expenses
  getExpenses: (params) => api.get('/expenses', { params }).then((r) => r.data),
  createExpense: (data) => api.post('/expenses', data).then((r) => r.data),

  // Payouts
  getPayouts: (params) => api.get('/payouts', { params }).then((r) => r.data),
  getPayout: (id) => api.get(`/payouts/${id}`).then((r) => r.data),
  generatePayouts: (data) => api.post('/payouts/generate', data).then((r) => r.data),
  approvePayout: (id) => api.patch(`/payouts/${id}/approve`, {}).then((r) => r.data),
  markPayoutPaid: (id, data) => api.patch(`/payouts/${id}/mark-paid`, data).then((r) => r.data),
  getPendingTimeLogs: (params) => api.get('/payouts/time-logs/pending', { params }).then((r) => r.data),
  approveTimeLog: (id) => api.patch(`/payouts/time-logs/${id}/approve`, {}).then((r) => r.data),
};
