import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

const LoginView = ({ apiFetch, setToken, showNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const executeLogin = async (targetEmail, targetPassword) => {
    setError('');
    setIsLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });
      setToken(data);
      showNotification('登入成功');
    } catch (err) {
      const friendly =
        err?.status === 401 ? '帳號或密碼錯誤。' : err?.message || '登入失敗，請稍後再試。';
      setError(friendly);
      showNotification(friendly, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    executeLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
            <img
              src="/icon.webp"
              alt="Healthy Diet"
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                event.currentTarget.nextSibling.style.display = 'block';
              }}
            />
            <Activity size={34} className="hidden text-slate-500" />
          </div>
        </div>

        <h1 className="mb-5 text-center text-2xl font-extrabold text-slate-900">Healthy Diet Login</h1>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Email</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-slate-400"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Password</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-slate-400"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isLoading ? '登入中...' : '登入'}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => executeLogin('ckck@gmail.com', 'a123456')}
            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Demo 登入
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          還沒有帳號？
          <Link className="ml-1 font-semibold text-slate-900 underline" to="/register">
            註冊
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginView;
