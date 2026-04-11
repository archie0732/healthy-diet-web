import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Camera, Activity, User, Server,
  CheckCircle2, Sparkles, TrendingUp, PieChart, History,
  Calendar, X, AlertTriangle, Flame, Calculator, Info
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const API_BASE = '/api';

const SLOGANS = [
  "今天也是邁向健康的一天。多喝水，保持愉悅的心情喔！",
  "健康不是一蹴可幾，而是每天的小小累積。繼續加油！",
  "傾聽身體的聲音，給它最需要的營養與適當的休息。",
  "你的每一份堅持，都在為未來的健康打下堅實的基礎。",
  "不求完美，只求進步。今天的你，比昨天更健康了嗎？"
];

const Dashboard = ({ user, apiFetch }) => {
  const [health, setHealth] = useState(null);
  const [dietRecords, setDietRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [currentSlogan, setCurrentSlogan] = useState("");
  const [activeTooltip, setActiveTooltip] = useState(null); // 控制 BMI/BMR 詳細視窗 ('bmi' | 'bmr' | null)

  useEffect(() => {
    setCurrentSlogan(SLOGANS[Math.floor(Math.random() * SLOGANS.length)]);

    fetch(`${API_BASE}/health`)
      .then(() => setHealth({ status: 'ok' }))
      .catch(console.error);

    const fetchRecords = async () => {
      try {
        const data = await apiFetch('/diet_record', { method: 'GET' });
        if (Array.isArray(data)) setDietRecords(data);
      } catch (err) {
        console.error("無法取得飲食紀錄:", err);
      }
    };
    fetchRecords();
  }, [apiFetch]);

  const isDesktop = () => window.innerWidth >= 768;
  const handleMouseEnter = (type) => { if (isDesktop()) setActiveTooltip(type); };
  const handleMouseLeave = () => { if (isDesktop()) setActiveTooltip(null); };
  const handleClick = (type) => { if (!isDesktop()) setActiveTooltip(prev => prev === type ? null : type); };

  let bmi = null;
  let bmiStatus = '';
  let bmiColor = 'text-slate-500 bg-slate-100 border-slate-200';

  const heightM = user?.height ? user.height / 100 : null;
  const weight = user?.weight || null;
  const age = user?.age || null;
  const gender = user?.gender || null;

  if (heightM && weight) {
    bmi = (weight / (heightM * heightM)).toFixed(1);
    if (bmi < 18.5) { bmiStatus = '過輕'; bmiColor = 'text-blue-600 bg-blue-50 border-blue-200'; }
    else if (bmi < 24) { bmiStatus = '健康'; bmiColor = 'text-emerald-600 bg-emerald-50 border-emerald-200'; }
    else if (bmi < 27) { bmiStatus = '過重'; bmiColor = 'text-orange-600 bg-orange-50 border-orange-200'; }
    else { bmiStatus = '肥胖'; bmiColor = 'text-red-600 bg-red-50 border-red-200'; }
  }

  let bmr = null;
  if (heightM && weight && age && gender) {
    if (gender === 'Male') {
      bmr = (10 * weight) + (6.25 * user.height) - (5 * age) + 5;
    } else if (gender === 'Female') {
      bmr = (10 * weight) + (6.25 * user.height) - (5 * age) - 161;
    }
  }

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

  const trendData = [...dietRecords].reverse().map(record => {
    const date = safeParseDate(record.created_at || record.createdAt);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
      score: Number(record.ai_health_score) || 0
    };
  });

  const latestMeal = dietRecords.length > 0 ? dietRecords[0] : null;
  const nutritionData = latestMeal ? [
    { name: '穀物', value: latestMeal.grain_calories, color: '#FCD34D' },
    { name: '肉類蛋白', value: latestMeal.protein_meat_calories, color: '#F87171' },
    { name: '植物蛋白', value: latestMeal.protein_bean_calories, color: '#A7F3D0' },
    { name: '蔬菜', value: latestMeal.vegetable_calories, color: '#34D399' },
    { name: '水果', value: latestMeal.fruit_calories, color: '#F472B6' },
    { name: '乳製品', value: latestMeal.dairy_calories, color: '#93C5FD' },
    { name: '堅果', value: latestMeal.nuts_calories, color: '#D8B4E2' },
  ].filter(item => item.value > 0) : [];

  const recentRecords = dietRecords.slice(0, 5);
  const formatDate = (dateString) => {
    const d = safeParseDate(dateString);
    if (isNaN(d.getTime())) return '時間未知';
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 relative pb-10">

      <div className="bg-linear-to-r from-emerald-500 via-green-500 to-teal-500 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border-2 border-emerald-400/50">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-2 sm:mb-3">
            您好，{user?.nickname || '健康實踐者'}！ 👋
          </h1>
          <p className="text-emerald-50 text-sm sm:text-lg max-w-xl leading-relaxed font-medium">
            {currentSlogan}
          </p>
        </div>
        <div className="absolute top-0 right-0 -mt-4 -mr-4 sm:-mt-10 sm:-mr-10 text-white opacity-10 transform rotate-12">
          <Activity className="w-48 h-48 sm:w-64 sm:h-64" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">

        <div
          className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-200 relative cursor-pointer sm:cursor-default"
          onMouseEnter={() => handleMouseEnter('bmi')}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick('bmi')}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600"><User size={22} /></div>
            <Info size={18} className="text-slate-300" />
          </div>
          <p className="text-sm text-slate-500 font-bold mb-1">BMI 身體質量指數</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{bmi || '--'}</span>
            {bmi && <span className={`text-xs px-2 py-0.5 rounded-md font-bold border ${bmiColor}`}>{bmiStatus}</span>}
          </div>
          {activeTooltip === 'bmi' && (
            <div className="absolute top-full left-0 mt-2 w-full bg-slate-800 text-white p-4 rounded-xl shadow-xl z-20 text-sm animate-in fade-in slide-in-from-top-2 border-2 border-slate-700">
              <p className="font-bold text-emerald-400 mb-2 border-b border-slate-600 pb-1">BMI 計算公式</p>
              <p className="font-mono bg-slate-900 p-2 rounded-lg text-center mb-3">體重(kg) ÷ 身高²(m²)</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-blue-300">過輕</span><span>&lt; 18.5</span></div>
                <div className="flex justify-between"><span className="text-emerald-300">健康</span><span>18.5 - 24</span></div>
                <div className="flex justify-between"><span className="text-orange-300">過重</span><span>24 - 27</span></div>
                <div className="flex justify-between"><span className="text-red-300">肥胖</span><span>&ge; 27</span></div>
              </div>
            </div>
          )}
        </div>

        <div
          className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-200 relative cursor-pointer sm:cursor-default"
          onMouseEnter={() => handleMouseEnter('bmr')}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick('bmr')}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600"><Flame size={22} /></div>
            <Info size={18} className="text-slate-300" />
          </div>
          <p className="text-sm text-slate-500 font-bold mb-1">BMR 基礎代謝率</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{bmr ? bmr.toFixed(0) : '--'}</span>
            <span className="text-xs text-slate-400 font-medium">kcal/天</span>
          </div>
          {activeTooltip === 'bmr' && (
            <div className="absolute top-full left-0 mt-2 w-full bg-slate-800 text-white p-4 rounded-xl shadow-xl z-20 text-sm animate-in fade-in slide-in-from-top-2 border-2 border-slate-700">
              <p className="font-bold text-orange-400 mb-2 border-b border-slate-600 pb-1">Mifflin-St Jeor 公式</p>
              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                指人體在安靜狀態下，維持生命運作所需的最低熱量。
              </p>
              {!bmr && (
                <div className="bg-red-500/20 text-red-300 p-2 rounded-lg text-xs border border-red-500/30">
                  ⚠️ 請至「設定」完善您的性別、年齡、身高與體重以解鎖計算。
                </div>
              )}
              {bmr && (
                <div className="bg-slate-900 p-2 rounded-lg text-xs font-mono break-all text-slate-300">
                  {gender === 'Male' ? `(10×${weight})+(6.25×${user.height})-(5×${age})+5` : `(10×${weight})+(6.25×${user.height})-(5×${age})-161`}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-200">
          <div className="bg-slate-100 p-2.5 rounded-xl text-slate-600 w-fit mb-2"><Server size={22} /></div>
          <p className="text-sm text-slate-500 font-bold mb-1">後端 API 伺服器</p>
          <div className="text-lg font-bold text-slate-800 flex items-center mt-1">
            {health?.status === 'ok' ? (
              <span className="text-emerald-600 flex items-center bg-emerald-50 border-2 border-emerald-100 px-3 py-1 rounded-lg text-sm shadow-sm">
                <CheckCircle2 size={16} className="mr-1.5 stroke-[2.5px]" /> 正常連線中
              </span>
            ) : (
              <span className="text-amber-600 text-sm bg-amber-50 border-2 border-amber-100 px-3 py-1 rounded-lg shadow-sm">連線檢查中...</span>
            )}
          </div>
        </div>

      </div>

      {dietRecords.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-200">
            <h2 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center">
              <TrendingUp className="mr-2 text-indigo-500 stroke-[2.5px]" /> AI 健康分數趨勢
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickMargin={10} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="score" name="健康分數" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-200">
            <h2 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <PieChart className="mr-2 text-emerald-500 stroke-[2.5px]" /> 最新一餐營養結構
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                總熱量 {latestMeal?.total_calories?.toFixed(0)} kcal
              </span>
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nutritionData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: '2px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={(value) => [`${value.toFixed(1)} kcal`, '熱量']}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {nutritionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 overflow-hidden">
        <div className="p-6 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center">
            <History className="mr-2 text-slate-600 stroke-[2.5px]" /> 近期飲食紀錄
          </h2>
          <Link to="/diet" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl transition-colors shadow-sm">
            + 新增紀錄
          </Link>
        </div>

        <div className="divide-y-2 divide-slate-100">
          {recentRecords.length > 0 ? recentRecords.map((record, idx) => (
            <div
              key={record.id || idx}
              onClick={() => setSelectedRecord(record)}
              className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-4 mb-3 sm:mb-0">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border-2 ${record.ai_health_score >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  record.ai_health_score >= 60 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-red-50 text-red-600 border-red-200'
                  }`}>
                  {record.ai_health_score}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar size={16} className="text-slate-400 stroke-[2.5px]" />
                    <span className="text-sm font-bold text-slate-700">
                      {formatDate(record.created_at || record.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-500 flex gap-3">
                    <span>總熱量: <strong className="text-slate-800">{record.total_calories?.toFixed(0)}</strong> kcal</span>
                    {record.ai_health_score < 60 && (
                      <span className="text-red-500 flex items-center"><AlertTriangle size={14} className="mr-1 stroke-[2.5px]" /> 需注意</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-500 bg-white border-2 border-slate-200 px-5 py-2.5 rounded-xl group-hover:border-indigo-400 group-hover:text-indigo-700 group-hover:bg-indigo-50 transition-all w-full sm:w-auto text-center font-bold shadow-sm">
                查看分析
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-slate-500">
              <Camera size={48} className="mx-auto mb-4 text-slate-300 stroke-[1.5px]" />
              <p className="font-bold">目前還沒有飲食紀錄，快去拍張照片吧！</p>
            </div>
          )}
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedRecord(null)}>
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 sm:p-8 text-white flex justify-between items-start ${selectedRecord.ai_health_score >= 80 ? 'bg-emerald-500' :
              selectedRecord.ai_health_score >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}>
              <div>
                <span className="bg-white/20 border border-white/30 px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-sm">
                  {formatDate(selectedRecord.created_at || selectedRecord.createdAt)}
                </span>
                <h3 className="text-3xl font-black mt-4 flex items-center gap-2 drop-shadow-md">
                  健康評分: {selectedRecord.ai_health_score}
                </h3>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors backdrop-blur-md shadow-sm">
                <X size={24} className="stroke-[2.5px]" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 shadow-sm">
                <span className="text-slate-600 font-extrabold text-base">預估總熱量</span>
                <span className="text-3xl font-black text-slate-800">{selectedRecord.total_calories?.toFixed(1)} <span className="text-sm font-bold text-slate-400">kcal</span></span>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-slate-800 mb-4 flex items-center">
                  <PieChart size={18} className="mr-2 text-indigo-500 stroke-[2.5px]" /> 營養來源拆解
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedRecord.grain_calories > 0 && <div className="p-4 bg-yellow-50 rounded-2xl border-2 border-yellow-200 text-yellow-800"><p className="text-xs font-bold opacity-70 mb-1">穀物</p><p className="font-black text-lg">{selectedRecord.grain_calories.toFixed(0)} kcal</p></div>}
                  {selectedRecord.protein_meat_calories > 0 && <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-200 text-red-800"><p className="text-xs font-bold opacity-70 mb-1">肉類蛋白</p><p className="font-black text-lg">{selectedRecord.protein_meat_calories.toFixed(0)} kcal</p></div>}
                  {selectedRecord.protein_bean_calories > 0 && <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 text-emerald-800"><p className="text-xs font-bold opacity-70 mb-1">植物蛋白</p><p className="font-black text-lg">{selectedRecord.protein_bean_calories.toFixed(0)} kcal</p></div>}
                  {selectedRecord.vegetable_calories > 0 && <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-200 text-green-800"><p className="text-xs font-bold opacity-70 mb-1">蔬菜</p><p className="font-black text-lg">{selectedRecord.vegetable_calories.toFixed(0)} kcal</p></div>}
                </div>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-slate-800 mb-4 flex items-center">
                  <Sparkles size={18} className="mr-2 text-amber-500 stroke-[2.5px]" /> AI 專屬點評
                </h4>
                <div className="p-5 bg-indigo-50 rounded-2xl border-2 border-indigo-200 text-indigo-900 text-sm md:text-base leading-relaxed font-bold shadow-sm">
                  {selectedRecord.ai_evaluation || "暫無評價資料。"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
