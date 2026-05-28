import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dcfce7_0%,_#f0fdf4_40%,_#ffffff_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-8 shadow-lg shadow-emerald-100/70">
        <h1 className="mb-1 text-2xl font-extrabold text-emerald-900">Healthy Diet Login</h1>
        <p className="mb-5 text-sm text-emerald-800/70">登入後會儲存 token、refreshToken、expiresIn、user.role</p>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-emerald-900">Email</span>
            <input
              className="w-full rounded-xl border border-emerald-200 px-3 py-3 outline-none focus:border-emerald-500"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-emerald-900">Password</span>
            <input
              className="w-full rounded-xl border border-emerald-200 px-3 py-3 outline-none focus:border-emerald-500"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {isLoading ? '登入中...' : '登入'}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => executeLogin('ckck@gmail.com', 'a123456')}
            className="w-full rounded-xl border border-emerald-300 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            Demo 登入
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-emerald-900/70">
          還沒有帳號？
          <Link className="ml-1 font-semibold text-emerald-700 underline" to="/register">
            註冊
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginView;
