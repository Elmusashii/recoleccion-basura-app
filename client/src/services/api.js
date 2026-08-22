import axios from 'axios';
import { supabase } from './supabase';

const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  return '/api';
};

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para inyectar automáticamente el Bearer token de Supabase en las peticiones
api.interceptors.request.async = true;
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Métodos de API
export const RoutesAPI = {
  getAll: (params) => api.get('/routes', { params }),
  getById: (id) => api.get(`/routes/${id}`),
  create: (data) => api.post('/routes', data),
  update: (id, data) => api.put(`/routes/${id}`, data),
  delete: (id) => api.delete(`/routes/${id}`)
};

export const ReportsAPI = {
  getAll: (params) => api.get('/reports', { params }),
  getAdmin: (params) => api.get('/reports/admin', { params }),
  create: (data) => api.post('/reports', data),
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post('/reports/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getByTicket: (ticket) => api.get(`/reports/ticket/${ticket}`),
  getHeatmap: () => api.get('/reports/heatmap'),
  getWeeklyStats: () => api.get('/reports/stats/weekly'),
  updateStatus: (id, data) => api.patch(`/reports/${id}/status`, data)
};

export const FleetAPI = {
  getTrucks: () => api.get('/fleet/trucks'),
  createTruck: (data) => api.post('/fleet/trucks', data),
  getLogs: (params) => api.get('/fleet/logs', { params }),
  createLog: (data) => api.post('/fleet/logs', data),
  updateLocation: (id, coords) => api.patch(`/fleet/trucks/${id}/location`, coords)
};

export const UsersAPI = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

export default api;
