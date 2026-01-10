import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://gremiomantosapi-d6gshveqc4fee0c2.brazilsouth-01.azurewebsites.net/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;

// API Methods
export const healthCheck = () => api.get('/health');

// Items
export const getItens = (params?: { page?: number; perPage?: number; situacao?: string; search?: string }) => api.get('/itens', { params });
export const getItem = (id: number) => api.get(`/itens/${id}`);
export const createItem = (data: any) => api.post('/itens', data);
export const updateItem = (id: number, data: any) => api.put(`/itens/${id}`, data);
export const deleteItem = (id: number) => api.delete(`/itens/${id}`);
export const getItemQRCode = (id: number) => api.get(`/itens/${id}/qrcode`);

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Transacoes (full CRUD)
export const getTransacoes = (params?: any) => api.get('/transacoes', { params });
export const getTransacao = (id: number) => api.get(`/transacoes/${id}`);
export const createTransacao = (data: any) => api.post('/transacoes', data);
export const updateTransacao = (id: number, data: any) => api.put(`/transacoes/${id}`, data);
export const deleteTransacao = (id: number) => api.delete(`/transacoes/${id}`);

// Vendas (read-only from view + create alias to transacoes)
export const getVendas = (params?: any) => api.get('/vendas', { params });
export const getVenda = (id: number) => api.get(`/vendas/${id}`);
export const createVenda = (data: any) => api.post('/vendas', data);

// Trocas (full CRUD + cancel)
export const getTrocas = (params?: any) => api.get('/trocas', { params });
export const getTroca = (id: number) => api.get(`/trocas/${id}`);
export const createTroca = (data: any) => api.post('/trocas', data);
export const updateTroca = (id: number, data: any) => api.put(`/trocas/${id}`, data);
export const cancelTroca = (id: number) => api.post(`/trocas/${id}/cancelar`);

// Lotes
export const getLotes = (params?: any) => api.get('/lotes', { params });
export const getLote = (id: number) => api.get(`/lotes/${id}`);
export const createLote = (data: any) => api.post('/lotes', data);
export const updateLote = (id: number, data: any) => api.put(`/lotes/${id}`, data);
export const deleteLote = (id: number) => api.delete(`/lotes/${id}`);

// Clientes
export const getClientes = (params?: any) => api.get('/clientes', { params });
export const getCliente = (id: number) => api.get(`/clientes/${id}`);
export const createCliente = (data: any) => api.post('/clientes', data);
export const updateCliente = (id: number, data: any) => api.put(`/clientes/${id}`, data);
export const deleteCliente = (id: number) => api.delete(`/clientes/${id}`);

// Wishlist (full CRUD + convert)
export const getWishlist = (params?: any) => api.get('/wishlist', { params });
export const getWishlistItem = (id: number) => api.get(`/wishlist/${id}`);
export const createWishlistItem = (data: any) => api.post('/wishlist', data);
export const updateWishlistItem = (id: number, data: any) => api.put(`/wishlist/${id}`, data);
export const deleteWishlistItem = (id: number) => api.delete(`/wishlist/${id}`);
export const convertWishlistItem = (id: number, data?: any) => api.post(`/wishlist/${id}/converter`, data);

// Historico Precos
export const getHistoricoPrecos = (itemId: number) => api.get(`/itens/${itemId}/historico-precos`);
export const addHistoricoPreco = (itemId: number, data: any) => api.post(`/itens/${itemId}/historico-precos`, data);

// QR Code (alias)
export const getQRCode = (itemId: number) => api.get(`/itens/${itemId}/qrcode`);
