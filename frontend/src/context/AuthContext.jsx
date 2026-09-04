// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axiosClient, { setAccessToken } from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuth = useCallback((nextUser, nextAccessToken) => {
    setUser(nextUser);
    setAccessTokenState(nextAccessToken);
    setAccessToken(nextAccessToken);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessTokenState(null);
    setAccessToken(null);
  }, []);

  // On first load, try to silently recover a session via the refresh
  // cookie (e.g. the user refreshed the page or came back after closing
  // the tab). If there's no valid cookie, this just fails quietly and the
  // user is treated as logged out.
  useEffect(() => {
    let cancelled = false;
    axiosClient
      .post('/auth/refresh')
      .then((res) => {
        if (!cancelled) applyAuth(res.data.user, res.data.accessToken);
      })
      .catch(() => {
        if (!cancelled) clearAuth();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyAuth, clearAuth]);

  async function login(email, password) {
    const res = await axiosClient.post('/auth/login', { email, password });
    applyAuth(res.data.user, res.data.accessToken);
    return res.data.user;
  }

  async function register(payload) {
    const res = await axiosClient.post('/auth/register', payload);
    return res.data.user;
  }

  async function logout() {
    try {
      await axiosClient.post('/auth/logout');
    } finally {
      clearAuth();
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}