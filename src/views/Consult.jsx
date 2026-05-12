import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Activity, Send, BrainCircuit, Flag, Plus, X, Menu, BotMessageSquare, UserCircle, Sparkles, ImagePlus } from 'lucide-react';

// 支援 Markdown、表格與 LaTeX 顯示
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
  const QUESTION_MAX_LENGTH = 500;
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
  const [isRoomLoading, setIsRoomLoading] = useState(false);

  const activeRoomTitle = rooms.find((room) => room.id === activeRoomId)?.title || '新聊天室';
  const normalizeRooms = (data) => {
    const rawRooms = Array.isArray(data)
      ? data
      : Array.isArray(data?.rooms)
        ? data.rooms
        : Array.isArray(data?.chat_room_titles)
          ? data.chat_room_titles
          : Array.isArray(data?.room_titles)
            ? data.room_titles
            : [];

    return rawRooms
      .map((room) => ({
        id: room?.id ?? room?.room_id ?? room?.roomId ?? room?.uuid,
        title: room?.title ?? room?.room_title ?? room?.name ?? '新聊天室',
        summary: room?.summary ?? room?.last_summary ?? room?.description ?? null,
        isDraft: false,
      }))
      .filter((room) => Boolean(room.id));
  };

  const normalizeHistory = (data) => {
    const normalizeImageSrc = (value, mimeType = 'image/jpeg') => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;

      if (
        trimmed.startsWith('data:image/') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('/')
      ) {
        return trimmed;
      }

      const looksLikeBase64 = /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed) && trimmed.length > 128;
      if (looksLikeBase64) {
        const sanitized = trimmed.replace(/\r?\n/g, '');
        return `data:${mimeType};base64,${sanitized}`;
      }

      return null;
    };

    const extractImage = (msg) => {
      const mimeType = msg?.image_mime_type ?? msg?.imageMimeType ?? 'image/jpeg';
      const directCandidates = [
        msg?.image,
        msg?.image_url,
        msg?.imageUrl,
        msg?.image_base64,
        msg?.imageBase64,
        msg?.photo,
        msg?.photo_url,
      ];

      for (const candidate of directCandidates) {
        const normalized = normalizeImageSrc(candidate, mimeType);
        if (normalized) return normalized;
      }

      if (Array.isArray(msg?.images)) {
        for (const imageItem of msg.images) {
          if (typeof imageItem === 'string') {
            const normalized = normalizeImageSrc(imageItem, mimeType);
            if (normalized) return normalized;
            continue;
          }

          const nestedCandidates = [
            imageItem?.url,
            imageItem?.src,
            imageItem?.image,
            imageItem?.image_url,
            imageItem?.imageUrl,
            imageItem?.base64,
            imageItem?.data,
          ];

          for (const candidate of nestedCandidates) {
            const normalized = normalizeImageSrc(candidate, imageItem?.mime_type ?? imageItem?.mimeType ?? mimeType);
            if (normalized) return normalized;
          }
        }
      }

      if (Array.isArray(msg?.content)) {
        for (const part of msg.content) {
          if (!part || typeof part !== 'object') continue;

          const partImage = part?.image_url?.url ?? part?.image_url ?? part?.url ?? part?.src ?? part?.image;
          const normalized = normalizeImageSrc(partImage, part?.mime_type ?? part?.mimeType ?? mimeType);
          if (normalized) return normalized;
        }
      }

      return null;
    };

    const rawHistory = Array.isArray(data)
      ? data
      : Array.isArray(data?.history)
        ? data.history
        : [];

    return rawHistory
      .map((msg) => {
        const rawRole = String(msg?.role ?? msg?.sender ?? msg?.type ?? '').toLowerCase();
        const role = ['assistant', 'ai', 'bot'].includes(rawRole) ? 'ai' : 'user';
        const rawContent = msg?.content ?? msg?.message ?? msg?.text ?? msg?.answer ?? msg?.question ?? '';
        const content = Array.isArray(rawContent)
          ? rawContent
            .map((part) => {
              if (typeof part === 'string') return part;
              if (part && typeof part === 'object') return part?.text ?? part?.content ?? '';
              return '';
            })
            .filter(Boolean)
            .join('\n')
          : rawContent;

        return {
          role,
          content: typeof content === 'string' ? content : JSON.stringify(content),
          image: extractImage(msg),
        };
      })
      .filter((msg) => Boolean(msg.content) || Boolean(msg.image));
  };

  const fetchRoomsFromServer = async () => {
    const endpoints = ['/chat_room_titles', '/chat_rooms'];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const data = await apiFetch(endpoint);
        const roomList = normalizeRooms(data);
        if (roomList.length > 0 || endpoint === '/chat_rooms') {
          return roomList;
        }
      } catch (err) {
        if (err?.status !== 404) lastError = err;
      }
    }

    if (lastError) throw lastError;
    return [];
  };

  const fetchRoomHistory = async (roomId) => {
    if (!roomId) return [];
    const data = await apiFetch(`/room_history/${roomId}`);
    return normalizeHistory(data);
  };

  const refreshRoomsFromServer = async (focusRoomId = null) => {
    const serverRooms = await fetchRoomsFromServer();
    if (serverRooms.length === 0) return;

    setRooms((prev) => {
      const drafts = prev.filter((room) => room.isDraft && !serverRooms.some((srv) => srv.id === room.id));
      return [...serverRooms, ...drafts];
    });

    if (focusRoomId) {
      const hasFocus = serverRooms.some((room) => room.id === focusRoomId);
      if (hasFocus) setActiveRoomId(focusRoomId);
    } else if (!activeRoomId) {
      setActiveRoomId(serverRooms[0].id);
    }
  };

  const addDraftRoom = () => {
    const draftId = generateUUID();
    setRooms((prev) => [{ id: draftId, title: '新聊天室', summary: null, isDraft: true }, ...prev]);
    setActiveRoomId(draftId);
    return draftId;
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const fetchRooms = async () => {
      try {
        const roomList = await fetchRoomsFromServer();
        if (roomList.length > 0) {
          setRooms(roomList);
          setActiveRoomId(roomList[0].id);
        } else {
          addDraftRoom();
        }
      } catch (err) {
        console.error('讀取聊天室失敗:', err);
        addDraftRoom();
      }
    };

    fetchRooms();
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;

    const fetchHistory = async () => {
      setIsRoomLoading(true);
      try {
        setChatHistory([]);
        const currentRoom = rooms.find((room) => room.id === activeRoomId);
        if (currentRoom?.isDraft) return;

        const history = await fetchRoomHistory(activeRoomId);
        setChatHistory(history);
      } catch (err) {
        console.error('讀取聊天室歷史失敗:', err);
      } finally {
        setIsRoomLoading(false);
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
  }, [chatHistory, isThinking, aiStatus]);

  const handleNewChat = () => {
    const firstDraft = rooms.find((room) => room.isDraft);
    if (firstDraft) {
      setActiveRoomId(firstDraft.id);
      setChatHistory([]);
      setIsSidebarOpen(false);
      setSelectedImage(null);
      return;
    }

    const newRoomId = addDraftRoom();
    setChatHistory([]);
    setIsSidebarOpen(false);
    setSelectedImage(null);
    return newRoomId;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification('圖片大小不能超過 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleQuestionChange = (e) => {
    setQuestion(e.target.value.slice(0, QUESTION_MAX_LENGTH));
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() && !selectedImage) return;

    const newQ = question.trim();
    const currentImg = selectedImage;
    const authToken = localStorage.getItem('token');
    let targetRoomId = activeRoomId;

    setQuestion('');
    setSelectedImage(null);
    setIsThinking(true);
    setAiStatus('連線中...');

    if (!authToken) {
      showNotification('登入已失效，請重新登入。', 'error');
      setIsThinking(false);
      setAiStatus('');
      return;
    }

    if (!targetRoomId) {
      targetRoomId = addDraftRoom();
    }

    setChatHistory((prev) => [
      ...prev,
      {
        role: 'user',
        content: newQ || '(僅上傳圖片)',
        image: currentImg,
      },
    ]);

    try {
      const payload = {
        message: newQ,
        room_id: targetRoomId,
        image: currentImg,
        user_context: user
          ? {
            name: user.name || user.username,
            gender: user.gender,
            height: user.height,
            weight: user.weight,
            diet_goal: user.diet_goal || user.goal,
          }
          : null,
      };

      const requestCandidates = ['/api/proxy_chat', '/api/consult'];
      let response = null;
      let lastError = null;

      for (const endpoint of requestCandidates) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(payload),
          });

          if (res.status === 404) continue;
          if (res.status === 401) throw new Error('登入已過期，請重新登入。');
          if (!res.ok) {
            const rawText = await res.text();
            let message = `API 連線失敗（HTTP ${res.status}）`;
            if (rawText) {
              try {
                const parsed = JSON.parse(rawText);
                message = parsed?.error || message;
              } catch {
                message = rawText;
              }
            }
            throw new Error(message);
          }

          response = res;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!response) throw lastError || new Error('無法連線到聊天服務');

      const appendAiMessage = (nextContent) => {
        setChatHistory((prev) => {
          const nextHistory = [...prev];
          const lastMsg = nextHistory[nextHistory.length - 1];
          if (lastMsg?.role === 'ai') {
            lastMsg.content = nextContent;
          } else {
            nextHistory.push({ role: 'ai', content: nextContent });
          }
          return nextHistory;
        });
      };

      setAiStatus('AI思考中...');
      appendAiMessage('');

      const contentType = response.headers.get('content-type') || '';
      const isEventStream = contentType.includes('text/event-stream');

      if (!isEventStream) {
        const data = await response.json();
        const reply = data?.reply ?? data?.answer ?? data?.content ?? '';
        appendAiMessage(String(reply || ''));
      } else {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('串流讀取失敗');

        const decoder = new TextDecoder('utf-8');
        let aiFullResponse = '';
        let buffer = '';

        const applyChunk = (delta) => {
          if (!delta) return;
          aiFullResponse += delta;
          appendAiMessage(aiFullResponse);
        };

        const processEventBlock = (block) => {
          const dataLines = block
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim());

          if (dataLines.length === 0) return;
          const payloadText = dataLines.join('\n');
          if (!payloadText || payloadText === '[DONE]') return;

          try {
            const data = JSON.parse(payloadText);
            const eventType = String(data?.type ?? '').toLowerCase();
            const content = typeof data?.content === 'string' ? data.content : '';

            if (['answer', 'text', 'token'].includes(eventType)) {
              applyChunk(content);
            } else if (eventType === 'clear') {
              aiFullResponse = '';
              appendAiMessage('');
            } else if (['status', 'tool'].includes(eventType)) {
              setAiStatus(content || 'AI思考中...');
            } else if (eventType === 'interrupt') {
              showNotification('聊天已被中斷，請重新送出問題。', 'warning');
            } else if (!eventType && content) {
              applyChunk(content);
            }
          } catch {
            applyChunk(payloadText);
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const eventBlocks = buffer.split('\n\n');
          buffer = eventBlocks.pop() ?? '';
          eventBlocks.forEach(processEventBlock);
        }

        if (buffer.trim()) {
          processEventBlock(buffer.trim());
        }
      }

      await refreshRoomsFromServer(targetRoomId);
    } catch (err) {
      showNotification(err.message, 'error');
      setChatHistory((prev) => {
        if (prev.length === 0) return prev;
        const nextHistory = [...prev];
        const lastMsg = nextHistory[nextHistory.length - 1];
        if (lastMsg?.role === 'ai' && !lastMsg.content) {
          nextHistory.pop();
        }
        return nextHistory;
      });
    } finally {
      setIsThinking(false);
      setAiStatus('');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto bg-[#f8fafc] sm:rounded-[36px] sm:shadow-[0_20px_70px_-10px_rgba(0,0,0,0.1)] sm:border border-slate-100 overflow-hidden flex h-[calc(100dvh-80px)] sm:h-[calc(100vh-140px)] relative w-[100vw] -mx-4 -mt-4 sm:w-auto sm:mx-0 sm:mt-0 z-30 font-sans antialiased" onClick={() => setReportingIdx(null)}>
      <BgPattern />

      {/* --- 側邊欄（聊天室列表） --- */}
      <div className={`absolute sm:relative z-50 h-full w-[280px] bg-white/70 backdrop-blur-xl border-r border-slate-100 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'} flex flex-col`}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/40">
          <button onClick={handleNewChat} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-full flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-md shadow-emerald-200/60 hover:shadow-lg hover:shadow-emerald-300/70 border border-emerald-500">
            <Plus size={18} />
            <span className="text-sm tracking-tight">新增聊天室</span>
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
              <span className="flex-1 truncate tracking-tight">{room.title || '新聊天室'}</span>
            </button>
          ))}
        </div>
      </div>

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 sm:hidden transition-opacity duration-500"></div>
      )}

      {/* --- 主內容區（聊天視窗） --- */}
      <div className="flex-1 flex flex-col h-full w-full relative bg-slate-50/50">

        {/* 頂部標題列 */}
        <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 text-white flex items-center shadow-sm border-b border-slate-100 relative z-20 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="sm:hidden mr-4 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95">
            <Menu size={22} />
          </button>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-100 border border-emerald-400 mr-4 shrink-0">
            <BotMessageSquare size={24} className="sm:w-7 sm:h-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tighter text-slate-900 truncate max-w-[60vw] sm:max-w-[420px]">{activeRoomTitle}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Powered by Gemma4-e4b</span>
            </div>
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-1 p-5 sm:p-9 overflow-y-auto overscroll-none scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent flex flex-col gap-9">
          {isRoomLoading ? (
            <div className="flex flex-col items-center justify-center h-full m-auto text-center px-4 animate-in fade-in duration-300">
              <div className="bg-white px-8 py-6 rounded-3xl shadow-lg border border-slate-100 flex items-center gap-3">
                <Activity size={22} className="text-emerald-500 animate-spin" />
                <span className="font-bold text-slate-700 tracking-tight">正在載入聊天室...</span>
              </div>
              <p className="text-slate-400 text-sm mt-4 font-medium">請稍候，馬上為你顯示歷史紀錄</p>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full m-auto text-center px-4 animate-in fade-in duration-700">
              <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-slate-100/50 mb-8 border border-slate-50 transform hover:scale-105 transition-transform duration-300">
                <BrainCircuit size={60} className="text-emerald-500" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-2xl sm:text-3xl tracking-tighter mb-4">開始和 AI 聊聊你的飲食吧</h3>
              <p className="text-slate-500 font-medium text-base sm:text-lg mb-10 max-w-lg leading-relaxed">你可以輸入問題或上傳圖片，AI 會提供熱量與營養建議。</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {[
                  '你有什麼功能',
                  '我的 168 飲食這樣安排可以嗎',
                  '今天晚餐應該怎麼吃比較健康',
                  '請給我一份低脂高蛋白菜單',
                ].map((suggestion) => (
                  <button key={suggestion} onClick={() => setQuestion(suggestion)} className="text-left text-sm sm:text-base bg-white/70 hover:bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-emerald-50 hover:shadow-lg transition-all duration-300 font-semibold text-slate-700 flex items-center gap-2 group active:scale-95">
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
                        {msg.content && msg.content !== '(僅上傳圖片)' && (
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
                        {msg.image && (
                          <img src={msg.image} alt="AI Attachment" className="max-w-[220px] sm:max-w-[320px] rounded-2xl shadow-md border-2 border-slate-100 object-cover" />
                        )}
                        <div className="bg-white border border-slate-100 text-slate-800 px-6 py-5 rounded-[28px] rounded-tl-none shadow-soft shadow-slate-100/50 leading-relaxed font-medium text-base relative shadow-lg">
                          {!msg.content || msg.content === "" ? (
                            <span className="flex gap-1.5 items-center h-6 text-emerald-500">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse transition-transform duration-300 scale-95"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse delay-150 transition-transform duration-300 scale-95"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse delay-300 transition-transform duration-300 scale-95"></span>
                            </span>
                          ) : (
                            // 支援 Markdown（含表格）與 LaTeX 內容渲染
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
                              <span className="text-[11px] font-bold uppercase tracking-widest">回報問題</span>
                            </button>

                            {reportingIdx === idx && (
                              <div className="absolute left-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200" onClick={(e) => e.stopPropagation()}>
                                <div className="p-2 bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-bold text-center uppercase tracking-wider">選擇回報原因</div>
                                <div className="flex flex-col">
                                  {['內容不正確', '建議不實用', '語氣不佳', '其他問題'].map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        setReportingIdx(null);
                                        showNotification('已收到你的回報，謝謝！', 'success');
                                      }}
                                      className="px-4 py-3 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 text-left border-b last:border-none border-slate-100 transition-colors"
                                    >
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

              {/* 串流回覆時顯示狀態文字（例如連線中、AI思考中） */}
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

        {/* 輸入區 */}
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
              disabled={isThinking || isRoomLoading || !activeRoomId}
              className="p-4 h-[58px] w-[58px] bg-slate-100 text-slate-500 rounded-[20px] hover:bg-emerald-50 hover:text-emerald-600 border border-transparent hover:border-emerald-200 active:scale-95 transition-all duration-300 flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <ImagePlus size={24} />
            </button>

            <div className="relative flex-1 group">
              <textarea
                value={question}
                onChange={handleQuestionChange}
                maxLength={QUESTION_MAX_LENGTH}
                placeholder="輸入你的飲食問題，或請 AI 幫你分析..."
                disabled={isThinking || isRoomLoading || !activeRoomId}
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
              disabled={isThinking || isRoomLoading || (!question.trim() && !selectedImage) || !activeRoomId}
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
