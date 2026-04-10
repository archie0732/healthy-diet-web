import React, { useState, useRef } from 'react';
import {
  Server, Code, Terminal, Key, Users,
  Camera, Activity, CheckCircle2, XCircle,
  FileJson, Shield, Zap
} from 'lucide-react';

const apiData = [
  {
    category: 'Authentication',
    icon: <Key size={18} />,
    endpoints: [
      {
        method: 'POST', path: '/auth/login', summary: '使用者登入', auth: false,
        desc: '驗證使用者身分並返回存取 Token 及使用者資訊。',
        req: { email: 'example@example.com', password: 'password' },
        resSuccess: { token: 'eyJhbG...', refreshToken: 'eyJhbG...', expiresIn: 3600, user: { id: 'uuid', email: 'example@example.com', nickname: 'HealthyUser' } },
        resError: { error: 'Invalid email or password' }
      },
      {
        method: 'POST', path: '/auth/register', summary: '使用者註冊', auth: false,
        desc: '建立新的使用者帳戶。',
        req: { email: 'example@example.com', password: 'password', nickname: 'NewUser' },
        resSuccess: { token: 'eyJhbG...', refreshToken: 'eyJhbG...', expiresIn: 3600, user: { id: 'uuid', email: 'example@example.com', nickname: 'NewUser' } },
        resError: { error: 'Email already exists' }
      },
      {
        method: 'POST', path: '/auth/refresh', summary: '更新 Token', auth: false,
        desc: '使用更新 Token 產生新的存取 Token。',
        req: { refreshToken: 'eyJhbGciOiJIUzI1Ni...' },
        resSuccess: { token: 'eyJhbG...', refreshToken: 'eyJhbG...', expiresIn: 3600, user: { id: 'uuid', email: 'example@example.com' } },
        resError: { error: 'Invalid or expired refresh token' }
      }
    ]
  },
  {
    category: 'Users',
    icon: <Users size={18} />,
    endpoints: [
      {
        method: 'GET', path: '/user/profile', summary: '取得個人資料', auth: true,
        desc: '取得使用者的基本資料、身體數值以及最近的 AI 諮詢紀錄。',
        req: null,
        resSuccess: { id: 'uuid', email: 'user@ex.com', nickname: 'FitUser', height: 175.5, weight: 68.0, dietaryRestrictions: '素食', aiConsultations: [] },
        resError: { error: 'Unauthorized. Token missing or invalid.' }
      },
      {
        method: 'PUT', path: '/user/profile', summary: '更新個人資料', auth: true,
        desc: '更新使用者的生理數值與飲食偏好 (支援部分更新)。',
        req: { nickname: 'FitUser', height: 176.0, weight: 67.5, dietary_restrictions: '不吃花生' },
        resSuccess: { id: 'uuid', email: 'user@ex.com', nickname: 'FitUser', height: 176.0, weight: 67.5, dietaryRestrictions: '不吃花生' },
        resError: { error: 'Invalid data format for height/weight' }
      }
    ]
  },
  {
    category: 'Diet Records',
    icon: <Camera size={18} />,
    endpoints: [
      {
        method: 'POST', path: '/diet', summary: '食物圖片辨識', auth: true,
        desc: '上傳圖片，使用 YOLO 模型辨識食物種類並估算熱量 (multipart/form-data)。',
        req: "// FormData 格式\n{\n  \"image\": \"<File Binary>\"\n}",
        resSuccess: { message: '辨識與熱量計算完成', total_calories: 452.5, detected_items: [{ class: 'pork', confidence: 0.94, estimated_weight_g: 120.5, calories: 301.25 }] },
        resError: { error: 'No image file provided or format unsupported' }
      },
      {
        method: 'GET', path: '/diet_record', summary: '取得歷史飲食紀錄', auth: true,
        desc: '取得使用者過去的所有 YOLO 辨識與 AI 營養評分紀錄。',
        req: null,
        resSuccess: [
          {
            id: "ffb32ebb-e3d4-4285-a83d-d475d02d76d1",
            created_at: "2026-04-10 15:51:38.709437 UTC",
            total_calories: 2095.78,
            grain_calories: 520.0,
            protein_meat_calories: 1473.14,
            vegetable_calories: 102.6,
            ai_health_score: 30,
            ai_evaluation: "熱量嚴重超標且蛋白質過量，蔬菜攝取極度不足..."
          }
        ],
        resError: { error: 'Internal Server Error while fetching records' }
      }
    ]
  },
  {
    category: 'Nutrition & AI',
    icon: <Zap size={18} />,
    endpoints: [
      {
        method: 'POST', path: '/consult', summary: 'AI 營養諮詢', auth: true,
        desc: '發送問題給 AI，系統會自動結合使用者身體數據給出個人化建議。',
        req: { question: '我剛跑完步，晚餐推薦吃什麼？' },
        resSuccess: { reply: '運動後建議補充優質蛋白質，考慮到您的資料，建議攝取雞胸肉或水煮蛋。' },
        resError: { error: 'AI Service rate limit exceeded (429)' }
      }
    ]
  },
  {
    category: 'System',
    icon: <Activity size={18} />,
    endpoints: [
      {
        method: 'GET', path: '/health', summary: 'API 健康檢查', auth: false,
        desc: '返回 API 服務目前的運作狀態。',
        req: null,
        resSuccess: { status: 'ok', time: '2026-04-10T10:30:00.000Z', uptime: 86400 },
        resError: { status: 'degraded', error: 'Database connection timeout' }
      }
    ]
  }
];

