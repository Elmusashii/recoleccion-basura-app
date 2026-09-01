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

// Interceptor para reintentos automáticos EXCLUSIVAMENTE en peticiones GET (para conexiones móviles 3G/Edge)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Regla estricta: NO reintentar si no es GET (POST, PUT, PATCH, DELETE jamás se reintentan para evitar duplicaciones)
    if (!config || config.method?.toLowerCase() !== 'get') {
      return Promise.reject(error);
    }

    // Permitir hasta 2 reintentos con backoff simple
    const MAX_RETRIES = 2;
    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;
      const delayMs = config.__retryCount * 1000;
      console.warn(`[Axios Retry] Reintentando GET ${config.url} (intento ${config.__retryCount}/${MAX_RETRIES}) tras ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(config);
    }

    return Promise.reject(error);
  }
);

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
  getAssignedToMe: () => api.get('/reports/assigned-to-me'),
  getNearestTrucks: (reportId) => api.post(`/reports/${reportId}/nearest-trucks`),
  updateStatus: (id, data) => api.patch(`/reports/${id}/status`, data)
};

export const FleetAPI = {
  getTrucks: () => api.get('/fleet/trucks'),
  getTruckRoute: (truckId) => api.get(`/fleet/trucks/${truckId}/route`),
  getTruckRoutes: (truckId) => api.get(`/fleet/trucks/${truckId}/routes`),
  getAvailableRoutesForTruck: (params) => api.get('/fleet/routes/available-for-truck', { params }),
  updateTruckRoutes: (truckId, routeIds) => api.put(`/fleet/trucks/${truckId}/routes`, { routeIds }),
  getMyTruck: () => api.get('/fleet/my-truck'),
  getMyRoutes: () => api.get('/fleet/my-routes'),
  getAvailableDrivers: (excludeTruckId) =>
    api.get('/fleet/available-drivers', { params: excludeTruckId ? { excludeTruckId } : undefined }),
  assignDriver: (truckId, userId) => api.put(`/fleet/trucks/${truckId}/assign-driver`, { userId }),
  reportIssue: (truckId, data) => {
    if (data instanceof FormData) {
      return api.post(`/fleet/trucks/${truckId}/report-issue`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post(`/fleet/trucks/${truckId}/report-issue`, data);
  },
  createTruck: (data) => api.post('/fleet/trucks', data),
  optimizeReports: (truckId, data) => api.post(`/fleet/trucks/${truckId}/optimize-reports`, data),
  dispatchRoute: (truckId, payload) => api.post(`/fleet/trucks/${truckId}/dispatch-route`, payload),
  resetMaintenance: (id) => api.patch(`/fleet/trucks/${id}/maintenance`),
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
