// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api';

const API_BASE = API_BASE_URL;

const AuthContext = createContext();

const networkErrorMessage =
  'Cannot reach the server. Start the backend (telemetry-backend) on port 5000 and ensure MongoDB is connected.';

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return { error: 'Invalid response from server' };
  }
}

function normalizeUser(raw) {
  if (!raw) return null;
  return {
    id: raw.id || raw._id,
    username: raw.username,
    email: raw.email,
    role: raw.role ?? 'user',  // ?? not || so an explicit 'admin' string is never falsy-coerced
  };
}

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await parseJsonResponse(response);
            setUser(normalizeUser(data.user));
            // Save fresh token if server re-issued one (fixes stale role)
            if (data.token) {
              localStorage.setItem('token', data.token);
              setToken(data.token);
            }
          } else {
            localStorage.removeItem('token');
            setToken(null);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseJsonResponse(response);

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        const normalized = normalizeUser(data.user);
        setUser(normalized);
        if (normalized.role !== 'admin') {
          sessionStorage.removeItem('fleetSelectedDeviceId');
        }
        return { success: true, isAdmin: normalized.role === 'admin' };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch {
      return { success: false, error: networkErrorMessage };
    }
  };

  const signup = async (username, email, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await parseJsonResponse(response);

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(normalizeUser(data.user));
        return { success: true, isAdmin: false };
      }
      return { success: false, error: data.error || 'Signup failed' };
    } catch {
      return { success: false, error: networkErrorMessage };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    } catch {
      /* ignore */
    }
    localStorage.removeItem('token');
    sessionStorage.removeItem('adminWelcome');
    sessionStorage.removeItem('fleetSelectedDeviceId');
    setToken(null);
    setUser(null);
  };

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${stored}`,
    };
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, token, getAuthHeaders, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};