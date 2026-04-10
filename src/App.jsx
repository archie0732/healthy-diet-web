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
import { TooltipProvider } from "@/components/ui/tooltip"
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
  };

  const apiFetch = async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (response.status === 401) {
      handleLogout();
      throw new Error('登入已過期');
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '請求失敗');
    return data;
  };

  const fetchProfile = async () => {
    try {
      const data = await apiFetch('/user/profile');
      setUser(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (token) fetchProfile();
  }, [token]);

  return (
    <Router>
      <TooltipProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={!token ? <LoginView setToken={setToken} apiFetch={apiFetch} showNotification={showNotification} /> : <Navigate to="/" />} />
          <Route path="/register" element={!token ? <RegisterView setToken={setToken} apiFetch={apiFetch} showNotification={showNotification} /> : <Navigate to="/" />} />

          {/* 主要應用區域 */}
          <Route element={<Layout user={user} token={token} handleLogout={handleLogout} notification={notification} />}>
            <Route path="/" element={<Dashboard user={user} apiFetch={apiFetch} />} />
            <Route path="/consult" element={<Consult user={user} apiFetch={apiFetch} fetchProfile={fetchProfile} showNotification={showNotification} />} />
            <Route path="/diet" element={<Diet apiFetch={apiFetch} showNotification={showNotification} />} />
            <Route path="/profile" element={<Profile user={user} apiFetch={apiFetch} fetchProfile={fetchProfile} showNotification={showNotification} />} />
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
