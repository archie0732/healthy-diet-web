import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Activity, Send, Sparkles, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Consult = ({ user, apiFetch, showNotification, fetchProfile }) => {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const endOfChatRef = useRef(null);

  const historyData = user?.aiConsultations || user?.ai_consultations;

  useEffect(() => {
    if (historyData) {
      const sortedHistory = [...historyData].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        return timeA - timeB;
      });
      setChatHistory(sortedHistory);
    }
  }, [historyData]);

  useEffect(() => {
    endOfChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isThinking]);

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
        updated[updated.length - 1].aiResponse = data.reply || data.aiResponse || data.ai_response || data.answer || data.response || "分析完成，請參考建議內容。";
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
    // 🔽 關鍵修正：將 h-[calc(100vh-120px)] 改為 h-[calc(100dvh-85px)]，使用動態視口高度並縮小減去的空間，使其貼齊底部導覽列
    <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-md sm:rounded-[32px] shadow-2xl border-x sm:border-2 border-slate-100 overflow-hidden flex flex-col h-[calc(100dvh-85px)] sm:h-[calc(100vh-100px)] relative -mx-4 sm:mx-0">

      {/* --- 酷炫頂欄 --- */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-4 sm:p-6 text-white flex items-center justify-between shadow-lg relative z-20 shrink-0">
        <div className="flex items-center">
          <div className="bg-white/20 p-2 sm:p-2.5 rounded-2xl backdrop-blur-md mr-3 sm:mr-4 border border-white/30">
            <BrainCircuit size={24} className="text-white animate-pulse sm:w-7 sm:h-7" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight">專屬 AI 營養諮詢</h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
              </span>
              <p className="text-emerald-100 text-[10px] sm:text-xs font-bold uppercase tracking-widest">System Online</p>
            </div>
          </div>
        </div>
        <Sparkles className="text-emerald-300 opacity-50 w-6 h-6 sm:w-8 sm:h-8" />
      </div>

      {/* --- 對話區域 --- */}
      <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-50 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        {chatHistory.length === 0 && !isThinking ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="bg-white p-6 sm:p-8 rounded-[40px] shadow-xl shadow-emerald-100/50 mb-6 border-2 border-emerald-50 transform hover:scale-110 transition-transform">
              <MessageSquare size={48} className="text-emerald-400 sm:w-14 sm:h-14" />
            </div>
            <p className="font-black text-slate-600 text-base sm:text-lg mb-8">有什麼飲食疑惑嗎？儘管問我</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              <button onClick={() => setQuestion('推薦重訓完的宵夜')} className="text-left text-xs sm:text-sm bg-white px-5 py-4 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-emerald-400 hover:bg-emerald-50 transition-all font-bold text-slate-600">💪 推薦重訓完的宵夜？</button>
              <button onClick={() => setQuestion('168 斷食可以喝豆漿嗎？')} className="text-left text-xs sm:text-sm bg-white px-5 py-4 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-emerald-400 hover:bg-emerald-50 transition-all font-bold text-slate-600">🕒 168 斷食可以喝豆漿嗎？</button>
            </div>
          </div>
        ) : (
          chatHistory.map((chat, idx) => {
            const aiText = chat.aiResponse || chat.ai_response || chat.response || chat.answer || chat.reply;
            const userText = chat.question || chat.query || chat.message;

            return (
              <div key={chat.id || idx} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* 使用者氣泡 */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-5 py-3 sm:px-6 sm:py-4 rounded-[24px] rounded-tr-none max-w-[85%] sm:max-w-[75%] shadow-md shadow-emerald-200/50 font-bold leading-relaxed text-sm sm:text-base border-b-4 border-teal-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-300/60 hover:-translate-y-1 cursor-default">
                    {userText}
                  </div>
                </div>

                {/* AI 氣泡 */}
                {aiText && (
                  <div className="flex justify-start items-start space-x-2 sm:space-x-3 group cursor-default">
                    <div className="bg-emerald-600 p-2 sm:p-2.5 rounded-2xl text-white shadow-md mt-1 border-2 border-emerald-400 shrink-0 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110">
                      <Activity size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </div>
                    <div className="bg-white border-2 border-slate-200 text-slate-800 px-5 py-4 sm:px-6 sm:py-5 rounded-[28px] rounded-tl-none max-w-[90%] sm:max-w-[85%] shadow-sm shadow-slate-200/50 leading-relaxed text-sm sm:text-base transition-all duration-300 group-hover:border-emerald-300 group-hover:shadow-lg group-hover:shadow-emerald-100/50 group-hover:-translate-y-1">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ _, ...props }) => <p className="mb-4 last:mb-0 text-slate-800 font-medium leading-7" {...props} />,
                          ul: ({ _, ...props }) => <ul className="list-disc ml-5 sm:ml-6 mb-4 space-y-2 border-l-2 border-emerald-100 pl-3 sm:pl-4" {...props} />,
                          ol: ({ _, ...props }) => <ol className="list-decimal ml-5 sm:ml-6 mb-4 space-y-2" {...props} />,
                          li: ({ node, ...props }) => <li className="text-slate-800 font-medium" {...props} />,
                          h1: ({ node, ...props }) => (
                            <h1 className="text-xl sm:text-2xl font-black mb-6 mt-8 text-white bg-emerald-600 px-4 py-2 rounded-xl shadow-md inline-block" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-lg sm:text-xl font-black mb-4 mt-8 text-emerald-800 border-b-4 border-emerald-200 inline-block pb-1" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-base sm:text-lg font-extrabold mb-3 mt-6 text-teal-700 flex items-center before:content-[''] before:w-2 before:h-2 before:bg-teal-400 before:mr-2 before:rounded-full" {...props} />
                          ),
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-6 rounded-2xl border-2 border-slate-300 shadow-inner bg-slate-50 p-1">
                              <table className="min-w-full border-collapse" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => <thead className="bg-emerald-600 text-white" {...props} />,
                          th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-xs sm:text-sm font-black uppercase tracking-wider border-r border-emerald-500 last:border-0" {...props} />,
                          td: ({ node, ...props }) => <td className="px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 border-b border-slate-300 border-r border-slate-200 last:border-r-0" {...props} />,
                          tr: ({ node, ...props }) => <tr className="even:bg-white odd:bg-slate-100/50 hover:bg-emerald-50 transition-colors" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-black text-emerald-800 bg-emerald-100/50 px-1.5 py-0.5 rounded" {...props} />,
                          code: ({ node, inline, ...props }) =>
                            inline
                              ? <code className="bg-slate-100 text-emerald-700 px-1.5 py-0.5 rounded-md text-xs font-black border border-slate-200" {...props} />
                              : <pre className="bg-slate-900 text-emerald-300 p-4 sm:p-5 rounded-2xl overflow-x-auto my-5 text-xs font-mono border-l-8 border-emerald-500 shadow-lg"><code {...props} /></pre>,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 sm:border-l-8 border-emerald-300 pl-4 sm:pl-5 italic text-slate-600 my-6 bg-emerald-50/50 py-3 sm:py-4 rounded-r-2xl font-bold text-sm sm:text-base" {...props} />,
                        }}
                      >
                        {aiText}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* --- 思考中的動畫 --- */}
        {isThinking && (
          <div className="flex justify-start items-center space-x-2 sm:space-x-3 animate-pulse">
            <div className="bg-emerald-600 p-2 sm:p-2.5 rounded-2xl text-white border-2 border-emerald-400 shrink-0">
              <Activity size={16} className="animate-spin sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="bg-white border-2 border-slate-200 p-4 sm:p-5 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
              <span className="text-xs sm:text-sm font-black text-slate-500">AI 正在分析...</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={endOfChatRef} className="h-2" />
      </div>

      {/* --- 輸入區域 --- */}
      <div className="p-3 sm:p-6 bg-white/95 backdrop-blur-xl border-t-2 border-slate-100 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] relative z-30 shrink-0">
        <form onSubmit={handleAsk} className="flex space-x-2 sm:space-x-3 max-w-5xl mx-auto">
          <div className="relative flex-1 group">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="輸入健康或飲食問題..."
              disabled={isThinking}
              className="w-full pl-5 pr-12 py-3 sm:px-6 sm:py-4 border-2 border-slate-200 rounded-full sm:rounded-[24px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none bg-slate-50 focus:bg-white transition-all text-sm sm:text-base font-bold text-slate-800 placeholder:text-slate-400"
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
