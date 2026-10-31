import { api } from '@/lib/api.js';

export const adminApi = {
  // Users
  getUsers: (params) => api.get('/users', { params }).then((res) => res.data),
  createUser: (data) => api.post('/users', data).then((res) => res.data),
  updateUser: (id, data) => api.patch(`/users/${id}`, data).then((res) => res.data),
  updateUserStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }).then((res) => res.data),
  resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }).then((res) => res.data),
  getTechnicians: (type) => api.get('/users/technicians', { params: { type } }).then((res) => res.data),

  // Settings
  getSettings: () => api.get('/settings').then((res) => res.data),
  updateSettings: (data) => api.put('/settings', data).then((res) => res.data),

  // Kit Templates
  getKitTemplates: (params) => api.get('/kit-templates', { params }).then((res) => res.data),
  getKitTemplate: (id) => api.get(`/kit-templates/${id}`).then((res) => res.data),
  createKitTemplate: (data) => api.post('/kit-templates', data).then((res) => res.data),
  updateKitTemplate: (id, data) => api.patch(`/kit-templates/${id}`, data).then((res) => res.data),
  updateKitTemplateItems: (id, items) => api.put(`/kit-templates/${id}/items`, { items }).then((res) => res.data),

  // Audit Logs
  getAuditLogs: (params) => api.get('/audit-logs', { params }).then((res) => res.data),

  // Products (for BOM picker)
  getProducts: (params) => api.get('/products', { params }).then((res) => res.data),
};

