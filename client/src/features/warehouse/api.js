import { api } from '@/lib/api.js';

export const warehouseApi = {
  // Products
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.patch(`/products/${id}`, data),
  adjustStock: (id, data) => api.post(`/products/${id}/stock`, data),

  // Inventory
  getInventory: (params) => api.get('/inventory', { params }),
  getLowStock: () => api.get('/inventory/low-stock'),

  // Purchases
  getPurchases: (params) => api.get('/purchases', { params }),
  getPurchase: (id) => api.get(`/purchases/${id}`),
  createPurchase: (data) => api.post('/purchases', data),
  getSuppliers: () => api.get('/purchases/suppliers'),
  createSupplier: (data) => api.post('/purchases/suppliers', data),

  // Serials
  getSerials: (params) => api.get('/serials', { params }),
  getSerialByNumber: (sn) => api.get(`/serials/by-number/${encodeURIComponent(sn)}`),

  // Dispatches
  getDispatches: (params) => api.get('/dispatches', { params }),
  getDispatch: (id) => api.get(`/dispatches/${id}`),
  startPacking: (id) => api.patch(`/dispatches/${id}/pack`, {}),
  scanSerial: (id, data) => api.post(`/dispatches/${id}/scan`, data),
  packLine: (id, lineId, data) => api.patch(`/dispatches/${id}/lines/${lineId}/packed`, data),
  markReady: (id) => api.patch(`/dispatches/${id}/ready`, {}),
  dispatchGoods: (id, data) => api.patch(`/dispatches/${id}/dispatch`, data),
  recordDelivery: (id, data) => api.patch(`/dispatches/${id}/deliver`, data),

  // Installations
  getInstallations: (params) => api.get('/installations', { params }),
  getInstallation: (id) => api.get(`/installations/${id}`),
  scheduleInstallation: (id, data) => api.patch(`/installations/${id}/schedule`, data),
  startInstallation: (id) => api.patch(`/installations/${id}/start`, {}),
};
