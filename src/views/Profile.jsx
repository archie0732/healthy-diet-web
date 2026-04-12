import React, { useState } from 'react';
import {
  User, BookOpen, Weight, Ruler, Calendar,
  Dna, ShieldAlert, Ban, LogOut, CheckCircle2,
  Droplets, Dumbbell, TrendingDown, AlertTriangle
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

  // 判斷是否為測試帳號
  const isTestAccount = user?.email === 'ckck@gmail.com';

  // 模擬健康進度數據
  const waterProgress = 65;
  const exerciseProgress = 3;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 雙重防護：送出時再次阻擋測試帳號
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

  // --- BMI 圓環圖數據與動態對話 ---
  const heightM = user?.height / 100;
  const bmi = heightM && user?.weight ? (user?.weight / (heightM * heightM)).toFixed(1) : 0;
  const bmiPieData = [{ value: parseFloat(bmi) }, { value: Math.max(0, 40 - parseFloat(bmi)) }];

  let bmiMessage = "請先補全身高與體重數據，以解鎖您的專屬 BMI 分析。";
  const bmiValue = parseFloat(bmi);
  if (bmiValue > 0) {
    if (bmiValue < 18.5) {
      bmiMessage = "您的體重過輕，建議增加優質蛋白質與碳水化合物的攝取。";
    } else if (bmiValue >= 18.5 && bmiValue < 24) {
      bmiMessage = "您的體重處於健康標準區間，請繼續保持目前的飲食與運動規律！";
    } else if (bmiValue >= 24 && bmiValue < 27) {
      bmiMessage = "您的體重稍微過重，建議搭配適度有氧運動與飲食控制。";
    } else {
      bmiMessage = "您的體重處於肥胖區間，請多加注意飲食管理，必要時尋求專業協助。";
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="font-black text-slate-800 mb-2 flex items-center gap-2">
            <TrendingDown size={18} className="text-indigo-500" /> 身體質量狀態
          </h3>
          <div className="h-40 w-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bmiPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  startAngle={180}
                  endAngle={0}
                  paddingAngle={5}
                  dataKey="value"
                >
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
          <p className="text-xs font-bold text-slate-500 text-center px-4 leading-relaxed">
            {bmiMessage}
          </p>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border-2 border-slate-200 shadow-sm flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-700 flex items-center gap-2">
                  <Droplets className="text-blue-500" size={20} /> 每日飲水進度
                </span>
                <span className="text-[10px] leading-none bg-blue-100 text-blue-600 px-2 py-1 rounded-full border border-blue-200 font-bold">
                  Beta
                </span>
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
                <span className="font-black text-slate-700 flex items-center gap-2">
                  <Dumbbell className="text-emerald-500" size={20} /> 本週運動達標
                </span>
                <span className="text-[10px] leading-none bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full border border-emerald-200 font-bold">
                  Beta
                </span>
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

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-[40px] border-2 border-slate-200 shadow-sm space-y-8">

        {isTestAccount && (
          <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-700 mb-2">
            <AlertTriangle className="shrink-0" size={20} />
            <p className="text-sm font-bold">目前使用測試猿帳號 (<span className="font-black">ckck@gmail.com</span>)，已暫停個人資料修改權限。</p>
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
            className="hidden sm:flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:border-b-4 disabled:active:translate-y-0"
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
              className="w-full px-5 py-4 border-2 border-slate-100 rounded-[32px] bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-bold transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="w-full px-5 py-4 border-2 border-slate-100 rounded-[32px] bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-bold transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="例如：花生過敏、全素..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isTestAccount}
          className="sm:hidden w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          儲存變更
        </button>
      </form>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between px-6">
        <Link to="/privacy" className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-2">
          <BookOpen size={16} /> 瀏覽隱私政策
        </Link>

        {/* 🌟 恢復成最原本單純的 onClick={handleLogout} */}
        <button
          type="button"
          onClick={handleLogout}
          className="group flex items-center gap-3 bg-white border-2 border-rose-100 text-rose-500 px-10 py-4 rounded-[28px] font-black hover:bg-rose-500 hover:text-white hover:border-rose-600 transition-all duration-300 shadow-sm hover:shadow-rose-200"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          登出健康帳號
        </button>
      </div>

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
