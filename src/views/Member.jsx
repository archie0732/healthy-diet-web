import React from 'react';
import {
  Users,
  Code,
  Cpu,
  Layout as LayoutIcon,
  MessageSquare,
  Terminal,
  ChevronRight,
  ShieldCheck,
  Zap,
  Database,
  BookOpen,
  BrainCircuit,
  FolderGit2,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const team = [
  {
    name: 'Arch1e',
    role: 'Full-Stack Developer',
    tags: ['React', 'Rust', 'Vite'],
    desc: '負責前後端整合、介面設計與部署流程，讓產品從原型一路走到可實際使用的服務。',
    image: '/team1.webp',
    icon: <Terminal size={14} />,
  },
  {
    name: 'kamiya',
    role: 'Mobile App Lead',
    tags: ['Flutter', 'iOS', 'Android'],
    desc: '聚焦跨平台體驗與行動端流程設計，讓健康紀錄能在不同裝置上都保持一致與順手。',
    image: '/team2.webp',
    icon: <Cpu size={14} />,
  },
  {
    name: '空白',
    role: 'CV & ML Engineer',
    tags: ['YOLOv8', 'PyTorch'],
    desc: '處理影像辨識與模型流程，把餐點辨識與資料分析能力接進整體健康飲食體驗。',
    image: '/team3.webp',
    icon: <Code size={14} />,
  },
  {
    name: '呵公子',
    role: 'AI Strategy & NLP',
    tags: ['Prompt Engineering', 'LLM'],
    desc: '規劃 AI 對話策略、知識檢索與回答品質，讓系統在提供建議時更可靠也更貼近使用者需求。',
    image: '/team5.png',
    icon: <MessageSquare size={14} />,
  },
];

const changelog = [
  {
    version: 'v1.2.0',
    date: '2026-04-10',
    content: '新增圖表分析體驗、優化影像辨識流程，並持續調整 AI 飲食建議的互動細節。',
  },
  {
    version: 'v1.1.5',
    date: '2026-04-05',
    content: '改善行動版操作與代理路由穩定性，讓登入、查詢與聊天體驗更順暢。',
  },
  {
    version: 'v1.0.0',
    date: '2026-03-20',
    content: 'Healthy Diet 專案正式上線，整合飲食紀錄、AI 對話與健康資訊展示。',
  },
];

const ragHighlights = [
  {
    title: 'RAG 是什麼？',
    description:
      'RAG 是 Retrieval-Augmented Generation，中文常譯為「檢索增強生成」。它會先去找相關資料，再讓模型依據資料生成回答。',
    icon: <BookOpen size={18} />,
  },
  {
    title: 'RAG 怎麼運作？',
    description:
      '常見流程是「問題進來 -> 檢索知識庫 -> 挑出相關內容 -> 把內容交給模型作答」，讓回答不只靠模型記憶，也能引用專案知識。',
    icon: <Database size={18} />,
  },
  {
    title: '為什麼健康飲食系統適合用 RAG？',
    description:
      '飲食建議會碰到營養知識、專案文件與內部規則。RAG 能把這些資料集中管理，回答時更容易貼近系統脈絡與實際需求。',
    icon: <BrainCircuit size={18} />,
  },
  {
    title: 'RAG 的限制',
    description:
      '如果知識庫內容過期、檢索不到重點，模型仍可能給出不完整答案。所以文件整理、資料更新與檢索品質同樣重要。',
    icon: <Zap size={18} />,
  },
];

const repositories = [
  {
    name: 'healthy-diet-web',
    href: 'https://github.com/archie0732/healthy-diet-web',
    description: '前端網站，負責使用者介面、互動流程與資料展示。',
  },
  {
    name: 'healthy-diet-django',
    href: 'https://github.com/archie0732/healthy-diet-django',
    description: 'Django 後端，提供核心 API、資料處理與系統整合能力。',
  },
  {
    name: 'healthy-diet-ai-agent',
    href: 'https://github.com/archie0732/healthy-diet-ai-agent',
    description: 'AI Agent 與對話能力實作，承接推理、工具串接與知識工作流。',
  },
  {
    name: 'healthy-diet-api',
    href: 'https://github.com/PU-Hub/healthy-diet/tree/main/healthy-diet-api',
    description: '專案 API 相關程式碼與整合資源，補齊前後端與服務端之間的串接。',
  },
];

const Member = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700 px-4 sm:px-6">
      <div className="bg-slate-900 rounded-[48px] p-8 sm:p-16 text-center text-white shadow-2xl relative overflow-hidden border-b-8 border-indigo-600 mt-4 sm:mt-0">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-black"></div>
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-4 py-2 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest">
            <Users size={14} /> The Elite Team
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            Healthy Diet Project Team
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-xl font-medium leading-relaxed">
            我們把健康飲食、AI 對話、知識檢索與產品體驗放在同一個專案裡，持續打造一個更實用、更可信任的智慧飲食助理。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {team.map((member) => (
          <div
            key={member.name}
            className="group bg-white p-2 rounded-[32px] border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-500"
          >
            <div className="bg-slate-50 rounded-[28px] p-6 h-full flex flex-col">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto border-4 border-white shadow-lg group-hover:rotate-3 transition-transform duration-500">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-md text-indigo-600">
                  {member.icon}
                </div>
              </div>

              <div className="text-center flex-1">
                <h3 className="text-xl font-black text-slate-800">{member.name}</h3>
                <p className="text-indigo-600 text-xs font-black uppercase tracking-wider mb-3">{member.role}</p>
                <p className="text-slate-500 text-xs leading-relaxed font-bold mb-4">
                  {member.desc}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 justify-center mt-auto">
                {member.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] font-black bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-400 uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[40px] border-2 border-slate-200 p-6 sm:p-12 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
          <LayoutIcon className="text-indigo-600" /> 版本歷程
        </h2>
        <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
          {changelog.map((log) => (
            <div key={log.version} className="relative pl-8 sm:pl-10 group">
              <div className="absolute left-0 top-1.5 w-6.5 h-6.5 bg-white border-4 border-indigo-500 rounded-full z-10 group-hover:scale-125 transition-transform" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 w-fit">
                  {log.version}
                </span>
                <span className="text-xs font-bold text-slate-400">{log.date}</span>
              </div>
              <p className="text-slate-600 font-bold text-sm leading-relaxed">{log.content}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white rounded-[40px] border-2 border-slate-200 p-6 sm:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-100 text-amber-700 p-3 rounded-2xl">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">RAG 科普小教室</h2>
              <p className="text-sm font-bold text-slate-500">
                讓 AI 回答不只靠模型記憶，而是能先查資料再回覆。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ragHighlights.map((item) => (
              <article
                key={item.title}
                className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 hover:border-amber-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white text-amber-600 p-2.5 rounded-xl shadow-sm border border-slate-200">
                    {item.icon}
                  </div>
                  <h3 className="text-base font-black text-slate-800">{item.title}</h3>
                </div>
                <p className="text-sm leading-7 text-slate-600 font-medium">{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[40px] p-6 sm:p-10 shadow-2xl border-4 border-slate-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-emerald-400 via-slate-900 to-black" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/10 text-emerald-300 p-3 rounded-2xl border border-white/10">
                <FolderGit2 size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black">專案 GitHub</h2>
                <p className="text-sm font-bold text-slate-400">
                  這裡可以看到前端、後端、AI Agent 與 API 相關程式碼。
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {repositories.map((repo) => (
                <a
                  key={repo.href}
                  href={repo.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-[24px] border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-emerald-400/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black text-white">{repo.name}</h3>
                      <p className="text-sm text-slate-300 leading-6 mt-1">{repo.description}</p>
                    </div>
                    <ExternalLink size={18} className="text-emerald-300 shrink-0 mt-1" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

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
              想進一步了解系統串接方式、端點設計與資料流，可以從 API 文件快速掌握整體架構。
            </p>
          </div>
        </div>
        <Link
          to="/api"
          className="relative z-10 w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-4 rounded-2xl font-black transition-colors shadow-lg shadow-emerald-500/20 text-center flex items-center justify-center gap-2"
        >
          <Code size={20} className="stroke-[2.5px]" /> 查看 API 文件
        </Link>
      </div>

      <div className="flex flex-col items-center gap-6 pt-6">
        <div className="w-20 h-1 bg-slate-200 rounded-full" />
        <Link
          to="/privacy"
          className="group flex items-center justify-center w-full sm:w-auto gap-3 bg-slate-800 text-white px-8 py-4 rounded-3xl font-black hover:bg-black transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 text-sm sm:text-base"
        >
          <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
          查看隱私權政策與服務條款
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
