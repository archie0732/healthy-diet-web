import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Lock, Mail } from 'lucide-react';
import { useLanguage } from '../../i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const AdminLoginView = ({ apiFetch, onLogin, isAdmin }) => {
  const { isEn } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAdmin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await apiFetch('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(data);
    } catch (err) {
      const status = err?.status;
      if (status === 401 || status === 403) {
        setError(isEn ? 'Invalid administrator credentials or insufficient permissions.' : '管理員帳號或密碼錯誤，或權限不足。');
      } else {
        setError(err?.message || (isEn ? 'Administrator login failed, please try again later.' : '管理員登入失敗，請稍後再試。'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-900 p-3 text-white">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Admin Login</h1>
            <p className="text-sm text-slate-500">{isEn ? 'Via admin endpoint `/api/auth/admin/login`' : '使用管理員端點 `/api/auth/admin/login`'}</p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Email</span>
            <div className="flex items-center rounded-xl border border-slate-200 px-3">
              <Mail size={16} className="text-slate-400" />
              <input
                className="w-full bg-transparent px-2 py-3 outline-none"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">{isEn ? 'Password' : '密碼 (Password)'}</span>
            <div className="flex items-center rounded-xl border border-slate-200 px-3">
              <Lock size={16} className="text-slate-400" />
              <input
                className="w-full bg-transparent px-2 py-3 outline-none"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </label>

          <button
            className="w-full rounded-xl bg-slate-900 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? (isEn ? 'Logging in...' : '登入中...') : (isEn ? 'Sign in to Admin Console' : '登入管理後台')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginView;
