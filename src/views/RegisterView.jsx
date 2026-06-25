import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';

const RegisterView = ({ apiFetch, setToken, showNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, nickname }),
      });
      setToken(data);
      showNotification('註冊成功');
    } catch (err) {
      const friendly =
        err?.status === 409 ? '此 Email 已被註冊。' : err?.message || '註冊失敗，請稍後再試。';
      setError(friendly);
      showNotification(friendly, 'error');
    } finally {
      setIsLoading(false);
    }
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
            <UserRound size={34} className="hidden text-slate-500" />
          </div>
        </div>

        <h1 className="mb-1 text-2xl font-extrabold text-slate-900">建立帳號</h1>
        <p className="mb-5 text-sm text-slate-500">註冊成功後會直接登入</p>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleRegister} className="space-y-4">
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

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Nickname</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-slate-400"
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isLoading ? '建立中...' : '註冊'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          已經有帳號？
          <Link className="ml-1 font-semibold text-slate-900 underline" to="/login">
            回登入
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterView;
