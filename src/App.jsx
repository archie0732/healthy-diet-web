import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Consult from './views/Consult';
import Diet from './views/Diet';
import Profile from './views/Profile';
import Member from './views/Member';
import ApiDocs from './views/ApiDocs';
import Privacy from './views/Privacy';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import { TooltipProvider } from '@/components/ui/tooltip';
import ScrollToTop from './components/ScrollToTop';

const API_BASE = '/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('hasSeenWelcome_v1.2');
  };

  const apiFetch = async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (response.status === 401 && !['/auth/login', '/auth/register'].includes(endpoint)) {
      handleLogout();
      throw new Error('登入已過期，請重新登入');
    }

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    let data = {};

    if (rawText) {
      const trimmed = rawText.trim();
      const shouldParseJson = contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[');

      if (shouldParseJson) {
        try {
          data = JSON.parse(trimmed);
        } catch {
          const error = new Error(`伺服器回傳格式錯誤（非合法 JSON）：${trimmed.slice(0, 120)}`);
          error.status = response.status;
          throw error;
        }
      } else {
        data = { error: trimmed };
      }
    }

    if (!response.ok) {
      const error = new Error(data.error || `請求失敗（HTTP ${response.status}）`);
      error.status = response.status;
      throw error;
    }

    return data;
  };

  const fetchProfile = async () => {
    try {
      const data = await apiFetch('/user/profile');
      setUser(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const recordGlobalVisit = async () => {
      if (sessionStorage.getItem('hasRecordedVisit')) return;
      if (!token) return;

      try {
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        const res = await fetch(`${API_BASE}/record`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });

        if (res.ok) {
          sessionStorage.setItem('hasRecordedVisit', 'true');
        }
      } catch (err) {
        console.error('記錄訪問失敗:', err);
      }
    };

    recordGlobalVisit();
  }, [token]);

  useEffect(() => {
    const initProfile = async () => {
      if (token) {
        await fetchProfile();
      }
    };

    initProfile();
  }, [token]);

  return (
    <Router>
      <TooltipProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={!token ? <LoginView setToken={setToken} apiFetch={apiFetch} showNotification={showNotification} /> : <Navigate to="/" />} />
          <Route path="/register" element={!token ? <RegisterView setToken={setToken} apiFetch={apiFetch} showNotification={showNotification} /> : <Navigate to="/" />} />

          <Route element={<Layout user={user} token={token} handleLogout={handleLogout} notification={notification} />}>
            <Route path="/" element={<Dashboard user={user} apiFetch={apiFetch} />} />
            <Route path="/consult" element={<Consult user={user} apiFetch={apiFetch} fetchProfile={fetchProfile} showNotification={showNotification} />} />
            <Route path="/diet" element={<Diet apiFetch={apiFetch} showNotification={showNotification} />} />
            <Route path="/profile" element={<Profile user={user} apiFetch={apiFetch} fetchProfile={fetchProfile} showNotification={showNotification} handleLogout={handleLogout} />} />
            <Route path="/member" element={<Member />} />
            <Route path="/api" element={<ApiDocs />} />
            <Route path="/privacy" element={<Privacy />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </TooltipProvider>
    </Router>
  );
}
