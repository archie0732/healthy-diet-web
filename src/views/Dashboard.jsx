import React, { useState, useEffect } from 'react';
import {
  Activity, Flame, TrendingUp, Calendar, AlertTriangle, Bell, X,
  CheckCircle2, PieChart as PieChartIcon, Clock, HeartPulse, Scale,
  Globe, Users, Sparkles, Database, Image as ImageIcon, Flag, HelpCircle, ChevronRight, ChevronLeft, Rocket
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, Radar as RechartsRadar
} from 'recharts';
import { buildApiUrl } from '@/lib/api';
import {
  readDashboardAgentStatusCache,
  writeDashboardAgentStatusCache,
} from '@/lib/dashboardAgentStatusCache';
import { useLocation } from 'react-router-dom';
import { beginDashboardPingCycle, endDashboardPingCycle } from '@/lib/dashboardPingGate';

// 修正 Safari 對日期格式的解析相容性
const safeParseDate = (dateString) => {
  if (!dateString) return new Date();
  let safeStr = dateString.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1').replace(/\+00$/, 'Z').replace(' UTC', 'Z');
  let d = new Date(safeStr);
  if (isNaN(d.getTime())) {
    safeStr = dateString.split('.')[0].replace(' ', 'T') + 'Z';
    d = new Date(safeStr);
  }
  return isNaN(d.getTime()) ? new Date() : d;
};

const splitAnnouncementContent = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  const text = String(value ?? '').trim();
  if (!text) return [];

  return text
    .split(/\r?\n|•|·|。/)
    .map((item) => item.replace(/^[\-\s]+/, '').trim())
    .filter(Boolean);
};

const selectLatestAnnouncement = (value) => {
  if (!Array.isArray(value)) return value;
  if (value.length === 0) return null;

  return [...value].sort((a, b) => {
    const timeA = new Date(a?.publishedAt ?? a?.updatedAt ?? a?.createdAt ?? 0).getTime();
    const timeB = new Date(b?.publishedAt ?? b?.updatedAt ?? b?.createdAt ?? 0).getTime();
    return timeB - timeA;
  })[0];
};

const normalizeAnnouncementPayload = (payload) => {
  const rawBase = payload?.current ?? payload?.announcement ?? payload?.data ?? payload;
  const raw = selectLatestAnnouncement(rawBase);
  if (!raw || typeof raw !== 'object') return null;

  const title = raw.title || raw.subject || raw.name || '系統公告';
  const updates = splitAnnouncementContent(
    raw.updates ?? raw.items ?? raw.messages ?? raw.content ?? raw.message,
  );
  if (updates.length === 0) return null;

  const stableId = String(
    raw.id
    ?? raw._id
    ?? raw.announcementId
    ?? raw.updatedAt
    ?? raw.publishedAt
    ?? `${title}:${updates.join('|')}`,
  );

  return { id: stableId, title, updates };
};

const CHATBOT_CHECKING_STATUS = { tone: 'checking', label: '檢查中...', detail: '' };
const GEMMA_CHECKING_STATUS = { tone: 'checking', label: '檢查中...', detail: '' };

