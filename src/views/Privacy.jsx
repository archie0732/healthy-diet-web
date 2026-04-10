import React from 'react';
import {
  ShieldCheck, FileText, Database, Activity,
  Users, Scale, CheckCircle2, AlertCircle, ChevronRight
} from 'lucide-react';

const Privacy = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-700 pb-20">

      <div className="bg-white p-8 sm:p-12 rounded-[40px] shadow-sm border-2 border-slate-100 relative overflow-hidden">
        <ShieldCheck size={200} className="absolute -right-10 -top-10 text-emerald-50 opacity-50" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center">
          <div className="bg-emerald-500 p-5 rounded-[24px] text-white shadow-lg shadow-emerald-200 mb-6 sm:mb-0 sm:mr-8 flex items-center justify-center border-2 border-emerald-400">
            <ShieldCheck size={36} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">服務條款與隱私聲明</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full text-xs border border-emerald-100">Official Policy</span>
              <p className="text-slate-400 text-sm font-bold">最後更新日期：2026 年 04 月 10 日</p>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-10 text-slate-700 leading-relaxed relative z-10">

          <section className="group">
            <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center group-hover:text-emerald-600 transition-colors">
              <FileText className="mr-3 text-emerald-500" size={24} /> 1. 資訊收集與核心用途
            </h2>
            <div className="pl-9 space-y-4">
              <p className="font-bold text-slate-600">歡迎使用「健康飲食 APP」。為了驅動 AI 辨識與個人化建議，我們會收集：</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <li className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex items-start gap-3">
                  <div className="bg-white p-1.5 rounded-lg text-emerald-500 shadow-sm border border-slate-100 mt-1"><CheckCircle2 size={14} /></div>
                  <span className="text-sm font-bold text-slate-500"><strong className="text-slate-800">生理數據：</strong>Email、身高體重、疾病史，僅用於精確計算。</span>
                </li>
                <li className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex items-start gap-3">
                  <div className="bg-white p-1.5 rounded-lg text-emerald-500 shadow-sm border border-slate-100 mt-1"><CheckCircle2 size={14} /></div>
                  <span className="text-sm font-bold text-slate-500"><strong className="text-slate-800">影像資料：</strong>YOLO 辨識之照片採即時推論，不儲存於公開資料庫。</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="group">
            <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center group-hover:text-emerald-600 transition-colors">
              <Database className="mr-3 text-emerald-500" size={24} /> 2. 數據處理與安全架構
            </h2>
            <div className="pl-9">
              <div className="bg-indigo-50/50 p-6 rounded-3xl border-2 border-indigo-100 space-y-3">
                <p className="text-sm font-bold text-indigo-900 leading-loose">
                  我們的系統採用高度安全的 JWT (JSON Web Token) 驗證機制。所有影像數據在經過 <span className="underline decoration-indigo-300 underline-offset-4">Python 代理伺服器</span> 轉發至 <span className="underline decoration-indigo-300 underline-offset-4">Rust 核心</span> 運算後，系統會自動釋放記憶體資源，確保您的數位足跡不會在非授權的情況下留存。
                </p>
              </div>
            </div>
          </section>

          <section className="bg-amber-50 p-6 sm:p-8 rounded-[32px] border-2 border-amber-200 shadow-sm relative overflow-hidden">
            <Activity className="absolute -right-6 -bottom-6 text-amber-200/50" size={120} />
            <h2 className="text-xl font-black text-amber-800 mb-4 flex items-center">
              <Activity className="mr-3" size={24} /> 3. 醫療與專業免責聲明
            </h2>
            <div className="space-y-3 relative z-10">
              <p className="text-amber-900 font-extrabold text-lg leading-snug">
                本系統提供之所有數據（包含熱量、評分、營養建議）僅供日常健康管理參考，絕對不具備醫療診斷或專業處方之效力。
              </p>
              <p className="text-amber-700 text-sm font-bold leading-relaxed">
                AI 技術（YOLO 與 LLM）可能存在環境或演算誤差。特定疾病患者、孕婦或高風險族群，在調整飲食前請務必諮詢執業醫師或註冊營養師之意見。
              </p>
            </div>
          </section>

          <section className="group">
            <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center group-hover:text-emerald-600 transition-colors">
              <Scale className="mr-3 text-emerald-500" size={24} /> 4. 服務修改與最終解釋權
            </h2>
            <div className="pl-9 text-slate-500 text-sm font-bold leading-relaxed space-y-2">
              <p>我們保留隨時修改、更新或終止本服務條款之權利。重大條款更動將於系統首頁或 Member 版本歷程中公告。</p>
              <p>本開發團隊對系統產出之結果、數據分析內容及本服務條款擁有最終解釋權。</p>
            </div>
          </section>
        </div>

        {/* 🔽 最重要的法律確認紅框 🔽 */}
        <div className="mt-16 p-8 bg-rose-50 border-2 border-rose-200 rounded-[32px] shadow-lg shadow-rose-100 animate-pulse-slow">
          <div className="flex items-start gap-4">
            <div className="bg-rose-500 text-white p-2 rounded-xl shadow-md mt-1">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-3">
              <h4 className="text-xl font-black text-rose-800">使用者同意聲明</h4>
              <p className="text-rose-700 font-bold leading-relaxed">
                如果您繼續使用本系統（包含登入、辨識、諮詢等功能），即視為您已充分閱讀、理解並完全同意上述所有服務條款與隱私政策。
              </p>
              <div className="flex items-center gap-2 text-rose-500 font-black text-xs uppercase tracking-widest mt-4">
                <ChevronRight size={14} /> Agreed & Accepted by User
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-slate-400 text-xs font-black tracking-widest uppercase">
          © 2026 Healthy Diet Project Team · Protecting Your Privacy
        </p>
      </div>
    </div>
  );
};

export default Privacy;
