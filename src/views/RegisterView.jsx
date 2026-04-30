import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, AlertCircle } from 'lucide-react';

const RegisterView = ({ apiFetch, setToken, showNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 新增：錯誤訊息狀態
  const [errorMsg, setErrorMsg] = useState('');

  // 自動消失邏輯
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, nickname })
      });

      setToken(data.token);
      localStorage.setItem('token', data.token);
      showNotification('註冊成功！歡迎加入！');
    } catch (err) {

      let friendlyMsg = '';

      if (err.status === 401) {
        friendlyMsg = '驗證失敗：請確保您目前沒有登入其他帳號，或清除瀏覽器緩存後再試。';
      } else if (err.status === 409 || err.message?.includes('exists')) {
        friendlyMsg = '此電子郵件已被註冊過囉！';
      } else if (err.status === 400) {
        friendlyMsg = '資料格式錯誤，請檢查信箱格式或密碼長度。';
      } else if (err.status >= 500) {
        friendlyMsg = '伺服器維護中，請稍後再試。';
      } else {
        friendlyMsg = err.message || '註冊失敗，請稍後再試';
      }

      setErrorMsg(friendlyMsg);
      showNotification(friendlyMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-blue-50 relative overflow-hidden">

      {/* 懸浮錯誤訊息區塊 */}
      <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${errorMsg ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'}`}>
        <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400">
          <AlertCircle size={20} />
          <span className="font-bold tracking-wide">{errorMsg}</span>
        </div>
      </div>

      <div className="absolute -bottom-10 -right-10 sm:bottom-10 sm:right-10 text-indigo-100 opacity-40 pointer-events-none">
        <User size={250} />
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md transform transition-all hover:scale-[1.01] mx-4 relative z-10">
        {/* ... Logo 與 標題 保持原樣 ... */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shadow-lg border border-gray-100 overflow-hidden bg-indigo-50 flex items-center justify-center">
            <img src="/icon.webp" alt="App Logo" className="w-full h-full object-cover" />
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">怎麼稱呼您？ ( 2 到 12 個字)</label>
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
