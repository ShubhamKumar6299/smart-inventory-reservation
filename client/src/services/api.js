import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://smartinventoryreservation.shubhx.dev';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inventory APIs
export const inventoryApi = {
  // Get all inventory items
  getAll: () => api.get('/inventory'),

  // Get inventory item by SKU
  getBySku: (sku) => api.get(`/inventory/${sku}`),

  // Create new inventory item
  create: (data) => api.post('/inventory', data),

  // Reserve inventory
  reserve: (sku, userId, quantity = 1) =>
    api.post('/inventory/reserve', { sku, userId, quantity }),
};

// Checkout APIs
export const checkoutApi = {
  // Confirm checkout
  confirm: (reservationId, userId) =>
    api.post('/checkout/confirm', { reservationId, userId }),

  // Cancel checkout
  cancel: (reservationId, userId) =>
    api.post('/checkout/cancel', { reservationId, userId }),

  // Get reservation status
  getStatus: (reservationId) =>
    api.get(`/checkout/status/${reservationId}`),

  // Cleanup expired reservations
  cleanup: () => api.post('/checkout/cleanup'),
};

// Admin APIs
export const adminApi = {
  // Get dashboard statistics
  getStats: () => api.get('/admin/stats'),

  // Get top users
  getTopUsers: (limit = 10) => api.get(`/admin/users/top?limit=${limit}`),

  // Get product performance
  getProductPerformance: () => api.get('/admin/products/performance'),

  // Get recent activity
  getRecentActivity: (limit = 20) => api.get(`/admin/activity?limit=${limit}`),
};

export default api;
