import React from 'react';
import { Users, Code, Cpu, Layout as LayoutIcon, MessageSquare, Terminal, ChevronRight, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Member = () => {
  const team = [
    { name: 'Arch1e', role: 'Full-Stack Developer', tags: ['React', 'Rust', 'Vite'], desc: '主導系統架構設計，專注於前端高性能 UI 與後端非同步 API 之開發。', image: '/team1.webp', icon: <Terminal size={14} /> },
    { name: 'kamiya', role: 'Mobile App Lead', tags: ['Flutter', 'iOS', 'Android'], desc: '負責跨平台移動端之移植開發，致力於提供用戶極致流暢的行動健康管理體驗。', image: '/team2.webp', icon: <Cpu size={14} /> },
    { name: '空白', role: 'CV & ML Engineer', tags: ['YOLOv8', 'PyTorch'], desc: '視覺辨識核心專家，負責模型訓練優化與食物體積估算算法。', image: '/team3.webp', icon: <Code size={14} /> },
    { name: '呵公子', role: 'AI Strategy & NLP', tags: ['Prompt Engineering', 'LLM'], desc: '專精於語意分析與大語言模型調優，賦予 AI 營養師更具溫度的對話能力。', image: '/team5.png', icon: <MessageSquare size={14} /> }
  ];

  const changelog = [
    { version: 'v1.2.0', date: '2026-04-10', content: '整合 Recharts 視覺化數據圖表、新增 YOLO 歷史紀錄對話模式。' },
    { version: 'v1.1.5', date: '2026-04-05', content: '優化 Mobile 端導覽體驗，修正登入 Proxy 轉發邏輯。' },
    { version: 'v1.0.0', date: '2026-03-20', content: '健康飲食 APP 正式公測，啟動 AI 營養諮詢與相機辨識功能。' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700 px-4 sm:px-6">

      <div className="bg-slate-900 rounded-[48px] p-8 sm:p-16 text-center text-white shadow-2xl relative overflow-hidden border-b-8 border-indigo-600 mt-4 sm:mt-0">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-black"></div>
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-4 py-2 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest">
            <Users size={14} /> The Elite Team
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            用技術重塑健康生活
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-xl font-medium leading-relaxed">
            我們是一個由開發者與演算法工程師組成的團隊，致力於將先進的 AI 視覺與 NLP 技術轉化為每個人觸手可及的健康工具。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {team.map((m, idx) => (
          <div key={idx} className="group bg-white p-2 rounded-[32px] border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-500">
            <div className="bg-slate-50 rounded-[28px] p-6 h-full flex flex-col">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto border-4 border-white shadow-lg group-hover:rotate-3 transition-transform duration-500">
                  <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-md text-indigo-600">
                  {m.icon}
                </div>
              </div>

              <div className="text-center flex-1">
                <h3 className="text-xl font-black text-slate-800">{m.name}</h3>
                <p className="text-indigo-600 text-xs font-black uppercase tracking-wider mb-3">{m.role}</p>
                <p className="text-slate-500 text-xs leading-relaxed font-bold mb-4">
                  {m.desc}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 justify-center mt-auto">
                {m.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-black bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-400 uppercase">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[40px] border-2 border-slate-200 p-6 sm:p-12 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
          <LayoutIcon className="text-indigo-600" /> 版本更新歷程
        </h2>
        <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
          {changelog.map((log, i) => (
            <div key={i} className="relative pl-8 sm:pl-10 group">
              <div className="absolute left-0 top-1.5 w-6.5 h-6.5 bg-white border-4 border-indigo-500 rounded-full z-10 group-hover:scale-125 transition-transform" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 w-fit">{log.version}</span>
                <span className="text-xs font-bold text-slate-400">{log.date}</span>
              </div>
              <p className="text-slate-600 font-bold text-sm leading-relaxed">{log.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 rounded-[40px] p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between shadow-2xl border-4 border-slate-800 relative overflow-hidden group">
        <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Code size={200} className="text-emerald-500" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 md:mb-0 relative z-10">
          <div className="bg-slate-800 p-5 rounded-3xl text-emerald-400 border-2 border-slate-700 shadow-inner w-fit">
            <Zap size={36} />
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">Developers API</h3>
            <p className="text-slate-400 text-sm font-bold max-w-sm">
              想要親自串接我們的服務嗎？查看完整的 RESTful API 規格與傳輸文件。
            </p>
          </div>
        </div>
        <Link
          to="/api"
          className="relative z-10 w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-4 rounded-2xl font-black transition-colors shadow-lg shadow-emerald-500/20 text-center flex items-center justify-center gap-2"
        >
          <Code size={20} className="stroke-[2.5px]" /> 前往 API 檔案
        </Link>
      </div>

      <div className="flex flex-col items-center gap-6 pt-6">
        <div className="w-20 h-1 bg-slate-200 rounded-full" />
        <Link
          to="/privacy"
          className="group flex items-center justify-center w-full sm:w-auto gap-3 bg-slate-800 text-white px-8 py-4 rounded-3xl font-black hover:bg-black transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 text-sm sm:text-base"
        >
          <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
          查看隱私條款與服務政策
          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>
        <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest text-center">
          © 2026 Healthy Diet Project Team. All Rights Reserved.
        </p>
      </div>

    </div>
  );
};

export default Member;
