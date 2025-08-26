import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Users API
export const usersAPI = {
  getUsers: (params = {}) => api.get('/users', { params }),
  searchUsers: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
  getUserById: (id) => api.get(`/users/${id}`),
  getOnlineUsers: () => api.get('/users/online'),
  updateStatus: (status) => api.put('/users/status', status),
  toggleBlockUser: (userId) => api.put(`/users/${userId}/block`),
  getBlockedUsers: () => api.get('/users/blocked'),
};

// Chats API
export const chatsAPI = {
  getChats: () => api.get('/chats'),
  accessChat: (userId) => api.post('/chats', { userId }),
  createGroupChat: (data) => api.post('/chats/group', data),
  renameGroup: (chatId, chatName) => api.put(`/chats/group/${chatId}/rename`, { chatName }),
  addToGroup: (chatId, userId) => api.put(`/chats/group/${chatId}/add`, { userId }),
  removeFromGroup: (chatId, userId) => api.put(`/chats/group/${chatId}/remove`, { userId }),
  leaveGroup: (chatId) => api.delete(`/chats/group/${chatId}/leave`),
  deleteChat: (chatId) => api.delete(`/chats/${chatId}`),
  markAsRead: (chatId) => api.put(`/chats/${chatId}/read`),
};

// Messages API
export const messagesAPI = {
  getMessages: (chatId, params = {}) => api.get(`/messages/${chatId}`, { params }),
  sendMessage: (data) => api.post('/messages', data),
  editMessage: (messageId, content) => api.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  addReaction: (messageId, emoji) => api.post(`/messages/${messageId}/reactions`, { emoji }),
  removeReaction: (messageId) => api.delete(`/messages/${messageId}/reactions`),
  searchMessages: (chatId, query) => api.get(`/messages/${chatId}/search?q=${encodeURIComponent(query)}`),
};

export default api;
