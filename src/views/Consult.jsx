import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Activity, Send, Sparkles, BrainCircuit, Flag, X, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Consult = ({ user, apiFetch, showNotification, fetchProfile }) => {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const chatContainerRef = useRef(null);

  // 回報選單狀態
  const [reportingIdx, setReportingIdx] = useState(null);

  // --- 導覽相關 State ---
  const [guideStep, setGuideStep] = useState(null);

  const historyData = user?.aiConsultations || user?.ai_consultations;

  // 進入聊天室時，凍結滾動
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);

  // 反轉陣列
  useEffect(() => {
    if (historyData && Array.isArray(historyData)) {
      setChatHistory([...historyData].reverse());
    }
  }, [historyData]);

  // 滾動到底部邏輯
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [chatHistory, isThinking]);

  // --- 導覽步驟定義 (動態產生) ---
  const allSteps = [
    { title: "提問輸入區", content: "在這裡輸入任何健康或飲食問題，點擊綠色按鈕開始諮詢。", target: "guide-input", position: "top" },
    { title: "快速建議卡片", content: "如果您不知道要問什麼，可以直接點擊這裡的小卡片。", target: "guide-suggestions", position: "top" },
    { title: "AI 建議內容", content: "這是 AI 提供的回答。您可以隨時上下滑動查看之前的對話。", target: "guide-chat", position: "top", requiresHistory: true },
    { title: "回報錯誤功能", content: "如果您覺得 AI 的回答有誤，點擊右下角的旗幟按鈕即可回報。", target: "guide-report", position: "top", requiresHistory: true },
  ];

  // 🚨 關鍵：根據是否有對話紀錄，動態篩選步驟
  const steps = allSteps.filter(step => !step.requiresHistory || (step.requiresHistory && chatHistory.length > 0));

  const nextStep = () => {
    if (guideStep < steps.length - 1) setGuideStep(guideStep + 1);
    else setGuideStep(null);
  };
  const prevStep = () => { if (guideStep > 0) setGuideStep(guideStep - 1); };

  // 導覽步驟改變時，捲動到目標位置
  useEffect(() => {
    if (guideStep !== null) {
      const targetId = steps[guideStep].target;
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [guideStep]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const newQ = question;
    setQuestion('');
    setIsThinking(true);
    const tempHistory = [...chatHistory, { id: Date.now(), question: newQ, aiResponse: null }];
    setChatHistory(tempHistory);
    try {
      const data = await apiFetch('/consult', {
        method: 'POST',
        body: JSON.stringify({ question: newQ })
      });
      setChatHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1].aiResponse = data.reply || data.aiResponse || data.ai_response || data.answer || data.response || "分析完成。";
        return updated;
      });
      fetchProfile();
    } catch (err) {
      showNotification(err.message, 'error');
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-slate-50 sm:bg-white/80 sm:backdrop-blur-md sm:rounded-[32px] sm:shadow-2xl sm:border-2 border-slate-100 overflow-hidden flex flex-col h-[calc(100dvh-80px)] sm:h-[calc(100vh-140px)] relative w-[100vw] -mx-4 -mt-4 sm:w-auto sm:mx-0 sm:mt-0 z-30" onClick={() => setReportingIdx(null)}>

      {/* --- 改進後的導覽視窗 (避開底部遮擋) --- */}
      {guideStep !== null && (
        <div className="fixed inset-0 z-[400] bg-slate-900/80 backdrop-blur-sm transition-all duration-300">
          <div className={`absolute inset-x-0 ${steps[guideStep].position === 'top' ? 'top-10' : 'bottom-10'} flex justify-center p-6 sm:p-10 pointer-events-none`}>
            <div className="bg-white rounded-[40px] p-8 max-w-xl w-full shadow-2xl border-4 border-emerald-500 pointer-events-auto animate-in slide-in-from-top-10">
              <div className="flex justify-between items-center mb-4 text-emerald-700 font-black">
                <div className="flex items-center gap-2">
                  <span>導引說明 {guideStep + 1} / {steps.length}</span>
                  <span className="px-2 py-0.5 bg-amber-400 text-amber-950 text-[10px] rounded-lg border-2 border-amber-600 font-black">BETA</span>
                </div>
                <button onClick={() => setGuideStep(null)}><X size={24} /></button>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-3">{steps[guideStep].title}</h2>
              <p className="text-slate-600 font-bold text-lg sm:text-xl mb-8 leading-relaxed">{steps[guideStep].content}</p>
              <div className="flex gap-4">
                <button onClick={prevStep} disabled={guideStep === 0} className="flex-1 py-4 rounded-2xl font-black border-2 border-slate-200 text-slate-400">上一步</button>
                <button onClick={nextStep} className="flex-1 py-4 rounded-2xl font-black bg-emerald-600 text-white border-b-4 border-emerald-800">
                  {guideStep === steps.length - 1 ? "知道了！" : "看下一個"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 頂欄 --- */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-4 sm:p-6 text-white flex items-center justify-between shadow-md relative z-20 shrink-0">
        <div className="flex items-center">
          <div className="bg-white/20 p-2 sm:p-2.5 rounded-2xl backdrop-blur-md mr-3 sm:mr-4 border border-white/30">
            <BrainCircuit size={24} className="text-white animate-pulse sm:w-7 sm:h-7" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">專屬 AI 營養諮詢 <span className="px-2 py-0.5 bg-amber-400 text-amber-950 text-[10px] rounded-lg border-2 border-amber-600 font-black uppercase">Beta</span></h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
              </span>
              <p className="text-emerald-100 text-[10px] sm:text-xs font-bold uppercase tracking-widest">System Online</p>
            </div>
          </div>
        </div>

        {/* 操作導引按鈕 (固定右上) */}
        <button
          onClick={(e) => { e.stopPropagation(); setGuideStep(0); }}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border-2 border-white/30 px-3 py-1.5 rounded-xl font-black text-white transition-all active:scale-95 text-xs sm:text-sm"
        >
          <HelpCircle size={18} className="text-emerald-300" />
          <span>使用說明</span>
        </button>
      </div>

      {/* --- 對話區域 --- */}
      <div
        ref={chatContainerRef}
        className="flex-1 p-4 sm:p-8 overflow-y-auto overscroll-none bg-slate-50 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 flex flex-col"
      >
        {chatHistory.length === 0 && !isThinking ? (
          <div id="guide-suggestions" className={`flex flex-col items-center justify-center h-full text-slate-400 m-auto transition-all ${guideStep === 1 ? 'relative z-[310] scale-105' : ''}`}>
            <div className="bg-white p-6 sm:p-8 rounded-[40px] shadow-xl shadow-emerald-100/50 mb-6 border-2 border-emerald-50 transform hover:scale-110 transition-transform">
              <MessageSquare size={48} className="text-emerald-400 sm:w-14 sm:h-14" />
            </div>
            <p className="font-black text-slate-600 text-base sm:text-lg mb-8 text-center">有什麼飲食疑惑嗎？儘管問我</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              <button onClick={() => setQuestion('推薦重訓完的宵夜')} className="text-left text-xs sm:text-sm bg-white px-5 py-4 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-emerald-400 hover:bg-emerald-50 transition-all font-bold text-slate-600">💪 推薦重訓完的宵夜？</button>
              <button onClick={() => setQuestion('168 斷食可以喝豆漿嗎？')} className="text-left text-xs sm:text-sm bg-white px-5 py-4 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-emerald-400 hover:bg-emerald-50 transition-all font-bold text-slate-600">🕒 168 斷食可以喝豆漿嗎？</button>
            </div>
          </div>
        ) : (
          chatHistory.map((chat, idx) => {
            const aiText = chat.aiResponse || chat.ai_response || chat.response || chat.answer || chat.reply;
            const userText = chat.question || chat.query || chat.message;
            const isLatest = idx === chatHistory.length - 1;
            const isReporting = reportingIdx === idx;
            // 判斷是否為導覽中的高亮目標
            const isTargeted = isLatest && (steps[guideStep]?.target === "guide-chat" || steps[guideStep]?.target === "guide-report");

            return (
              <div key={chat.id || idx} className={`space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 transition-all ${isTargeted ? 'relative z-[310]' : ''}`}>
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-5 py-3 sm:px-6 sm:py-4 rounded-[24px] rounded-tr-none max-w-[85%] sm:max-w-[75%] shadow-md shadow-emerald-200/50 font-bold leading-relaxed text-sm sm:text-base border-b-4 border-teal-700 transition-all">
                    {userText}
                  </div>
                </div>

                {aiText && (
                  <div id={isLatest ? "guide-chat" : ""} className="flex justify-start items-start space-x-2 sm:space-x-3 group">
                    <div className="bg-emerald-600 p-2 sm:p-2.5 rounded-2xl text-white shadow-md mt-1 border-2 border-emerald-400 shrink-0 transition-all">
                      <Activity size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </div>

                    <div className="relative group bg-white border-2 border-slate-200 text-slate-800 px-5 py-4 sm:px-6 sm:py-5 rounded-[28px] rounded-tl-none max-w-[90%] sm:max-w-[85%] shadow-sm shadow-slate-200/50 leading-relaxed text-sm sm:text-base transition-all pb-10 sm:pb-12">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiText}
                      </ReactMarkdown>

                      {/* --- 回報按鈕 --- */}
                      <div id={isLatest ? "guide-report" : ""} className={`absolute bottom-3 right-4 transition-all ${isTargeted && steps[guideStep]?.target === "guide-report" ? 'scale-125' : ''}`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setReportingIdx(isReporting ? null : idx); }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 transition-all ${isReporting ? 'bg-rose-500 border-rose-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-300 hover:text-rose-500 hover:border-rose-300 hover:bg-white sm:opacity-0 group-hover:opacity-100'}`}
                        >
                          <Flag size={12} fill={isReporting ? "currentColor" : "none"} />
                          <span className="text-[10px] font-black uppercase tracking-wider">回報</span>
                        </button>

                        {isReporting && (
                          <div className="absolute right-0 bottom-full mb-3 w-44 bg-white border-4 border-slate-900 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                            <div className="p-2 bg-slate-900 text-white text-[10px] font-black text-center uppercase tracking-wider">請選擇錯誤類型</div>
                            <div className="flex flex-col">
                              {['AI 判讀有誤', '建議不切實際', '內容有誤導性', '回答不完整'].map((opt) => (
                                <button key={opt} onClick={() => { setReportingIdx(null); alert('回報成功！'); }} className="px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-rose-50 hover:text-rose-600 text-left border-b last:border-none border-slate-100">{opt}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* --- 輸入區域 --- */}
      <div id="guide-input" className={`p-3 sm:p-6 bg-white border-t-2 border-slate-100 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] relative shrink-0 pb-4 sm:pb-6 transition-all ${guideStep === 0 ? 'z-[410] ring-4 ring-emerald-500/20' : 'z-30'}`}>
        <form onSubmit={handleAsk} className="flex space-x-2 sm:space-x-3 max-w-5xl mx-auto">
          <div className="relative flex-1 group">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="輸入健康或飲食問題..."
              disabled={isThinking}
              className="w-full pl-5 pr-12 py-3 sm:px-6 sm:py-4 border-2 border-slate-200 rounded-full sm:rounded-[24px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none bg-slate-50 focus:bg-white transition-all text-base font-bold text-slate-800 placeholder:text-slate-400"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors hidden sm:block">
              <BrainCircuit size={20} />
            </div>
          </div>
          <button
            type="submit"
            disabled={isThinking || !question.trim()}
            className="bg-emerald-600 text-white px-5 sm:px-8 py-3 sm:py-4 rounded-full sm:rounded-[24px] hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 border-b-4 border-emerald-800 flex items-center justify-center shrink-0"
          >
            <Send size={20} className={`sm:w-6 sm:h-6 ${question.trim() && !isThinking ? 'animate-bounce' : ''}`} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Consult;
