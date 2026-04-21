import axios from 'axios';

const API_URL = (
  import.meta.env.VITE_API_URL?.trim() ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')
).replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000 // Increased to 15 second timeout for slower connections
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
  } else if (import.meta.env.DEV) {
    console.warn(`API Request without token: ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
}, (error) => {
  if (import.meta.env.DEV) {
    console.error('API Request Error:', error);
  }
  return Promise.reject(error);
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    }
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      if (import.meta.env.DEV) {
        console.error('Request timeout:', error.config?.url);
      }
      error.message = 'Request timeout - please check your connection';
    } else if (!error.response) {
      if (import.meta.env.DEV) {
        console.error('Network error:', error.message);
      }
      error.message = 'Network error - please check your connection';
    } else if (import.meta.env.DEV) {
      console.error(`API Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData)
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getFeatured: () => api.get('/products/featured'),
  getById: (id) => api.get(`/products/${id}`),
  addReview: (id, review) => api.post(`/products/${id}/reviews`, review),
  create: (productData) => api.post('/products', productData, productData instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined),
  update: (id, productData) => api.put(`/products/${id}`, productData, productData instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined),
  delete: (id) => api.delete(`/products/${id}`)
};

export const cartAPI = {
  get: () => api.get('/cart'),
  add: (data) => api.post('/cart/add', data),
  update: (data) => api.put('/cart/update', data),
  remove: (productId, size, color) => api.delete(`/cart/remove/${productId}`, (size || color)
    ? { params: { ...(size ? { size } : {}), ...(color ? { color } : {}) } }
    : undefined),
  clear: () => api.delete('/cart/clear')
};

export const ordersAPI = {
  create: (orderData) => api.post('/orders', orderData),
  getMyOrders: () => api.get('/orders/myorders'),
  getAllForAdmin: () => api.get('/orders/admin/all'),
  getById: (id) => api.get(`/orders/${id}`),
  pay: (id, paymentData) => api.put(`/orders/${id}/pay`, paymentData),
  cancel: (id) => api.put(`/orders/${id}/cancel`),
  updateAdminStatus: (id, payload) => api.put(`/orders/${id}/admin-status`, payload)
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats')
};

export const contactAPI = {
  sendMessage: (payload) => api.post('/contact', payload)
};

export default api;
