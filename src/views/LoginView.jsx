import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertCircle } from 'lucide-react';

const LoginView = ({ apiFetch, setToken, showNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const executeLogin = async (targetEmail, targetPassword) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password: targetPassword })
      });
      setToken(data.token);
      localStorage.setItem('token', data.token);
      showNotification('登入成功！');
    } catch (err) {
      let friendlyMsg = '';

      // 優先檢查狀態碼，而不是直接看 err.message
      const statusCode = err.status || err.response?.status;

      if (statusCode === 401) {
        friendlyMsg = '驗證失敗：帳號或密碼錯誤，或是您的登入狀態已過期。';
      } else if (statusCode === 409 || err.message?.includes('exists')) {
        friendlyMsg = '此電子郵件已被註冊過囉！';
      } else if (statusCode === 400) {
        friendlyMsg = '資料格式錯誤，請檢查信箱格式或密碼長度。';
      } else if (statusCode >= 500) {
        friendlyMsg = '伺服器維護中，請稍後再試。';
      } else {
        friendlyMsg = err.message || '登入失敗，請稍後再試';
      }

      setErrorMsg(friendlyMsg);
      showNotification(friendlyMsg, 'error');
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

      <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${errorMsg ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'}`}>
        <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400">
          <AlertCircle size={20} />
          <span className="font-bold tracking-wide">{errorMsg}</span>
        </div>
      </div>

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
