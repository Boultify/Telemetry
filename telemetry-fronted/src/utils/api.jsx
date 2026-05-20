// src/utils/api.js
export const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000`;
})();

function handleUnauthorized() {
  localStorage.removeItem('token');
  const onAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
  if (!onAuthPage) window.location.href = '/login';
}

export const api = {
  get: async (endpoint) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized();
      return null;
    }

    return response;
  },

  post: async (endpoint, data) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(data)
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized();
      return null;
    }

    return response;
  },

  put: async (endpoint, data) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(data)
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized();
      return null;
    }

    return response;
  },

  delete: async (endpoint) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized();
      return null;
    }

    return response;
  }
};