import React, { useState, useEffect } from 'react';
import { Activity, Flame, TrendingUp, Calendar, AlertTriangle, Bell, X, CheckCircle2, PieChart as PieChartIcon, Clock, HeartPulse, Scale, Globe, Users, Sparkles, Database, Image as ImageIcon } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';

// 專治 Safari 時間解析器
const safeParseDate = (dateString) => {
  if (!dateString) return new Date();
  let safeStr = dateString.replace(' ', 'T');
  safeStr = safeStr.replace(/(\.\d{3})\d+/, '$1');
  safeStr = safeStr.replace(/\+00$/, 'Z').replace(' UTC', 'Z');
  let d = new Date(safeStr);
  if (isNaN(d.getTime())) {
    safeStr = dateString.split('.')[0].replace(' ', 'T') + 'Z';
    d = new Date(safeStr);
  }
  return isNaN(d.getTime()) ? new Date() : d;
};

const Dashboard = ({ user, apiFetch }) => {
  const [dietRecords, setDietRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // 詳情彈窗相關 State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('analysis'); // 'analysis' | 'image'
  const [recordImageBase64, setRecordImageBase64] = useState(null);
  const [imageFetchStatus, setImageFetchStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  const [visitStats, setVisitStats] = useState([]);
  const [todayVisit, setTodayVisit] = useState(0);

  useEffect(() => {
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome_v1.2');
    if (!hasSeenWelcome) {
      setShowWelcomeModal(true);
      sessionStorage.setItem('hasSeenWelcome_v1.2', 'true');
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await apiFetch('/diet_record');
      if (Array.isArray(data)) {
        setDietRecords(data.reverse());
      }
      const statsData = await apiFetch('/month_stats');
      if (Array.isArray(statsData)) {
        setVisitStats(statsData);
        const todayData = statsData[statsData.length - 1];
        if (todayData) {
          setTodayVisit(todayData.visit_count);
        }
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 彈窗處理邏輯 ---
  const closeModal = () => {
    setSelectedRecord(null);
    setActiveModalTab('analysis');
    setRecordImageBase64(null);
    setImageFetchStatus('idle');
  };

  const handleTabSwitch = async (tab) => {
    setActiveModalTab(tab);
    if (tab === 'image' && imageFetchStatus === 'idle' && selectedRecord?.id) {
      setImageFetchStatus('loading');
      try {
        // 🌟 改成 POST，並把 id 塞進 JSON body 裡面
        const res = await apiFetch(`/diet_image`, {
          method: 'POST',
          body: JSON.stringify({ record_id: selectedRecord.id })
        });

        if (res.image_base64) {
          setRecordImageBase64(res.image_base64);
          setImageFetchStatus('success');
        } else {
          setImageFetchStatus('error');
        }
      } catch (e) {
        console.error('Failed to fetch image:', e);
        setImageFetchStatus('error');
      }
    }
  };

  // --- 身體數據計算 (BMI & BMR) ---
  const height = Number(user?.height) || 0;
  const weight = Number(user?.weight) || 0;
  const age = Number(user?.age) || 25;
  const gender = user?.gender || 'male';

  let bmi = 0;
  let bmiStatus = { label: '未提供數據', color: 'text-slate-400', bg: 'bg-slate-100' };
  let bmr = 0;
  let heightInMeters = 0;

  if (height > 0 && weight > 0) {
    heightInMeters = height / 100;
    bmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(1));

    if (bmi < 18.5) bmiStatus = { label: '體重過輕', color: 'text-blue-600', bg: 'bg-blue-100' };
    else if (bmi >= 18.5 && bmi < 24) bmiStatus = { label: '健康標準', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    else if (bmi >= 24 && bmi < 27) bmiStatus = { label: '過重', color: 'text-amber-600', bg: 'bg-amber-100' };
    else bmiStatus = { label: '肥胖', color: 'text-rose-600', bg: 'bg-rose-100' };

    if (gender === 'male' || gender === '男') {
      bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
    } else {
      bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161);
    }
  }

  // --- 數據處理 ---
  const trendData = dietRecords.map(record => {
    const date = safeParseDate(record.created_at || record.createdAt);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
      score: Number(record.ai_health_score) || 0
    };
  });

  const latestMeal = dietRecords.length > 0 ? dietRecords[dietRecords.length - 1] : null;

  const nutritionData = latestMeal ? [
    { name: '穀物', value: Number(latestMeal.grain_calories) || 0, color: '#f59e0b' },
    { name: '肉蛋', value: Number(latestMeal.protein_meat_calories) || 0, color: '#ef4444' },
    { name: '蔬菜', value: Number(latestMeal.vegetable_calories) || 0, color: '#10b981' },
  ].filter(item => item.value > 0) : [];

  const getRadarData = (rec) => [
    { subject: '穀物', A: Number(rec.grain_area) || 0 },
    { subject: '肉蛋', A: Number(rec.protein_meat_area) || 0 },
    { subject: '蔬菜', A: Number(rec.vegetable_area) || 0 },
    { subject: '水果', A: Number(rec.fruit_area) || 0 },
    { subject: '乳品', A: Number(rec.dairy_area) || 0 },
    { subject: '油脂', A: Number(rec.nuts_area) || 0 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6 relative">

      {/* --- 初次登入與更新推播彈窗 --- */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border-4 border-slate-100">
            <button onClick={() => setShowWelcomeModal(false)} className="absolute top-4 right-4 bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:rotate-90 transition-all">
              <X size={20} />
            </button>

            {user?.email === 'ckck@gmail.com' && (
              <div className="bg-rose-50 border-4 border-rose-200 p-5 rounded-2xl mb-6 relative overflow-hidden">
                <AlertTriangle size={80} className="absolute -right-4 -bottom-4 text-rose-100 opacity-50" />
                <h3 className="font-black text-rose-700 flex items-center gap-2 mb-3 relative z-10">
                  <AlertTriangle size={18} /> 此帳號為測試帳號
                </h3>
                <ol className="list-decimal ml-4 text-sm font-bold text-rose-600 space-y-2 relative z-10">
                  <li>您無法更動此帳號的個人生理資料。</li>
                  <li>上傳任何數據將視為您同意我們的條款，我們有權利研究、刪除與修改您的測試資料。</li>
                </ol>
              </div>
            )}

            <div className="bg-emerald-50 border-4 border-emerald-100 p-5 rounded-2xl">
              <h3 className="font-black text-emerald-700 flex items-center gap-2 mb-4">
                <Bell size={18} /> 版本更新推播 (v1.2.0)
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <HeartPulse size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-slate-700"><span className="text-emerald-600">身體指數回歸：</span>為您自動計算精準的 BMI 與 BMR 基礎代謝率！</span>
                </li>
                <li className="flex items-start gap-2">
                  <PieChartIcon size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-slate-700"><span className="text-emerald-600">全新圓餅圖：</span>首頁最新一餐營養結構視覺大升級，比例更清晰！</span>
                </li>
              </ul>
            </div>

            <button onClick={() => setShowWelcomeModal(false)} className="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-black text-lg hover:bg-slate-800 active:scale-95 transition-all">
              我知道了，開始使用
            </button>
          </div>
        </div>
      )}

      {/* --- 歷史紀錄詳情彈窗 (包含圖片 Tabs 標籤切換) --- */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-lg relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh] border-4 border-slate-100">

            <div className="p-4 sm:p-6 border-b-4 border-slate-100 flex flex-col gap-4 bg-white rounded-t-[32px] sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Activity size={20} className="text-emerald-500" /> 飲食紀錄詳情
                </h3>
                <button onClick={closeModal} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs 切換按鈕 */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleTabSwitch('analysis')}
                  className={`flex-1 py-2.5 rounded-xl border-4 font-black transition-colors ${activeModalTab === 'analysis' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                >
                  分析結果
                </button>
                <button
                  onClick={() => handleTabSwitch('image')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-4 font-black transition-colors ${activeModalTab === 'image' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                >
                  <ImageIcon size={18} /> 照片紀錄
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">

              {/* === 分頁 1: 營養分析結果 === */}
              {activeModalTab === 'analysis' && (
                <>
                  <div className="flex justify-between items-center">
                    <div className="bg-emerald-600 text-white px-5 py-2 rounded-2xl border-4 border-emerald-500">
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Health Score</p>
                      <p className="text-3xl font-black">{selectedRecord.ai_health_score}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 mb-1">辨識時間</p>
                      <p className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-md border-2 border-slate-200">
                        {safeParseDate(selectedRecord.created_at || selectedRecord.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-[32px] border-4 border-slate-100">
                    <h4 className="text-center font-black text-slate-800 mb-2">營養密度雷達圖</h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarData(selectedRecord)}>
                          <PolarGrid stroke="#cbd5e1" strokeWidth={2} />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} />
                          <Radar name="餐點比例" dataKey="A" stroke="#10b981" strokeWidth={4} fill="#10b981" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-emerald-50 p-6 rounded-[32px] border-4 border-emerald-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={18} className="text-emerald-600" />
                      <span className="font-black text-emerald-800">AI 營養師建議</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-900 leading-relaxed italic">
                      "{selectedRecord.ai_evaluation}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <div className="bg-slate-50 p-4 rounded-3xl border-4 border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">預估總熱量</p>
                      <p className="text-lg font-black text-slate-800">
                        {Number(selectedRecord.total_calories || 0).toFixed(0)} kcal
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl border-4 border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">分析狀態</p>
                      <p className="text-lg font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 size={16} strokeWidth={3} /> 成功</p>
                    </div>
                  </div>
                </>
              )}

              {/* === 分頁 2: 圖片顯示 === */}
              {activeModalTab === 'image' && (
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-slate-50 rounded-[32px] border-4 border-slate-100 p-4">
                  {imageFetchStatus === 'loading' && (
                    <div className="flex flex-col items-center text-emerald-500">
                      <Activity size={40} className="animate-spin mb-2" />
                      <p className="font-black text-sm">正在載入分析照片...</p>
                    </div>
                  )}
                  {imageFetchStatus === 'error' && (
                    <div className="flex flex-col items-center text-rose-500">
                      <AlertTriangle size={48} className="mb-3 opacity-50" />
                      <p className="font-black text-sm text-slate-500">無法載入，圖片可能已遺失</p>
                    </div>
                  )}
                  {imageFetchStatus === 'success' && recordImageBase64 && (
                    <img
                      src={`data:image/jpeg;base64,${recordImageBase64}`}
                      alt="Diet Record Analysis"
                      className="w-full h-auto rounded-2xl border-4 border-emerald-100 object-contain max-h-[50vh]"
                    />
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- 歡迎區塊 --- */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-[32px] sm:rounded-[40px] p-8 sm:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20">
          <Activity size={200} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-black mb-2">歡迎回來，{user?.nickname || '使用者'}！</h1>
          <p className="text-emerald-50 font-bold text-sm sm:text-base max-w-md">
            今日的 AI 營養分析已經準備就緒，持續追蹤飲食紀錄以獲得更準確的健康建議。
          </p>
        </div>
      </div>

      {/* --- 身體數據與流量狀態儀表板 --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* 1. BMI 卡片 */}
        <div className="bg-white p-6 rounded-[32px] border-4 border-emerald-400 flex flex-col justify-center relative overflow-hidden group cursor-pointer" tabIndex="0">
          <div className="relative z-10 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-4">
            <h3 className="text-sm font-black text-slate-400 mb-1 flex items-center gap-2">
              <Scale size={16} className="text-emerald-500" /> BMI 身體質量指數
            </h3>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-4xl font-black text-slate-800">{bmi > 0 ? bmi : '--'}</span>
              {bmi > 0 && <span className={`text-xs font-bold px-2 py-1 rounded-md mb-1 ${bmiStatus.bg} ${bmiStatus.color}`}>{bmiStatus.label}</span>}
            </div>
            <p className="text-xs font-bold text-slate-400">根據您設定的身高 {height}cm 體重 {weight}kg</p>
          </div>
          <Scale size={80} className="absolute -right-4 -bottom-4 text-emerald-50 transition-transform duration-500 group-hover:scale-150 group-hover:-rotate-12" />

          <div className="absolute inset-0 bg-emerald-500 p-6 flex flex-col justify-center opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 transition-all duration-300 z-20 translate-y-8 group-hover:translate-y-0">
            <h4 className="text-sm font-black text-emerald-100 mb-2 flex items-center gap-2">
              <Scale size={16} /> 計算公式與分析
            </h4>
            <div className="space-y-1.5 text-[11px] font-bold text-emerald-50">
              <p>公式: 體重(kg) / 身高(m)²</p>
              <p>帶入: {weight} / ({heightInMeters} × {heightInMeters})</p>
              <div className="h-px w-full bg-emerald-400/50 my-1"></div>
              <p className="text-sm">結果: <span className="text-white text-lg font-black">{bmi}</span> ({bmiStatus.label})</p>
              <p className="text-[10px] text-emerald-200 mt-1 leading-relaxed">
                {bmi < 18.5 ? '建議增加優質蛋白質與碳水化合物的攝取。' : bmi >= 24 ? '建議搭配適度有氧運動與飲食控制。' : '請繼續保持良好的飲食與運動習慣！'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. BMR 卡片 */}
        <div className="bg-white p-6 rounded-[32px] border-4 border-emerald-400 flex flex-col justify-center relative overflow-hidden group cursor-pointer" tabIndex="0">
          <div className="relative z-10 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-4">
            <h3 className="text-sm font-black text-slate-400 mb-1 flex items-center gap-2">
              <Flame size={16} className="text-emerald-500" /> BMR 基礎代謝率
            </h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-black text-slate-800">{bmr > 0 ? bmr : '--'}</span>
              <span className="text-sm font-bold text-slate-400 mb-1.5">kcal/天</span>
            </div>
            <p className="text-xs font-bold text-slate-400">維持生命所需的最低熱量</p>
          </div>
          <Flame size={80} className="absolute -right-4 -bottom-4 text-emerald-50 transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12" />

          <div className="absolute inset-0 bg-emerald-500 p-6 flex flex-col justify-center opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 transition-all duration-300 z-20 translate-y-8 group-hover:translate-y-0">
            <h4 className="text-sm font-black text-emerald-100 mb-2 flex items-center gap-2">
              <Flame size={16} /> 公式 (Mifflin-St Jeor)
            </h4>
            <div className="space-y-1 text-[11px] font-bold text-emerald-50">
              <p>參數: 10W + 6.25H - 5A {gender === 'male' || gender === '男' ? '+ 5' : '- 161'}</p>
              <p className="tracking-tighter">帶入: 10×{weight} + 6.25×{height} - 5×{age} {gender === 'male' || gender === '男' ? '+ 5' : '- 161'}</p>
              <div className="h-px w-full bg-emerald-400/50 my-1"></div>
              <p className="text-sm">結果: <span className="text-white text-lg font-black">{bmr}</span> kcal/天</p>
              <p className="text-[10px] text-emerald-200 mt-1 leading-relaxed">
                此數值為每日基本消耗，建議總熱量攝取以此為基準進行規劃。
              </p>
            </div>
          </div>
        </div>

        {/* 3. 系統狀態卡片 */}
        <div className="bg-slate-900 p-6 rounded-[32px] border-4 border-emerald-500 flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full">
            <h3 className="text-sm font-black text-slate-400 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users size={16} className="text-emerald-400" /> 網站造訪人數
              </span>
              <div className="bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
                Live 紀錄中
              </div>
            </h3>

            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-black text-white">{todayVisit}</span>
              <span className="text-sm font-bold text-slate-400 mb-1.5">人次 / 今日</span>
            </div>

            <div className="w-full h-16 min-h-[64px] shrink-0 mt-auto">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={visitStats}>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '2px solid #10b981', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#34d399' }}
                    labelStyle={{ display: 'none' }}
                    formatter={(value) => [`${value} 人次`, '造訪']}
                  />
                  <Line
                    type="monotone"
                    dataKey="visit_count"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#0f172a', stroke: '#10b981', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#10b981', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* --- 圖表區 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[32px] border-4 border-slate-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-500" /> AI 評分趨勢
            </h2>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400 font-bold">載入數據中...</div>
          ) : trendData.length > 0 ? (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', shadow: 'none', fontWeight: 'bold' }} itemStyle={{ color: '#10b981', fontWeight: 900 }} />
                  <Line type="monotone" dataKey="score" name="健康評分" stroke="#10b981" strokeWidth={4} dot={{ fill: '#10b981', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Calendar size={48} className="mb-4 opacity-20" />
              <p className="font-bold">目前還沒有足夠的數據畫出趨勢圖</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[32px] border-4 border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <PieChartIcon className="text-emerald-500" /> 最新一餐結構
            </h2>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">載入中...</div>
          ) : latestMeal && nutritionData.length > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-xs font-bold text-slate-400 mb-2">
                總熱量: <span className="text-emerald-600 font-black">{Number(latestMeal.total_calories || 0).toFixed(0)} kcal</span>
              </p>

              <div className="h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={nutritionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none" animationDuration={1000}>
                      {nutritionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`${value.toFixed(0)} kcal`, '熱量']} contentStyle={{ borderRadius: '12px', border: 'none', shadow: 'none', fontWeight: 'bold', fontSize: '12px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                  <span className="text-2xl font-black text-slate-800">{latestMeal.ai_health_score}</span>
                  <span className="text-[9px] font-bold text-slate-400">SCORE</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Flame size={48} className="mb-4 opacity-20" />
              <p className="font-bold text-sm">尚無今日營養數據</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-[32px] border-4 border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Clock className="text-emerald-500" /> 近期歷史紀錄
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400 font-bold">載入紀錄中...</div>
        ) : dietRecords.length > 0 ? (
          <div className="space-y-4">
            {[...dietRecords].reverse().slice(0, 5).map((record, index) => {
              const d = safeParseDate(record.created_at || record.createdAt);
              const formattedDate = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

              return (
                <div
                  key={record.id || index}
                  onClick={() => setSelectedRecord(record)}
                  className="bg-slate-50 p-5 rounded-2xl border-4 border-slate-200 hover:border-emerald-400 hover:bg-white hover:border-b-4 hover:translate-y-1 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center border-4 transition-transform group-hover:scale-110 ${record.ai_health_score >= 80 ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : record.ai_health_score >= 60 ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-rose-100 border-rose-200 text-rose-700'}`}>
                      <span className="text-[10px] font-black uppercase opacity-60 leading-none">Score</span>
                      <span className="text-lg font-black leading-none mt-1">{record.ai_health_score}</span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors">YOLO 飲食辨識</p>
                      <p className="text-xs font-bold text-slate-400">{formattedDate}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end w-full sm:w-auto">
                    <div className="text-sm font-black text-slate-700 bg-white px-3 py-1.5 rounded-lg border-2 border-slate-300 w-fit mb-2 group-hover:border-emerald-400 transition-colors">
                      總熱量: <span className="text-emerald-600">{Number(record.total_calories || 0).toFixed(0)}</span> kcal
                    </div>
                    <p className="text-xs font-bold text-slate-500 line-clamp-1 max-w-sm sm:text-right">
                      "{record.ai_evaluation}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Database size={48} className="mb-4 opacity-20" />
            <p className="font-bold">尚無歷史紀錄，請至相機頁面進行分析</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
