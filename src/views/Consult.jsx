import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Activity, Send, BrainCircuit, Flag, Plus, X, Menu, BotMessageSquare, UserCircle, Sparkles, ImagePlus } from 'lucide-react';

// 🌟 匯入 Markdown 與 LaTeX 相關套件
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // 必須引入 KaTeX 的 CSS 才能漂亮渲染公式！

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};

const BgPattern = () => (
  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-[0.015] pointer-events-none">
    <defs>
      <pattern id="dotPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="currentColor" className="text-slate-900" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dotPattern)" />
  </svg>
);

const Consult = ({ user, apiFetch, showNotification }) => {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  const [aiStatus, setAiStatus] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [reportingIdx, setReportingIdx] = useState(null);

  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const hasInitialized = useRef(false);

  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const fetchRooms = async () => {
      try {
        const data = await apiFetch('/chat_rooms');
        if (data && data.rooms && data.rooms.length > 0) {
          setRooms(data.rooms);
          setActiveRoomId(data.rooms[0].id);
        } else {
          handleNewChat();
        }
      } catch (err) {
        console.error("無法載入聊天室列表", err);
        handleNewChat();
      }
    };
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;

    const fetchHistory = async () => {
      try {
        setChatHistory([]);
        const currentRoom = rooms.find(r => r.id === activeRoomId);
        if (currentRoom && currentRoom.title === "新對話") return;

        const data = await apiFetch(`/room_history/${activeRoomId}`);
        if (data && data.history) setChatHistory(data.history);
      } catch (err) {
        console.error("無法載入歷史紀錄", err);
      }
    };
    fetchHistory();
    setReportingIdx(null);
  }, [activeRoomId]);

  const scrollToBottom = (behavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: behavior
      });
    }
  };

  useEffect(() => {
    scrollToBottom('smooth');
    const timer = setTimeout(() => scrollToBottom('auto'), 100);
    return () => clearTimeout(timer);
  }, [chatHistory, isThinking, aiStatus]); // 將 aiStatus 加入依賴，狀態跳出時也會滾動

  const handleNewChat = () => {
    if (rooms.length > 0 && rooms[0].title === "新對話") {
      setActiveRoomId(rooms[0].id);
      setChatHistory([]);
      setIsSidebarOpen(false);
      setSelectedImage(null);
      return;
    }

    const newRoomId = generateUUID();
    setActiveRoomId(newRoomId);
    setChatHistory([]);
    setIsSidebarOpen(false);
    setRooms(prev => [{ id: newRoomId, title: "新對話" }, ...prev]);
    setSelectedImage(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification("圖片大小不可超過 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() && !selectedImage) return;

    const newQ = question;
    const currentImg = selectedImage;

    setQuestion('');
    setSelectedImage(null);
    setIsThinking(true);

    // 🌟 在按下送出的那一刻，立刻顯示思考中
    setAiStatus('AI 正在思考中...');

    const isFirstMessage = rooms.find(r => r.id === activeRoomId)?.title === "新對話";

    setChatHistory(prev => [...prev, {
      role: 'user',
      content: newQ || "(發送了一張圖片)",
      image: currentImg
    }]);

    try {
      if (isFirstMessage) {
        const targetRoomId = activeRoomId;
        apiFetch(`/room_title/${activeRoomId}`, {
          method: 'PUT',
          body: JSON.stringify({ message: newQ || "圖片分析" })
        }).then(res => {


          if (res && res.title) {

            const fullTitle = res.title;
            let currentLen = 0;
            const timer = setInterval(() => {
              currentLen++;

              setRooms(prev => prev.map(r =>

                r.id === targetRoomId ? { ...r, title: fullTitle.slice(0, currentLen) } : r
              ));


              if (currentLen >= fullTitle.length) {
                clearInterval(timer);
              }
            }, 120)
          }
        }).catch(err => console.error("背景更新標題失敗", err));
      }

      const response = await fetch(`/api/proxy_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: newQ,
          room_id: activeRoomId,
          image: currentImg,
          user_context: user ? {
            name: user.name || user.username,
            gender: user.gender,
            height: user.height,
            weight: user.weight,
            diet_goal: user.diet_goal || user.goal
          } : null
        })
      });

      if (!response.ok) throw new Error('API 連線失敗，請稍後再試');

      setChatHistory(prev => [...prev, { role: 'ai', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let aiFullResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr);

                if (data.type === 'text') {
                  // 🌟 防鬼打牆機制：如果進來的字串已經在我們的完整字串的結尾了，就不重複加入
                  // 這是為了防止 LangGraph 迴圈重播歷史導致的重複顯示
                  if (!aiFullResponse.endsWith(data.content)) {
                    aiFullResponse += data.content;

                    setChatHistory(prev => {
                      const newHistory = [...prev];
                      const lastMsg = newHistory[newHistory.length - 1];
                      if (lastMsg && lastMsg.role === 'ai') {
                        lastMsg.content = aiFullResponse;
                      }
                      return newHistory;
                    });
                  }
                }
                else if (data.type === 'clear') {
                  aiFullResponse = ""; // 清空內部變數
                  setChatHistory(prev => {
                    const newHistory = [...prev];
                    const lastMsg = newHistory[newHistory.length - 1];
                    if (lastMsg && lastMsg.role === 'ai') {
                      lastMsg.content = ""; // 清空畫面氣泡
                    }
                    return newHistory;
                  });
                }
                else if (data.type === 'status' || data.type === 'tool') {
                  setAiStatus(data.content);
                }
                else if (data.type === 'interrupt') {
                  showNotification("偵測到重要特徵，需要您審核確認。", "warning");
                }
              } catch (parseErr) {
                console.error("解析 JSON 失敗:", parseErr);
              }
            }
          }
        }
      }
    } catch (err) {
      showNotification(err.message, 'error');
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setIsThinking(false);
      setAiStatus(''); // 結束時清空狀態
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto bg-[#f8fafc] sm:rounded-[36px] sm:shadow-[0_20px_70px_-10px_rgba(0,0,0,0.1)] sm:border border-slate-100 overflow-hidden flex h-[calc(100dvh-80px)] sm:h-[calc(100vh-140px)] relative w-[100vw] -mx-4 -mt-4 sm:w-auto sm:mx-0 sm:mt-0 z-30 font-sans antialiased" onClick={() => setReportingIdx(null)}>
      <BgPattern />

      {/* --- 左側邊欄 (聊天室列表) --- */}
      <div className={`absolute sm:relative z-50 h-full w-[280px] bg-white/70 backdrop-blur-xl border-r border-slate-100 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'} flex flex-col`}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/40">
          <button onClick={handleNewChat} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-full flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-md shadow-emerald-200/60 hover:shadow-lg hover:shadow-emerald-300/70 border border-emerald-500">
            <Plus size={18} />
            <span className="text-sm tracking-tight">建立新諮詢</span>
          </button>
          <button onClick={() => setIsSidebarOpen(false)} className="ml-3 sm:hidden p-2.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => { setActiveRoomId(room.id); setIsSidebarOpen(false); }}
              className={`w-full text-left p-3.5 rounded-[16px] transition-all duration-300 font-bold text-sm truncate flex items-center gap-3 relative group overflow-hidden ${activeRoomId === room.id ? 'bg-emerald-50 text-emerald-800 shadow-inner' : 'bg-transparent text-slate-700 hover:bg-slate-100/70'}`}
            >
              <div className={`absolute left-0 top-0 h-full w-1 rounded-r-full bg-emerald-500 transition-transform duration-300 ${activeRoomId === room.id ? 'translate-x-0' : '-translate-x-full'}`}></div>
              <MessageSquare size={17} className={activeRoomId === room.id ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-500'} />
              <span className="flex-1 truncate tracking-tight">{room.title || "新對話"}</span>
            </button>
          ))}
        </div>
      </div>

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 sm:hidden transition-opacity duration-500"></div>
      )}

      {/* --- 右側主畫面 (對話區) --- */}
      <div className="flex-1 flex flex-col h-full w-full relative bg-slate-50/50">

        {/* 頂欄 */}
        <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 text-white flex items-center shadow-sm border-b border-slate-100 relative z-20 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="sm:hidden mr-4 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95">
            <Menu size={22} />
          </button>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-100 border border-emerald-400 mr-4 shrink-0">
            <BotMessageSquare size={24} className="sm:w-7 sm:h-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tighter text-slate-900">🥦 專屬 AI 營養諮詢</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Powered by Gemma4-e4b</span>
            </div>
          </div>
        </div>

        {/* 對話歷史區 */}
        <div ref={chatContainerRef} className="flex-1 p-5 sm:p-9 overflow-y-auto overscroll-none scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent flex flex-col gap-9">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full m-auto text-center px-4 animate-in fade-in duration-700">
              <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-slate-100/50 mb-8 border border-slate-50 transform hover:scale-105 transition-transform duration-300">
                <BrainCircuit size={60} className="text-emerald-500" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-2xl sm:text-3xl tracking-tighter mb-4">今天想聊聊什麼營養話題？</h3>
              <p className="text-slate-500 font-medium text-base sm:text-lg mb-10 max-w-lg leading-relaxed">您可以打字提問，或上傳餐點照片讓我幫您分析熱量！</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {['🔨 你有什麼功能', '🕒 168 斷食期間可以喝豆漿嗎？', '🥗 幫助改善皮膚狀況的超級食物', '🔥 減脂期的增肌食譜清單'].map(suggestion => (
                  <button key={suggestion} onClick={() => setQuestion(suggestion.replace(/^[^\s]+\s/, ''))} className="text-left text-sm sm:text-base bg-white/70 hover:bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-emerald-50 hover:shadow-lg transition-all duration-300 font-semibold text-slate-700 flex items-center gap-2 group active:scale-95">
                    <Sparkles size={16} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="tracking-tight">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500`}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end items-start gap-3">
                      <div className="flex flex-col items-end gap-1.5 max-w-[85%] sm:max-w-[75%]">
                        {msg.image && (
                          <img src={msg.image} alt="User Upload" className="max-w-[200px] sm:max-w-[300px] rounded-2xl shadow-md border-2 border-slate-100 object-cover" />
                        )}
                        {msg.content && msg.content !== "(發送了一張圖片)" && (
                          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-6 py-4 rounded-[26px] rounded-br-none shadow-lg shadow-emerald-100 border border-emerald-400/50 font-semibold leading-relaxed text-base tracking-tight shadow-inner">
                            {msg.content}
                          </div>
                        )}
                      </div>
                      <UserCircle size={36} className="text-slate-300 mt-1 shrink-0" />
                    </div>
                  ) : (
                    <div className="flex justify-start items-start gap-3 group relative">
                      <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-100 border-2 border-emerald-400 shrink-0 mt-1">
                        <BotMessageSquare size={18} />
                      </div>
                      <div className="flex flex-col gap-2 max-w-[90%] sm:max-w-[85%]">
                        <div className="bg-white border border-slate-100 text-slate-800 px-6 py-5 rounded-[28px] rounded-tl-none shadow-soft shadow-slate-100/50 leading-relaxed font-medium text-base relative shadow-lg">
                          {!msg.content || msg.content === "" ? (
                            <span className="flex gap-1.5 items-center h-6 text-emerald-500">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse transition-transform duration-300 scale-95"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse delay-150 transition-transform duration-300 scale-95"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse delay-300 transition-transform duration-300 scale-95"></span>
                            </span>
                          ) : (
                            // 🌟 升級版 Markdown 容器：GitHub 風格、更大字體、支援 LaTeX
                            <div className="prose prose-slate sm:prose-lg max-w-none prose-headings:border-b prose-headings:pb-2 prose-headings:font-extrabold prose-headings:tracking-tighter prose-headings:text-slate-900 prose-a:text-blue-600 prose-strong:font-bold prose-strong:text-slate-900 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:p-3 prose-td:border prose-td:border-slate-300 prose-td:p-3 prose-code:bg-slate-100 prose-code:text-rose-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-slate-800 prose-pre:text-slate-50 leading-relaxed tracking-tight text-slate-800">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                              >
                                {String(msg.content)}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {!isThinking && msg.content !== "" && (
                          <div className="relative self-start ml-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setReportingIdx(reportingIdx === idx ? null : idx); }}
                              className={`flex items-center gap-1.5 transition-all duration-300 active:scale-95 ${reportingIdx === idx ? 'text-rose-500' : 'text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100'}`}
                            >
                              <Flag size={12} />
                              <span className="text-[11px] font-bold uppercase tracking-widest">內容回報</span>
                            </button>

                            {reportingIdx === idx && (
                              <div className="absolute left-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200" onClick={(e) => e.stopPropagation()}>
                                <div className="p-2 bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-bold text-center uppercase tracking-wider">請選擇錯誤類型</div>
                                <div className="flex flex-col">
                                  {['AI 判讀有誤', '建議不切實際', '內容有誤導性', '回答不完整'].map((opt) => (
                                    <button key={opt} onClick={() => { setReportingIdx(null); showNotification('感謝回報，我們將優化模型！', 'success'); }} className="px-4 py-3 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 text-left border-b last:border-none border-slate-100 transition-colors">
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 🌟 獨立的狀態指示器：移出迴圈，直接墊在最下面，解決提早消失的問題！ */}
              {isThinking && aiStatus && (
                <div className="flex justify-start items-center gap-3 animate-in fade-in slide-in-from-bottom-2 pl-[52px] mb-2">
                  <div className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-2.5 shadow-sm border border-emerald-200">
                    <BrainCircuit size={16} className="animate-pulse" />
                    <span className="tracking-tight">{aiStatus}</span>
                    <span className="flex gap-0.5 ml-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce"></span>
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce delay-75"></span>
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce delay-150"></span>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {selectedImage && (
          <div className="absolute bottom-[90px] sm:bottom-[110px] left-4 sm:left-10 z-40 animate-in slide-in-from-bottom-4">
            <div className="relative p-2 bg-white rounded-2xl shadow-lg border border-slate-200">
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 shadow-md hover:bg-rose-500 transition-colors">
                <X size={14} />
              </button>
              <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-slate-100" />
            </div>
          </div>
        )}

        {/* 輸入區域 */}
        <div className="p-4 sm:p-6 bg-white/70 backdrop-blur-lg border-t border-slate-100 shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.03)] relative shrink-0 z-30 pb-5 sm:pb-7">
          <form onSubmit={handleAsk} className="flex space-x-3 max-w-5xl mx-auto items-end relative">

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isThinking || !activeRoomId}
              className="p-4 h-[58px] w-[58px] bg-slate-100 text-slate-500 rounded-[20px] hover:bg-emerald-50 hover:text-emerald-600 border border-transparent hover:border-emerald-200 active:scale-95 transition-all duration-300 flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <ImagePlus size={24} />
            </button>

            <div className="relative flex-1 group">
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="輸入健康或飲食問題，或上傳圖片..."
                disabled={isThinking || !activeRoomId}
                rows={Math.min(4, Math.max(1, question.split('\n').length))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk(e);
                  }
                }}
                className="w-full px-6 py-4 pr-12 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none bg-white transition-all font-semibold text-slate-800 placeholder:text-slate-400 shadow-inner resize-none scrollbar-thin scrollbar-thumb-slate-100 text-base"
              />
              <BrainCircuit size={20} className="absolute right-5 bottom-4 text-slate-300 transition-colors group-focus-within:text-emerald-500" />
            </div>

            <button
              type="submit"
              disabled={isThinking || (!question.trim() && !selectedImage) || !activeRoomId}
              className="bg-gradient-to-b from-emerald-500 to-emerald-600 text-white p-4 h-[58px] w-[58px] rounded-[20px] hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all duration-300 disabled:opacity-40 shadow-lg shadow-emerald-200/70 border border-emerald-500 flex items-center justify-center shrink-0 active:shadow-inner"
            >
              <Send size={24} className={(question.trim() || selectedImage) && !isThinking ? 'animate-bounce' : ''} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Consult;
