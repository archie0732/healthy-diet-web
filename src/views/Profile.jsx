import React, { useState } from 'react';
import {
  User, BookOpen, Weight, Ruler, Calendar,
  Dna, ShieldAlert, Ban, LogOut, CheckCircle2,
  Droplets, Dumbbell, TrendingDown, AlertTriangle, Star, MessageSquare, Send, Sparkles, Activity, X, ChevronRight, Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const Profile = ({ user, apiFetch, showNotification, fetchProfile, handleLogout }) => {
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    height: user?.height || '',
    weight: user?.weight || '',
    age: user?.age || '',
    gender: user?.gender || '',
    disease: user?.disease ? user.disease.join('、') : '',
    taboo: user?.taboo ? user.taboo.join('、') : ''
  });

  const [showTestAccountInfo, setShowTestAccountInfo] = useState(false);

  // --- 評分與意見用的 State ---
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);


  const isTestAccount = user?.email === 'ckck@gmail.com';
  const waterProgress = 65;
  const exerciseProgress = 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isTestAccount) {
      showNotification('測試帳號無法修改個人資料！', 'error');
      return;
    }

    const payload = {
      nickname: formData.nickname || null,
      height: parseFloat(formData.height) || null,
      weight: parseFloat(formData.weight) || null,
      age: parseInt(formData.age) || null,
      gender: formData.gender || null,
      disease: formData.disease ? formData.disease.split(/[,、，\n]+/).map(s => s.trim()).filter(Boolean) : [],
      taboo: formData.taboo ? formData.taboo.split(/[,、，\n]+/).map(s => s.trim()).filter(Boolean) : []
    };

    try {
      await apiFetch('/user/profile', { method: 'PUT', body: JSON.stringify(payload) });
      showNotification('資料更新成功！');
      fetchProfile();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // --- 處理意見回報提交 ---
  const handleFeedbackSubmit = async () => {
    // 1. 防呆檢查
    if (rating === 0) {
      showNotification('請先選擇星級評分', 'error');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      // TODO
      await new Promise(resolve => setTimeout(resolve, 800));

      setIsFeedbackSubmitted(true);
      showNotification('感謝您的回饋！');
      setFeedback('');

    } catch (err) {
      showNotification('發生預期外的錯誤', 'error');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const heightM = user?.height / 100;
  const bmi = heightM && user?.weight ? (user?.weight / (heightM * heightM)).toFixed(1) : 0;
  const bmiPieData = [{ value: parseFloat(bmi) }, { value: Math.max(0, 40 - parseFloat(bmi)) }];

  let bmiMessage = "請先補全身高與體重數據，以解鎖您的專屬 BMI 分析。";
  if (parseFloat(bmi) > 0) {
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) bmiMessage = "您的體重過輕，建議增加優質蛋白質與碳水化合物的攝取。";
    else if (bmiValue >= 18.5 && bmiValue < 24) bmiMessage = "您的體重處於健康標準區間，請繼續保持目前的飲食與運動規律！";
    else if (bmiValue >= 24 && bmiValue < 27) bmiMessage = "您的體重稍微過重，建議搭配適度有氧運動與飲食控制。";
    else bmiMessage = "您的體重處於肥胖區間，請多加注意飲食管理，必要時尋求專業協助。";
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">

      {/* --- 身體質量狀態與進度 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="font-black text-slate-800 mb-2 flex items-center gap-2">
            <TrendingDown size={18} className="text-indigo-500" /> 身體質量狀態
          </h3>
          <div className="h-40 w-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bmiPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={65} startAngle={180} endAngle={0} paddingAngle={5} dataKey="value">
                  <Cell fill="#6366f1" />
                  <Cell fill="#f1f5f9" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
              <span className="text-2xl font-black text-slate-800">{bmi > 0 ? bmi : '--'}</span>
              <span className="text-[10px] font-bold text-slate-400">BMI SCORE</span>
            </div>
          </div>
          <p className="text-xs font-bold text-slate-500 text-center px-4 leading-relaxed">{bmiMessage}</p>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border-2 border-slate-200 shadow-sm flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-700 flex items-center gap-2"><Droplets className="text-blue-500" size={20} /> 每日飲水進度</span>
                <span className="text-[10px] leading-none bg-blue-100 text-blue-600 px-2 py-1 rounded-full border border-blue-200 font-bold">Beta</span>
              </div>
              <span className="font-bold text-blue-600">{waterProgress}%</span>
            </div>
            <div className="w-full h-4 bg-blue-50 rounded-full border-2 border-blue-100 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${waterProgress}%` }} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-700 flex items-center gap-2"><Dumbbell className="text-emerald-500" size={20} /> 本週運動達標</span>
                <span className="text-[10px] leading-none bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full border border-emerald-200 font-bold">Beta</span>
              </div>
              <span className="font-bold text-emerald-600">{exerciseProgress} / 5 天</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((day) => (
                <div key={day} className={`flex-1 h-3 rounded-full border-2 ${day <= exerciseProgress ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-100 border-slate-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- 主要資料表單 --- */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-[40px] border-2 border-slate-200 shadow-sm space-y-8">
        {isTestAccount && (
          <div className="bg-rose-50 border-2 border-rose-200 p-4 sm:p-6 rounded-[32px] flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertTriangle className="shrink-0" size={24} />
              <p className="text-sm font-bold leading-relaxed">
                目前為公共測試帳號 (<span className="font-black underline">ckck@gmail.com</span>)，<br className="hidden sm:block" />
                個人資料修改權限已暫時關閉。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTestAccountInfo(true)}
              className="shrink-0 flex items-center gap-2 bg-white border-2 border-rose-200 px-5 py-2.5 rounded-2xl text-rose-600 font-black text-sm hover:bg-rose-100 transition-all shadow-sm active:scale-95"
            >
              查看詳情 <ChevronRight size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-b-2 border-slate-50 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600 border-2 border-indigo-200"><User size={24} /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">資料中心</h2>
              <p className="text-slate-500 text-sm font-bold">更新身體參數以維持 AI 辨識的精準度</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={isTestAccount}
            className="hidden sm:flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={20} /> 儲存設定
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProfileInput label="暱稱" icon={User} value={formData.nickname} onChange={v => setFormData({ ...formData, nickname: v })} disabled={isTestAccount} />
          <ProfileInput label="身高 (cm)" icon={Ruler} type="number" value={formData.height} onChange={v => setFormData({ ...formData, height: v })} disabled={isTestAccount} />
          <ProfileInput label="體重 (kg)" icon={Weight} type="number" value={formData.weight} onChange={v => setFormData({ ...formData, weight: v })} disabled={isTestAccount} />
          <ProfileInput label="年齡" icon={Calendar} type="number" value={formData.age} onChange={v => setFormData({ ...formData, age: v })} disabled={isTestAccount} />

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Dna size={14} /> 性別</label>
            <select
              value={formData.gender}
              onChange={e => setFormData({ ...formData, gender: e.target.value })}
              disabled={isTestAccount}
              className="w-full px-5 py-4 border-2 border-slate-100 rounded-3xl bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-bold transition-all appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">選擇生理性別</option>
              <option value="Male">男性</option>
              <option value="Female">女性</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><ShieldAlert size={14} /> 疾病史 / 健康狀況</label>
            <textarea
              value={formData.disease}
              onChange={e => setFormData({ ...formData, disease: e.target.value })}
              disabled={isTestAccount}
              rows="3"
              className="w-full px-5 py-4 border-2 border-slate-100 rounded-[32px] bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-bold transition-all resize-none disabled:opacity-60"
              placeholder="例如：高血壓、糖尿病..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Ban size={14} /> 飲食禁忌 / 過敏源</label>
            <textarea
              value={formData.taboo}
              onChange={e => setFormData({ ...formData, taboo: e.target.value })}
              disabled={isTestAccount}
              rows="3"
              className="w-full px-5 py-4 border-2 border-slate-100 rounded-[32px] bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-bold transition-all resize-none disabled:opacity-60"
              placeholder="例如：花生過敏、全素..."
            />
          </div>
        </div>
      </form>

      <div className="bg-white p-6 sm:p-10 rounded-[40px] border-2 border-slate-200 shadow-sm space-y-6">
        {!isFeedbackSubmitted ? (
          // --- 原本的表單內容 ---
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 border-b-2 border-slate-50 pb-6">
              <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 border-2 border-emerald-200"><MessageSquare size={24} /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-800">意見回報與評分</h2>
                  <span className="px-2 py-0.5 bg-amber-400 text-amber-950 text-[10px] font-black rounded-lg border-2 border-amber-600 shadow-[2px_2px_0px_rgba(0,0,0,1)]">BETA</span>
                </div>
                <p className="text-slate-500 text-sm font-bold">您的反饋是我們前進的動力</p>
              </div>
            </div>

            <div className="flex flex-col items-center py-4 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-black text-slate-400 uppercase">點擊星等進行評分</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform active:scale-90"
                    >
                      <Star
                        size={40}
                        className={`transition-colors duration-200 ${star <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-transparent'}`}
                        strokeWidth={2.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Sparkles size={14} /> 具體建議或心得</label>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    rows="4"
                    className="w-full px-6 py-5 border-2 border-slate-100 rounded-[32px] bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none font-bold transition-all resize-none shadow-inner"
                    placeholder="在這裡寫下您對本系統的任何建議..."
                  />
                </div>

                <button
                  onClick={handleFeedbackSubmit}
                  disabled={isSubmittingFeedback || rating === 0}
                  className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white py-4 rounded-[24px] font-black hover:bg-emerald-700 transition-all shadow-lg border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmittingFeedback ? <Activity size={20} className="animate-spin" /> : <Send size={20} />}
                  送出回饋意見
                </button>
              </div>
            </div>
          </div>
        ) : (
          // --- 🎉 漂亮的感謝卡片 (評分成功後顯示) ---
          <div className="py-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-200 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              <div className="relative bg-emerald-100 p-6 rounded-full border-4 border-emerald-500 text-emerald-600">
                <CheckCircle2 size={60} />
              </div>
              <div className="absolute -top-2 -right-2 bg-amber-400 p-2 rounded-xl border-2 border-white shadow-lg animate-bounce">
                <Star size={20} className="fill-white text-white" />
              </div>
            </div>

            <h2 className="text-3xl font-black text-slate-800 mb-3">感謝您的回饋！</h2>
            <p className="text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">
              收到您的 {rating} 星好評！您的建議將讓 <span className="text-emerald-600 font-black">Healthy Diet Manager</span> 變得更好。
            </p>

            <button
              onClick={() => setIsFeedbackSubmitted(false)}
              className="mt-8 text-sm font-black text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
            >
              再次填寫意見
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between px-6">
        <Link to="/privacy" className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-2">
          <BookOpen size={16} /> 瀏覽隱私政策
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="group flex items-center gap-3 bg-white border-2 border-rose-100 text-rose-500 px-10 py-4 rounded-[28px] font-black hover:bg-rose-500 hover:text-white hover:border-rose-600 transition-all duration-300 shadow-sm hover:shadow-rose-200"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          登出健康帳號
        </button>
      </div>

      {showTestAccountInfo && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden border-4 border-slate-100 shadow-2xl animate-in zoom-in-95">
            <div className="bg-slate-900 p-8 text-white relative">
              <button
                onClick={() => setShowTestAccountInfo(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <div className="bg-indigo-500 w-fit p-3 rounded-2xl mb-4 shadow-lg shadow-indigo-500/40">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-2xl font-black italic">公共測試帳號說明</h2>
              <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">Test Account Terms</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-amber-100 text-amber-600 p-1.5 rounded-lg"><Database size={16} /></div>
                  <div>
                    <h4 className="font-black text-slate-800">API 測試用途</h4>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">此帳號專供系統功能演示與後端 API 壓力測試使用，部分資料寫入與刪除權限受限。</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-rose-100 text-rose-600 p-1.5 rounded-lg"><Ban size={16} /></div>
                  <div>
                    <h4 className="font-black text-slate-800">資料重置提醒</h4>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">為確保測試環境整潔，公共帳號內的飲食紀錄與數據將不定期自動清除，且不提供備份服務。</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-emerald-100 text-emerald-600 p-1.5 rounded-lg"><User size={16} /></div>
                  <div>
                    <h4 className="font-black text-slate-800">建議註冊個人帳號</h4>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">若需完整體驗個人化健康管理、保存歷史分析曲線，請使用您的專屬信箱註冊個人帳號。</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowTestAccountInfo(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-lg active:translate-y-1"
              >
                我已瞭解相關條款
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const ProfileInput = ({ label, icon: Icon, type = "text", value, onChange, disabled }) => (
  <div className="space-y-2">
    <label className="text-xs font-black text-slate-400 uppercase ml-2 flex items-center gap-1">
      <Icon size={14} /> {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-5 py-4 border-2 border-slate-100 rounded-3xl bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-bold transition-all shadow-inner disabled:opacity-60 disabled:cursor-not-allowed"
    />
  </div>
);

export default Profile;