const getMethodColor = (method) => {
  switch (method) {
    case 'GET': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'POST': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'PUT': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const ApiDocs = () => {
  const [activeEndpoint, setActiveEndpoint] = useState(apiData[0].endpoints[0]);

  const [activeTab, setActiveTab] = useState('req');

  const detailsRef = useRef(null);

  const handleSelectEndpoint = (ep) => {
    setActiveEndpoint(ep);
    setActiveTab(ep.req ? 'req' : 'success');

    if (window.innerWidth < 1024 && detailsRef.current) {
      setTimeout(() => {
        detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 px-4 sm:px-6">

      <div className="bg-slate-900 rounded-[32px] sm:rounded-[40px] p-6 sm:p-12 text-white shadow-2xl relative overflow-hidden border-b-8 border-indigo-500 mt-4 sm:mt-0">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-4 py-1.5 rounded-full text-indigo-300 text-xs font-black tracking-widest uppercase mb-4">
              <Terminal size={14} /> Developer Portal
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-2">Healthy Diet API <span className="text-indigo-400">v1.0</span></h1>
            <p className="text-slate-400 font-medium max-w-2xl text-sm sm:text-base">
              提供完整的使用者認證、YOLO 飲食記錄管理、營養分析及個人化 AI 建議功能 RESTful 端點。
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700 w-full md:w-fit">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Base URLs</p>
            <div className="space-y-2 font-mono text-xs sm:text-sm break-all">
              <div className="flex items-center gap-2"><Server size={14} className="text-emerald-400 shrink-0" /> <span className="text-slate-300">http://localhost:3000/api</span></div>
              <div className="flex items-center gap-2"><Server size={14} className="text-blue-400 shrink-0" /> <span className="text-slate-300">http://120.110.113.111:3000</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-w-0">

        <div className="w-full lg:w-1/3 bg-white rounded-[32px] border-2 border-slate-100 shadow-sm p-5 sm:p-6 lg:overflow-y-auto lg:max-h-[800px] scrollbar-hide">
          <h2 className="text-lg font-black text-slate-800 mb-6 px-2 flex items-center gap-2">
            <Code className="text-indigo-600" /> 端點目錄
          </h2>
          <div className="space-y-6">
            {apiData.map((category, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2 border-b-2 border-slate-50 pb-2">
                  {category.icon} {category.category}
                </h3>
                <div className="space-y-1.5">
                  {category.endpoints.map((ep, epIdx) => (
                    <button
                      key={epIdx}
                      onClick={() => handleSelectEndpoint(ep)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 font-bold text-sm ${activeEndpoint.path === ep.path && activeEndpoint.method === ep.method
                        ? 'bg-indigo-50 border-2 border-indigo-200 text-indigo-900 shadow-sm'
                        : 'border-2 border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border font-black w-14 text-center shrink-0 ${getMethodColor(ep.method)}`}>
                        {ep.method}
                      </span>
                      <span className="truncate">{ep.path}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div ref={detailsRef} className="w-full lg:w-2/3 flex flex-col gap-6 min-w-0 scroll-mt-24">

          <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-sm p-6 sm:p-10 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-sm px-3 py-1 rounded-lg border-2 font-black shrink-0 ${getMethodColor(activeEndpoint.method)}`}>
                  {activeEndpoint.method}
                </span>
                <span className="text-lg sm:text-2xl font-black text-slate-800 font-mono tracking-tight break-all">
                  {activeEndpoint.path}
                </span>
              </div>
              {activeEndpoint.auth && (
                <span className="flex items-center w-fit gap-1.5 text-xs font-bold bg-amber-50 text-amber-700 border-2 border-amber-200 px-3 py-1.5 rounded-xl shadow-sm shrink-0">
                  <Shield size={14} /> 需要 Token
                </span>
              )}
            </div>

            <h3 className="text-lg font-black text-slate-700 mb-2">{activeEndpoint.summary}</h3>
            <p className="text-slate-500 font-bold leading-relaxed text-sm">
              {activeEndpoint.desc}
            </p>
          </div>

          <div className="bg-[#0f172a] rounded-[32px] border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col min-w-0 w-full">

            <div className="flex bg-slate-800/80 border-b-2 border-slate-800 overflow-x-auto scrollbar-hide">
              {activeEndpoint.req && (
                <button
                  onClick={() => setActiveTab('req')}
                  className={`flex items-center gap-2 px-5 py-4 text-xs sm:text-sm font-black whitespace-nowrap transition-colors ${activeTab === 'req' ? 'bg-[#0f172a] text-emerald-400 border-t-2 border-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-t-2 border-transparent'}`}
                >
                  <FileJson size={16} /> Request Payload
                </button>
              )}
              <button
                onClick={() => setActiveTab('success')}
                className={`flex items-center gap-2 px-5 py-4 text-xs sm:text-sm font-black whitespace-nowrap transition-colors ${activeTab === 'success' ? 'bg-[#0f172a] text-blue-400 border-t-2 border-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-t-2 border-transparent'}`}
              >
                <CheckCircle2 size={16} /> 200 OK Response
              </button>
              <button
                onClick={() => setActiveTab('error')}
                className={`flex items-center gap-2 px-5 py-4 text-xs sm:text-sm font-black whitespace-nowrap transition-colors ${activeTab === 'error' ? 'bg-[#0f172a] text-rose-400 border-t-2 border-rose-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-t-2 border-transparent'}`}
              >
                <XCircle size={16} /> 400/500 Errors
              </button>
            </div>

            <div className="p-4 sm:p-6 w-full max-w-full overflow-x-auto overflow-y-auto max-h-[50vh] scrollbar-thin scrollbar-thumb-slate-600">
              {activeTab === 'req' && activeEndpoint.req && (
                <pre className="text-emerald-300 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap sm:whitespace-pre">
                  <code>{typeof activeEndpoint.req === 'string' ? activeEndpoint.req : JSON.stringify(activeEndpoint.req, null, 2)}</code>
                </pre>
              )}

              {activeTab === 'success' && (
                <pre className="text-blue-300 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap sm:whitespace-pre">
                  <code>{JSON.stringify(activeEndpoint.resSuccess, null, 2)}</code>
                </pre>
              )}

              {activeTab === 'error' && (
                <pre className="text-rose-300 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap sm:whitespace-pre">
                  <code>{JSON.stringify(activeEndpoint.resError, null, 2)}</code>
                </pre>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