const Dashboard = ({ user, apiFetch }) => {
  const location = useLocation();
  const loginNonce = sessionStorage.getItem('authLoginNonce') || 'default';
  const [dietRecords, setDietRecords] = useState([]);
  const [_1, setLoading] = useState(true);
  const [_, setShowWelcomeModal] = useState(false);
  const [guideStep, setGuideStep] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('analysis');
  const [recordImageBase64, setRecordImageBase64] = useState(null);
  const [imageFetchStatus, setImageFetchStatus] = useState('idle');
  const [visitStats, setVisitStats] = useState([]);
  const [todayVisit, setTodayVisit] = useState(0);
  const [chatbotStatus, setChatbotStatus] = useState(CHATBOT_CHECKING_STATUS);
  const [gemmaStatus, setGemmaStatus] = useState(GEMMA_CHECKING_STATUS);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [announcementSeenKey, setAnnouncementSeenKey] = useState('');

  const fetchAnnouncementForDashboard = async () => {
    const endpoints = [buildApiUrl('/api/announcements/current')];
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { headers });
        if (!response.ok) continue;
        const data = await response.json();
        const normalized = normalizeAnnouncementPayload(data);
        if (!normalized) continue;

        const seenKey = `announcementShown:${loginNonce}:${normalized.id}`;
        setAnnouncementSeenKey(seenKey);
        setAnnouncement(normalized);
        if (sessionStorage.getItem(seenKey) !== 'true') {
          setShowUpdateModal(true);
        }
        return;
      } catch {
        // Try next endpoint
      }
    }
  };

  useEffect(() => {
    if (!beginDashboardPingCycle(location.key)) {
      return undefined;
    }

    fetchAnnouncementForDashboard();
    fetchDashboardData();

    const cachedAgentStatuses = readDashboardAgentStatusCache(loginNonce, sessionStorage);
    if (cachedAgentStatuses) {
      setChatbotStatus(cachedAgentStatuses.chatbotStatus);
      setGemmaStatus(cachedAgentStatuses.gemmaStatus);
    } else {
      fetchAgentStatuses();
    }

    return () => {
      endDashboardPingCycle(location.key);
    };
  }, [location.key]);

  const fetchDashboardData = async () => {
    try {
      const [dietResult, statsResult] = await Promise.allSettled([
        apiFetch('/api/diet_record', { method: 'GET' }),
        apiFetch('/api/month_stats'),
      ]);

      if (dietResult.status === 'fulfilled' && Array.isArray(dietResult.value)) {
        setDietRecords(dietResult.value);
      }

      if (statsResult.status === 'fulfilled' && Array.isArray(statsResult.value)) {
        setVisitStats(statsResult.value);
        if (statsResult.value.length > 0) setTodayVisit(statsResult.value[statsResult.value.length - 1].visit_count);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchAgentStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const chatCheckRequest = async () => {
        const response = await fetch(buildApiUrl('/api/chat_check'), { headers });
        const rawText = await response.text();
        let data = {};

        if (rawText) {
          try {
            data = JSON.parse(rawText);
          } catch {
            data = { message: rawText };
          }
        }

        return { ok: response.ok, http_status: response.status, ...data };
      };

      const gemmaHealthRequest = async () => {
        const response = await fetch(buildApiUrl('/api/gemma4/health'), { headers });
        const rawText = await response.text();
        let data = {};

        if (rawText) {
          try {
            data = JSON.parse(rawText);
          } catch {
            const text = rawText.trim();
            const looksLikeHtml = /^<!doctype html>/i.test(text) || /^<html/i.test(text);
            data = { message: looksLikeHtml ? '回傳非 JSON（可能打到前端路由）' : text };
          }
        }

        return { ok: response.ok, http_status: response.status, ...data };
      };

      const [chatCheckResult, gemmaHealthResult] = await Promise.allSettled([
        chatCheckRequest(),
        gemmaHealthRequest(),
      ]);

      let nextChatbotStatus = CHATBOT_CHECKING_STATUS;
      if (chatCheckResult.status === 'fulfilled') {
        const data = chatCheckResult.value || {};
        const httpStatus = Number(data?.pingStatusCode ?? data?.http_status) || 0;
        const detailMessage =
          (typeof data?.error === 'string' && data.error.trim()) ||
          (typeof data?.message === 'string' && data.message.trim()) ||
          (typeof data?.pingResponse === 'string' && data.pingResponse.trim()) ||
          (typeof data?.ping_response === 'string' && data.ping_response.trim()) ||
          '';
        const detail = [`HTTP ${httpStatus || 'N/A'}`, detailMessage].filter(Boolean).join(' | ');

        nextChatbotStatus =
          (data?.proxyChatAvailable === true || data?.pingOk === true || (httpStatus >= 200 && httpStatus < 300))
            ? { tone: 'online', label: '運行中', detail: '' }
            : { tone: 'offline', label: '離線', detail: detail || '無法連線到聊天機器人' };
      } else {
        const reasonMessage =
          (typeof chatCheckResult.reason?.message === 'string' && chatCheckResult.reason.message) ||
          String(chatCheckResult.reason || '未知錯誤');
        console.error(chatCheckResult.reason);
        nextChatbotStatus = { tone: 'offline', label: '檢查失敗', detail: `HTTP N/A | ${reasonMessage}` };
      }

      let nextGemmaStatus = GEMMA_CHECKING_STATUS;
      if (gemmaHealthResult.status === 'fulfilled') {
        const data = gemmaHealthResult.value || {};
        const apiHttpStatus = Number(data?.httpStatusCode ?? data?.status ?? data?.http_status ?? 0);
        const detailMessage = typeof data?.message === 'string' ? data.message.trim() : '';
        const detail = [`HTTP ${apiHttpStatus || 'N/A'}`, detailMessage].filter(Boolean).join(' | ');

        nextGemmaStatus = (data?.running === true || apiHttpStatus === 200)
          ? { tone: 'online', label: '運行中', detail: '' }
          : { tone: 'offline', label: '連線失敗', detail: detail || '無法連線到 gemma4 服務' };
      } else {
        const reasonMessage =
          (typeof gemmaHealthResult.reason?.message === 'string' && gemmaHealthResult.reason.message) ||
          String(gemmaHealthResult.reason || '未知錯誤');
        console.error(gemmaHealthResult.reason);
        nextGemmaStatus = { tone: 'offline', label: '連線失敗', detail: `HTTP N/A | ${reasonMessage}` };
      }

      setChatbotStatus(nextChatbotStatus);
      setGemmaStatus(nextGemmaStatus);
      writeDashboardAgentStatusCache(loginNonce, {
        chatbotStatus: nextChatbotStatus,
        gemmaStatus: nextGemmaStatus,
      }, sessionStorage);
    } catch (err) {
      console.error(err);
    }
  };

  const latestMeal = dietRecords[0];

  const nutritionData = latestMeal ? [
    { name: '全穀雜糧', value: Number(latestMeal.grain_calories) || 0, color: '#f59e0b' },
    { name: '豆魚蛋肉', value: Number(latestMeal.protein_meat_calories) || 0, color: '#ef4444' },
    { name: '蔬菜', value: Number(latestMeal.vegetable_calories) || 0, color: '#10b981' },
  ].filter(item => item.value > 0) : [];

  const getRadarData = (rec) => [
    { subject: '全穀雜糧', A: rec?.grain_area || 0 },
    { subject: '豆魚蛋肉', A: rec?.protein_meat_area || 0 },
    { subject: '蔬菜', A: rec?.vegetable_area || 0 },
    { subject: '水果', A: rec?.fruit_area || 0 },
    { subject: '乳品', A: rec?.dairy_area || 0 },
    { subject: '堅果種子', A: rec?.nuts_area || 0 },
  ];

  const steps = [
    { title: '個人資料設定', content: '請先填寫基本身高、體重與目標，系統會用來計算建議熱量與分析方向。', position: 'bottom' },
    { title: '飲食紀錄入口', content: '你可以新增每餐紀錄，上傳照片並輸入描述，方便後續分析。', position: 'bottom' },
    { title: '分析結果總覽', content: '系統會整理熱量與六大類食物比例，幫助你快速看到飲食分布。', position: 'top' },
    { title: '聊天機器人協助', content: '若想進一步調整菜單，可以直接詢問 AI，取得即時建議。', position: 'top' },
    { title: '歷史紀錄查詢', content: '可回看過往紀錄，追蹤長期變化與改善成效。', position: 'none' },
  ];

  useEffect(() => {
    if (guideStep === 4 && dietRecords.length > 0) setSelectedRecord(dietRecords[0]);
    else if (guideStep !== 4 && guideStep !== null) setSelectedRecord(null);
  }, [guideStep, dietRecords]);

  const nextStep = () => {
    if (guideStep < steps.length - 1) setGuideStep(guideStep + 1);
    else { setGuideStep(null); setSelectedRecord(null); }
  };
  const prevStep = () => { if (guideStep > 0) setGuideStep(guideStep - 1); };

  const closeModal = () => {
    if (guideStep === 4) return;
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
        const res = await apiFetch(`/api/diet_image`, { method: 'POST', body: JSON.stringify({ record_id: selectedRecord.id }) });
        if (res.image_base64) { setRecordImageBase64(res.image_base64); setImageFetchStatus('success'); }
        else setImageFetchStatus('error');
      } catch (_) { setImageFetchStatus('error'); }
    }
  };
  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    if (announcementSeenKey) {
      sessionStorage.setItem(announcementSeenKey, 'true');
    }
  };

  const height = Number(user?.height) || 0;
  const weight = Number(user?.weight) || 0;
  const age = Number(user?.age) || 25;
  const gender = user?.gender || 'male';
  const bmi = (height > 0 && weight > 0) ? Number((weight / ((height / 100) ** 2)).toFixed(1)) : 0;
  const bmr = (height > 0 && weight > 0)
    ? ((gender === 'Female' || gender === 'female')
      ? Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161)
      : Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5))
    : 0;

  const chatbotStatusColor = chatbotStatus.tone === 'online'
    ? 'text-emerald-300'
    : chatbotStatus.tone === 'offline'
      ? 'text-rose-300'
      : chatbotStatus.tone === 'checking'
        ? 'text-amber-300'
        : 'text-slate-300';

  const gemmaStatusColor = gemmaStatus.tone === 'online'
    ? 'text-emerald-300'
    : gemmaStatus.tone === 'offline'
      ? 'text-rose-300'
      : gemmaStatus.tone === 'checking'
        ? 'text-amber-300'
        : 'text-slate-300';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6 relative">

      {showUpdateModal && announcement && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden border-4 border-amber-400 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-amber-400 p-6 text-amber-950 text-center">
              <div className="bg-white/40 w-fit mx-auto p-3 rounded-2xl mb-3">
                <Bell size={32} className="animate-ring" />
              </div>
              <h2 className="text-2xl font-black">{announcement.title}</h2>
            </div>

            <div className="p-8">
              <ul className="space-y-4 mb-8">
                {announcement.updates.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700 font-bold">
                    <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={closeUpdateModal}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all"
              >
                知道了，開始使用
              </button>
            </div>
          </div>
        </div>
      )}

      {guideStep !== null && (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-sm transition-all">
          <div className={`absolute inset-x-0 ${steps[guideStep].position === 'top' ? 'top-0' : 'bottom-0'} flex justify-center p-6 sm:p-10 pointer-events-none`}>
            <div className="bg-white rounded-[40px] p-8 max-w-xl w-full shadow-2xl border-4 border-emerald-500 pointer-events-auto animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4 text-emerald-700 font-black">
                <span>步驟 {guideStep + 1} / {steps.length}</span>
                <button onClick={() => setGuideStep(null)}><X size={24} /></button>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-3">{steps[guideStep].title}</h2>
              <p className="text-slate-600 font-bold text-lg leading-relaxed mb-8">{steps[guideStep].content}</p>
              <div className="flex gap-4">
                <button onClick={prevStep} disabled={guideStep === 0} className="flex-1 py-4 rounded-2xl font-black border-2 border-slate-200 text-slate-400">上一步</button>
                <button onClick={nextStep} className="flex-1 py-4 rounded-2xl font-black bg-emerald-600 text-white border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1">下一步</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 頁面標題列 */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">儀表板總覽 <span className="px-2 py-0.5 bg-amber-400 text-amber-950 text-[10px] rounded-lg border-2 border-amber-600 font-black shadow-[2px_2px_0px_rgba(0,0,0,0.1)] uppercase">Beta</span></h1>
        <button onClick={() => setGuideStep(0)} className="flex items-center gap-2 bg-white border-4 border-slate-100 px-4 py-2 rounded-2xl font-black text-slate-600 hover:border-emerald-400 transition-all active:scale-95 shadow-sm">
          <HelpCircle size={20} className="text-emerald-500" /> <span className="hidden sm:inline">新手導覽</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div id="guide-bmi" className={`group lg:col-span-1 rounded-[32px] sm:rounded-[40px] border-4 border-emerald-400 relative overflow-hidden shadow-lg transition-all duration-500 ease-out ${guideStep === 1 ? 'z-[310] ring-[12px] ring-emerald-500/30 scale-105 shadow-2xl' : ''}`}>
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 sm:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20"><Activity size={200} /></div>
            <h1 className="text-3xl sm:text-4xl font-black mb-2">歡迎回來，{user?.nickname || '使用者'}！</h1>
            <p className="text-emerald-50 font-bold max-w-md italic">今天也一起維持健康節奏，看看你的飲食與分析摘要。</p>
          </div>
          <Scale size={90} className="absolute -right-4 -bottom-4 text-emerald-50 transition-all duration-700 ease-out group-hover:scale-[2.5] group-hover:-rotate-45 group-hover:opacity-10 group-hover:text-emerald-900" />

          {/* Hover 覆蓋層：顯示 BMI 分級資訊 */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-700 p-5 flex flex-col justify-center opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 transition-all duration-500 ease-out z-20 text-white">
            <h4 className="text-lg font-black mb-2 flex items-center gap-2"><Scale size={18} /> BMI 身體質量指數</h4>

            {/* BMI 色帶 */}
            <div className="relative w-full h-3 bg-white/20 rounded-full mb-1 overflow-hidden flex border border-white/30 shrink-0">
              <div className="h-full bg-blue-300 w-[18%]" title="過輕" />
              <div className="h-full bg-emerald-400 w-[24%]" title="正常" />
              <div className="h-full bg-orange-400 w-[28%]" title="過重" />
              <div className="h-full bg-rose-500 flex-1" title="肥胖" />
            </div>
            <div className="flex justify-between text-[10px] font-black mb-3 opacity-80 px-1 shrink-0">
              <span>18.5</span><span>24</span><span>27</span>
            </div>

            {/* BMI 分級列表 */}
            <div className="space-y-1 text-xs font-bold flex-1">
              {[
                { label: '體重過輕', range: '< 18.5', active: bmi < 18.5 },
                { label: '健康體位', range: '18.5 - 24', active: bmi >= 18.5 && bmi < 24 },
                { label: '體重過重', range: '24 - 27', active: bmi >= 24 && bmi < 27 },
                { label: '肥胖等級', range: '>= 27', active: bmi >= 27 }
              ].map((item, i) => (
                <div key={i} className={`flex justify-between items-center px-3 py-1.5 rounded-xl transition-all duration-300 ${item.active ? 'bg-white text-emerald-700 scale-[1.02] shadow-md ring-2 ring-white/50' : 'bg-black/10 opacity-60'}`}>
                  <span>{item.label}</span>
                  <span className="text-[10px] sm:text-xs">{item.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BMR 卡片：顯示基礎代謝率與 TDEE */}
        <div id="guide-bmr" className={`group bg-white p-6 rounded-[32px] border-4 border-amber-400 flex flex-col justify-center relative overflow-hidden transition-all duration-500 ease-out cursor-pointer hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.4)] ${guideStep === 1 ? 'z-[310] ring-[12px] ring-amber-500/30 scale-105 shadow-2xl' : ''}`}>
          <div className="relative z-10 transition-all duration-500 group-hover:opacity-0 group-hover:-translate-y-6 group-hover:scale-95">
            <h3 className="text-sm font-black text-slate-400 mb-1 flex items-center gap-2"><Flame size={16} className="text-amber-500" /> BMR 基礎代謝率</h3>
            <div className="flex items-end gap-2 mb-2"><span className="text-4xl font-black text-slate-800">{bmr > 0 ? bmr : '--'}</span><span className="text-sm font-bold text-slate-400 mb-1.5">kcal/天</span></div>
            <p className="text-xs font-bold text-slate-400">身體每天維持基本機能所需熱量</p>
          </div>
          <Flame size={90} className="absolute -right-4 -bottom-4 text-amber-50 transition-all duration-700 ease-out group-hover:scale-[2.5] group-hover:rotate-12 group-hover:opacity-10 group-hover:text-amber-900" />

          {/* Hover 顯示更完整的熱量資訊 */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-700 p-8 flex flex-col justify-center opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 transition-all duration-500 ease-out z-20 text-white">
            <h4 className="text-xl font-black mb-4 flex items-center gap-2"><Flame size={20} /> 每日熱量建議</h4>

            <div className="bg-white/10 rounded-2xl p-4 mb-6 border border-white/20 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase opacity-70 mb-2 tracking-widest">計算參考資料</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm font-bold">
                <div className="flex justify-between border-b border-white/10 pb-1"><span>體重</span><span>{weight}kg</span></div>
                <div className="flex justify-between border-b border-white/10 pb-1"><span>身高</span><span>{height}cm</span></div>
                <div className="flex justify-between border-b border-white/10 pb-1"><span>年齡</span><span>{age}歲</span></div>
                <div className="flex justify-between border-b border-white/10 pb-1"><span>性別</span><span>{gender === 'Female' || gender === 'female' ? '女性' : '男性'}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white text-orange-700 p-4 rounded-2xl shadow-xl transform transition-transform duration-500 translate-y-4 group-hover:translate-y-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black uppercase">預估每日總消耗熱量 (TDEE)</span>
                  <span className="bg-orange-100 px-2 py-0.5 rounded text-[10px]">輕度活動</span>
                </div>
                <div className="text-2xl font-black">{Math.round(bmr * 1.375)} <span className="text-sm">kcal</span></div>
              </div>

              <p className="text-[11px] font-bold leading-relaxed opacity-90 italic px-2 transform transition-transform duration-500 delay-100 translate-y-4 group-hover:translate-y-0">建議把每日熱量控制在 {Math.round(bmr * 1.2)} ~ {Math.round(bmr * 1.5)} kcal，並依活動量與目標逐步微調。</p>
            </div>
          </div>
        </div>

        {/* 今日造訪與聊天機器人狀態 */}
        <div className="group bg-slate-900 p-6 rounded-[32px] border-4 border-slate-800 hover:border-emerald-500 flex flex-col justify-center relative overflow-hidden shadow-lg transition-all duration-500 hover:-translate-y-2 cursor-default">
          <div className="absolute top-0 -left-[100%] w-1/2 h-full block transform -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent z-20 group-hover:left-[200%] transition-all duration-1000 ease-in-out pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full">
            <h3 className="text-sm font-black text-white/50 mb-1 flex justify-between items-center">
              <span className="flex items-center gap-2 transition-colors duration-300 group-hover:text-emerald-400"><Users size={16} className="text-emerald-400" /> 今日造訪人次</span>
              <div className="bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">即時</div>
            </h3>
            <div className="flex items-end gap-2 mb-2 text-white"><span className="text-4xl font-black group-hover:text-emerald-300 transition-colors duration-300">{todayVisit}</span><span className="text-sm font-bold text-slate-400 mb-1.5">人次</span></div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold">
              <Rocket size={14} className={chatbotStatusColor} />
              <span className="text-slate-400">聊天機器人狀態</span>
              <span className={chatbotStatusColor}>{chatbotStatus.label}</span>
            </div>
            {chatbotStatus.detail ? <p className="mb-2 text-[10px] font-bold text-slate-500">{chatbotStatus.detail}</p> : null}
            <div
              className={`mb-2 flex items-center gap-2 text-xs font-bold ${gemmaStatus.detail ? 'cursor-help' : ''}`}
              title={gemmaStatus.detail || undefined}
            >
              <Database size={14} className={gemmaStatusColor} />
              <span className="text-slate-400">Gemma4 模型狀態</span>
              <span className={gemmaStatusColor}>{gemmaStatus.label}</span>
            </div>
            <div className="w-full h-16 min-h-[64px] mt-auto opacity-70 group-hover:opacity-100">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visitStats}>
                  <XAxis dataKey="date" hide />
                  <Line type="monotone" dataKey="visit_count" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div id="guide-trend" className={`lg:col-span-2 bg-white p-6 sm:p-8 rounded-[32px] border-4 border-slate-100 flex flex-col justify-center relative transition-all duration-300 ${guideStep === 2 ? 'z-[310] ring-[12px] ring-emerald-500/30 scale-[1.01] shadow-2xl bg-white' : ''}`}>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6"><TrendingUp className="text-emerald-500" /> AI 健康分數趨勢</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[...dietRecords].slice(0, 10).reverse().map((r, index) => {
                  const d = safeParseDate(r.created_at);
                  const uniqueDateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

                  return {
                    date: uniqueDateStr,
                    score: Number(r.ai_health_score) || 0
                  };
                })}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" hide />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 'black' }} />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div id="guide-pie" className={`bg-white p-6 sm:p-8 rounded-[32px] border-4 border-slate-100 flex flex-col transition-all duration-300 ${guideStep === 3 ? 'z-[310] ring-[12px] ring-emerald-500/30 scale-[1.01] shadow-2xl bg-white' : ''}`}>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2"><PieChartIcon className="text-emerald-500" /> 飲食熱量分布</h2>
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            {latestMeal ? (
              <>
                <p className="text-xs font-bold text-slate-400 mb-4">總熱量 <span className="text-emerald-600 font-black">{latestMeal.total_calories?.toFixed(0)} kcal</span></p>
                <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={nutritionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                        {nutritionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-3xl font-black text-slate-800">{latestMeal.ai_health_score}</span>
                    <span className="text-[10px] font-bold text-slate-400">分數</span>
                  </div>
                </div>
              </>
            ) : <div className="text-slate-300 font-bold">目前沒有資料</div>}
          </div>
        </div>
      </div>

      <div id="guide-history" className="bg-white p-6 sm:p-8 rounded-[32px] border-4 border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6"><Clock className="text-emerald-500" /> 近期飲食紀錄</h2>
        <div className="space-y-4">
          {dietRecords.slice(0, 5).map((record, index) => (
            <div key={index} onClick={() => setSelectedRecord(record)} className="bg-white p-5 rounded-2xl border-4 border-slate-200 hover:border-emerald-400 transition-all cursor-pointer flex justify-between items-center group shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center border-4 ${record.ai_health_score >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  <span className="text-lg font-black">{record.ai_health_score}</span>
                </div>
                <div><p className="text-sm font-black text-slate-800 capitalize">YOLO 飲食辨識</p><p className="text-[10px] font-bold text-slate-400">{safeParseDate(record.created_at).toLocaleString()}</p></div>
              </div>
              <div className="text-sm font-black text-slate-700 border-2 border-slate-100 px-4 py-2 rounded-xl group-hover:border-emerald-400 transition-all">總熱量 <span className="text-emerald-600">{record.total_calories?.toFixed(0)}</span> kcal</div>
            </div>
          ))}
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className={`bg-white rounded-[40px] w-full max-w-lg relative border-4 flex flex-col max-h-[90vh] shadow-2xl transition-all ${guideStep === 4 ? 'border-emerald-500' : 'border-slate-100'}`}>
            {guideStep === 4 && (
              <div className="bg-emerald-600 p-6 rounded-t-[36px] text-white animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-3 text-xs font-black uppercase bg-emerald-700/50 w-fit px-2 py-1 rounded">導覽最後一步</div>
                <h2 className="text-2xl font-black mb-2">{steps[4].title}</h2>
                <p className="font-bold opacity-90 leading-relaxed mb-4 text-lg">{steps[4].content}</p>
                <div className="flex gap-3">
                  <button onClick={prevStep} className="flex-1 py-3 bg-emerald-700 text-white rounded-xl font-black shadow-inner">上一步</button>
                  <button onClick={() => { setGuideStep(null); setSelectedRecord(null); }} className="flex-[2] py-3 bg-white text-emerald-700 rounded-xl font-black shadow-lg hover:scale-95 transition-all">完成導覽並關閉</button>
                </div>
              </div>
            )}
            <div className="p-6 border-b-4 border-slate-100 bg-white rounded-t-[32px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Activity size={20} className="text-emerald-500" /> 紀錄詳細資訊</h3>
                {guideStep !== 4 && <button onClick={closeModal} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:rotate-90 transition-all p-1"><X size={20} /></button>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActiveModalTab('analysis')} className={`flex-1 py-3 rounded-xl border-4 font-black transition-colors ${activeModalTab === 'analysis' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>分析結果</button>
                <button onClick={() => handleTabSwitch('image')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-4 font-black transition-colors ${activeModalTab === 'image' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}><ImageIcon size={18} /> 影像紀錄</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin scrollbar-thumb-slate-200">
              {activeModalTab === 'analysis' ? (
                <>
                  <div className="bg-slate-50 p-4 rounded-[32px] border-4 border-slate-100 min-h-[300px]">
                    <h4 className="text-center font-black text-slate-700 mb-2">六大類食物比例</h4>
                    <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData(selectedRecord)}><PolarGrid stroke="#cbd5e1" strokeWidth={2} /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} /><RechartsRadar name="熱量" dataKey="A" stroke="#10b981" strokeWidth={4} fill="#10b981" fillOpacity={0.4} /></RadarChart></ResponsiveContainer></div>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-[32px] border-4 border-emerald-100">
                    <div className="flex items-center gap-2 mb-2 text-emerald-700 font-black"><Sparkles size={18} /> AI 健康建議</div>
                    <p className="text-sm font-bold text-emerald-900 leading-relaxed italic">"{selectedRecord?.ai_evaluation || 'AI 尚未提供評語...'}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pb-4">
                    <div className="bg-slate-50 p-4 rounded-3xl border-4 border-slate-100 text-center shadow-inner"><p className="text-[10px] font-black text-slate-400 uppercase">總熱量（估算）</p><p className="text-xl font-black text-slate-800">{Number(selectedRecord?.total_calories || 0).toFixed(0)} <span className="text-xs">kcal</span></p></div>
                    <div className="bg-slate-50 p-4 rounded-3xl border-4 border-slate-100 text-center shadow-inner"><p className="text-[10px] font-black text-slate-400 uppercase">健康分數</p><p className="text-xl font-black text-emerald-600">{selectedRecord?.ai_health_score} <span className="text-xs">分</span></p></div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-slate-50 rounded-[32px] border-4 border-slate-100 p-4">
                  {imageFetchStatus === 'loading' ? <Activity size={40} className="animate-spin text-emerald-500" /> : recordImageBase64 ? <img src={`data:image/jpeg;base64,${recordImageBase64}`} className="max-w-full rounded-2xl border-4 border-emerald-100 shadow-md" alt="record" /> : <div className="text-slate-400 font-bold">目前無影像資料</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

