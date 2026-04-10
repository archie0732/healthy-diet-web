import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';

const RegisterView = ({ apiFetch, setToken, showNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, nickname })
      });
      setToken(data.token);
      localStorage.setItem('token', data.token);
      showNotification('註冊成功！歡迎加入！');
    } catch (err) {
      showNotification(err.message || '註冊失敗，信箱可能已存在', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-blue-50 relative overflow-hidden">

      <div className="absolute -bottom-10 -right-10 sm:bottom-10 sm:right-10 text-indigo-100 opacity-40 pointer-events-none"><User size={250} /></div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md transform transition-all hover:scale-[1.01] mx-4 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shadow-lg border border-gray-100 overflow-hidden bg-indigo-50 flex items-center justify-center">
            <img
              src="/icon.webp"
              alt="App Logo"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <User size={36} className="text-indigo-500 hidden" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-800 mb-2">建立新帳號</h2>
        <p className="text-center text-gray-500 mb-8 text-sm sm:text-base">只需幾秒鐘，開啟健康新生活</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">電子郵件</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm sm:text-base" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">密碼</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm sm:text-base" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">怎麼稱呼您？ (暱稱選填)</label>
            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm sm:text-base" />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-md disabled:opacity-70 mt-4">
            {isLoading ? '建立中...' : '完成註冊'}
          </button>
          <div className="text-center mt-6 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-600">已經有帳號了？</span>
            <Link to="/login" className="text-sm font-bold text-indigo-600 ml-1 hover:text-indigo-800 hover:underline transition-colors">
              返回登入
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterView;
