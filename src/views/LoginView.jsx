import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

const LoginView = ({ apiFetch, setToken, showNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const executeLogin = async (targetEmail, targetPassword) => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password: targetPassword })
      });
      setToken(data.token);
      localStorage.setItem('token', data.token);
      showNotification('登入成功！');
    } catch (err) {
      showNotification(err.message || '登入失敗，請檢查帳號密碼或伺服器狀態', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-blue-50 relative overflow-hidden">

      <div className="absolute -top-10 -left-10 sm:top-10 sm:left-10 text-emerald-100 opacity-40 pointer-events-none"><Activity size={250} /></div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md transform transition-all hover:scale-[1.01] mx-4 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shadow-lg border border-gray-100 overflow-hidden bg-emerald-50 flex items-center justify-center">
            <img
              src="/icon.webp"
              alt="App Logo"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <Activity size={36} className="text-emerald-500 hidden" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-800 mb-2">健康飲食管家</h2>
        <p className="text-center text-gray-500 mb-8 text-sm sm:text-base">登入以繼續您的健康旅程</p>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">電子郵件</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm sm:text-base"
              placeholder="請輸入信箱" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">密碼</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm sm:text-base"
              placeholder="請輸入密碼" />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={isLoading}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-md disabled:opacity-70 mb-3">
              {isLoading ? '驗證中...' : '立即登入'}
            </button>

            <button
              type="button"
              onClick={() => executeLogin('ckck@gmail.com', 'a123456')}
              disabled={isLoading}
              className="w-full bg-white border-2 border-emerald-500 text-emerald-600 py-3 rounded-xl hover:bg-emerald-50 transition-all font-bold disabled:opacity-70"
            >
              使用測試猿帳號登入
            </button>
          </div>

          <div className="text-center mt-6 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-600">還沒有專屬帳號嗎？</span>
            <Link to="/register" className="text-sm font-bold text-emerald-600 ml-1 hover:text-emerald-800 hover:underline transition-colors">
              免費註冊
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
