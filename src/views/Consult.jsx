import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Activity, Send, BrainCircuit, Flag, Plus, X, Menu, BotMessageSquare, UserCircle, Sparkles, ImagePlus } from 'lucide-react';

// ?舀 Markdown?”?潸? LaTeX 憿舐內
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { buildApiUrl } from '@/lib/api';

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

const Consult = ({ user, apiFetch, fetchProfile, showNotification }) => {
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
  const latestThreadIdRef = useRef(null);
  const roomThreadIdMapRef = useRef({});
  const latestApprovalIdRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRoomsLoading, setIsRoomsLoading] = useState(true);
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

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
        const image = extractImage(msg);
        const normalizedContent = typeof content === 'string' ? content : JSON.stringify(content) ?? '';
        const hasTextContent = normalizedContent.trim().length > 0;

        if (role === 'ai' && !hasTextContent && !image) {
          return {
            role: 'ai',
            content: '[系統訊息] 對話錯誤：此筆 AI 回覆為空，可能生成失敗。',
            image: null,
          };
        }

        return {
          role,
          content: normalizedContent,
          image,
        };
      })
      .filter((msg) => Boolean(msg.content) || Boolean(msg.image));
  };

  const fetchRoomsFromServer = async () => {
    const endpoints = ['/api/chat_room_titles', '/api/chat_rooms'];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const data = await apiFetch(endpoint);
        const roomList = normalizeRooms(data);
        if (roomList.length > 0 || endpoint === '/api/chat_rooms') {
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
    const data = await apiFetch(`/api/room_history/${roomId}`);
    return normalizeHistory(data);
  };

  const refreshRoomsFromServer = async (focusRoomId = null, showLoading = false) => {
    if (showLoading) setIsRoomsLoading(true);

    try {
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
    } finally {
      if (showLoading) setIsRoomsLoading(false);
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
      setIsRoomsLoading(true);
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
      } finally {
        setIsRoomsLoading(false);
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
    setPendingApproval(null);
    latestThreadIdRef.current = activeRoomId ? (roomThreadIdMapRef.current[activeRoomId] ?? null) : null;
    latestApprovalIdRef.current = null;
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
      setPendingApproval(null);
      latestThreadIdRef.current = null;
      latestApprovalIdRef.current = null;
      return;
    }

    const newRoomId = addDraftRoom();
    setChatHistory([]);
    setIsSidebarOpen(false);
    setSelectedImage(null);
    setPendingApproval(null);
    latestApprovalIdRef.current = null;
    return newRoomId;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification('圖片大小不可超過 5MB', 'error');
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

  const normalizeThreadId = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed === '[DONE]') return null;
    if (/\s/.test(trimmed)) return null;
    if (/^\d+$/.test(trimmed)) return null;
    if (trimmed.length < 8) return null;
    return trimmed;
  };

  const extractThreadIdFromData = (data) => {
    if (!data || typeof data !== 'object') return null;
    const candidates = [
      data?.thread_id,
      data?.threadId,
      data?.payload?.thread_id,
      data?.payload?.threadId,
      data?.result?.thread_id,
      data?.result?.threadId,
      data?.meta?.thread_id,
      data?.meta?.threadId,
      data?.context?.thread_id,
      data?.context?.threadId,
    ];

    for (const candidate of candidates) {
      const threadId = normalizeThreadId(candidate);
      if (threadId) return threadId;
    }
    return null;
  };

  const extractThreadIdFromHeaders = (headers) => {
    if (!headers || typeof headers.get !== 'function') return null;
    const headerCandidates = [
      'x-thread-id',
      'thread-id',
      'thread_id',
      'x-threadid',
      'x-conversation-id',
      'x-session-id',
    ];

    for (const headerName of headerCandidates) {
      const threadId = normalizeThreadId(headers.get(headerName));
      if (threadId) return threadId;
    }
    return null;
  };

  const rememberThreadId = (threadId, roomId = activeRoomId) => {
    const normalizedThreadId = normalizeThreadId(threadId);
    if (!normalizedThreadId) return null;

    latestThreadIdRef.current = normalizedThreadId;
    if (roomId) {
      roomThreadIdMapRef.current[roomId] = normalizedThreadId;
    }
    return normalizedThreadId;
  };

  const resolveThreadId = (roomId = activeRoomId) => {
    const byRoom = roomId ? normalizeThreadId(roomThreadIdMapRef.current[roomId]) : null;
    return byRoom ?? normalizeThreadId(latestThreadIdRef.current) ?? null;
  };

  const normalizeApprovalId = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed === '[DONE]') return null;
    return trimmed;
  };

  const extractApprovalIdFromData = (data) => {
    if (!data || typeof data !== 'object') return null;
    const candidates = [
      data?.approval_id,
      data?.approvalId,
      data?.payload?.approval_id,
      data?.payload?.approvalId,
      data?.result?.approval_id,
      data?.result?.approvalId,
    ];
    for (const candidate of candidates) {
      const approvalId = normalizeApprovalId(candidate);
      if (approvalId) return approvalId;
    }
    return null;
  };

  const approvalFieldLabelMap = {
    nickname_to_set: '暱稱',
    avatar_url_to_set: '頭像',
    height_to_set: '身高',
    weight_to_set: '體重',
    age_to_set: '年齡',
    gender_to_set: '性別',
    taboo_to_add: '忌口',
    disease_to_add: '疾病史',
  };

  const toApprovalActionLabel = (action) => (action === 'add' ? '新增' : '設定');

  const formatApprovalValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const normalizeApproval = (eventData) => {
    const data = eventData && typeof eventData === 'object' ? eventData : {};
    const approvalId = extractApprovalIdFromData(data) ?? latestApprovalIdRef.current ?? null;
    if (approvalId) {
      latestApprovalIdRef.current = approvalId;
    }

    const proposalItemsRaw =
      data?.proposal_items
      ?? data?.approval_proposal_items
      ?? data?.payload?.proposal_items
      ?? data?.payload?.approval_proposal_items
      ?? data?.result?.proposal_items
      ?? data?.result?.approval_proposal_items
      ?? null;

    const proposalRaw =
      data?.proposal
      ?? data?.approval_proposal
      ?? data?.payload?.proposal
      ?? data?.payload?.approval_proposal
      ?? data?.result?.proposal
      ?? data?.result?.approval_proposal
      ?? data?.update_fields
      ?? data?.profile_update
      ?? data?.payload?.update_fields
      ?? data?.payload?.profile_update
      ?? null;

    let proposalItems = [];
    if (Array.isArray(proposalItemsRaw) && proposalItemsRaw.length > 0) {
      proposalItems = proposalItemsRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const field = typeof item.field === 'string' ? item.field : '';
          if (!field) return null;

          const action = item.action === 'add' ? 'add' : 'set';
          const value = Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : '';
          const defaultLabel = approvalFieldLabelMap[field] || field;
          const label = typeof item.label === 'string' && item.label.trim() ? item.label.trim() : defaultLabel;

          return {
            field,
            label,
            action,
            actionLabel: toApprovalActionLabel(action),
            value: formatApprovalValue(value),
          };
        })
        .filter(Boolean);
    } else if (proposalRaw && typeof proposalRaw === 'object' && !Array.isArray(proposalRaw)) {
      proposalItems = Object.entries(proposalRaw).map(([field, value]) => {
        const action = field.endsWith('_to_add') ? 'add' : 'set';
        return {
          field,
          label: approvalFieldLabelMap[field] || field,
          action,
          actionLabel: toApprovalActionLabel(action),
          value: formatApprovalValue(value),
        };
      });
    }

    const prompt =
      data?.approval_content
      ?? data?.payload?.approval_content
      ?? data?.result?.approval_content
      ?? data?.content
      ?? data?.message
      ?? data?.prompt
      ?? 'AI 建議更新你的個人資料，請先確認是否同意。';

    return { approvalId, prompt, proposalItems };
  };

  const appendStandaloneAiMessage = (content) => {
    const normalizedContent = typeof content === 'string' ? content : String(content ?? '');
    if (!normalizedContent.trim()) return;
    setChatHistory((prev) => [
      ...prev,
      {
        role: 'ai',
        content: normalizedContent,
      },
    ]);
  };

  const appendErrorMessageToChat = (rawMessage) => {
    const normalizedError =
      typeof rawMessage === 'string'
        ? rawMessage.trim()
        : String(rawMessage ?? '').trim();
    const errorContent = normalizedError
      ? `[系統訊息] 對話錯誤：${normalizedError}`
      : '[系統訊息] 對話發生錯誤，請稍後再試。';

    setChatHistory((prev) => {
      const nextHistory = [...prev];
      const lastMsg = nextHistory[nextHistory.length - 1];
      if (lastMsg?.role === 'ai' && !lastMsg.content) {
        nextHistory.pop();
      }

      const tailMsg = nextHistory[nextHistory.length - 1];
      if (tailMsg?.role === 'ai' && tailMsg.content === errorContent) {
        return nextHistory;
      }

      nextHistory.push({
        role: 'ai',
        content: errorContent,
      });
      return nextHistory;
    });
  };

  const handleApproveAction = async (action) => {
    if (!pendingApproval || isSubmittingApproval) return;
    setIsSubmittingApproval(true);

    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) throw new Error('登入已失效，請重新登入。');

      const approvalId = normalizeApprovalId(pendingApproval.approvalId) ?? latestApprovalIdRef.current ?? null;
      if (!approvalId) throw new Error('缺少 approval_id，無法送出同意或拒絕。');

      const response = await fetch(buildApiUrl('/api/approve'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ approval_id: approvalId, action }),
      });

      if (response.status === 401) throw new Error('登入已過期，請重新登入。');
      const rawText = await response.text();
      let responseData = {};
      if (rawText) {
        try {
          responseData = JSON.parse(rawText);
        } catch {
          responseData = { message: rawText };
        }
      }
      if (!response.ok) {
        const message = responseData?.error || responseData?.message || rawText || `API 連線失敗（HTTP ${response.status}）`;
        throw new Error(message);
      }

      const responseStatus = String(responseData?.status || '').toLowerCase();
      if (responseStatus === 'not_found') {
        setPendingApproval(null);
        latestApprovalIdRef.current = null;
        showNotification(responseData?.message || '找不到待處理的個人資料更新。', 'warning');
        return;
      }

      const assistantReply = responseData?.assistant_reply;
      if (typeof assistantReply === 'string' && assistantReply.trim()) {
        appendStandaloneAiMessage(assistantReply);
      }

      if (action === 'approve' && typeof fetchProfile === 'function') {
        await fetchProfile();
      }

      setPendingApproval(null);
      latestApprovalIdRef.current = null;
      await refreshRoomsFromServer(activeRoomId);
      showNotification(
        action === 'approve'
          ? (responseData?.summary || '已同意更新資料')
          : (responseData?.message || '已拒絕更新資料'),
        action === 'approve' ? 'success' : 'warning',
      );
    } catch (err) {
      showNotification(err.message || '送出失敗', 'error');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const buildErrorMessageFromResponse = async (response, prefix = 'API 連線失敗') => {
    let detail = '';
    try {
      const rawText = await response.text();
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          detail = parsed?.error || parsed?.message || rawText;
        } catch {
          detail = rawText;
        }
      }
    } catch {
      detail = '';
    }

    return detail
      ? `${prefix}（HTTP ${response.status}）：${detail}`
      : `${prefix}（HTTP ${response.status}）`;
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
    setPendingApproval(null);
    latestThreadIdRef.current = null;
    latestApprovalIdRef.current = null;
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

    const knownThreadId = resolveThreadId(targetRoomId);
    latestThreadIdRef.current = knownThreadId;

    setChatHistory((prev) => [
      ...prev,
      {
        role: 'user',
        content: newQ || '(圖片)',
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
      if (knownThreadId) {
        payload.thread_id = knownThreadId;
      }

      const requestCandidates = [buildApiUrl('/api/chat')];
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
            const message = await buildErrorMessageFromResponse(res);
            throw new Error(message);
          }

          response = res;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!response) throw lastError || new Error('無法連線到聊天服務');

      const responseHeaderThreadId = extractThreadIdFromHeaders(response.headers);
      if (responseHeaderThreadId) {
        rememberThreadId(responseHeaderThreadId, targetRoomId);
      }

      const appendAiMessage = (nextContent) => {
        setChatHistory((prev) => {
          const nextHistory = [...prev];
          const lastMsg = nextHistory[nextHistory.length - 1];
          const normalizedContent = typeof nextContent === 'string' ? nextContent : String(nextContent ?? '');
          if (lastMsg?.role !== 'ai' && !normalizedContent) {
            return nextHistory;
          }
          if (lastMsg?.role === 'ai') {
            lastMsg.content = normalizedContent;
          } else {
            nextHistory.push({ role: 'ai', content: normalizedContent });
          }
          return nextHistory;
        });
      };

      const normalizeAgentStatus = (rawStatus) => {
        const text = String(rawStatus || '').trim();
        if (!text) return 'AI 思考中...';
        if (text.toLowerCase().startsWith('user message:')) {
          return '已收到你的問題，AI 正在分析...';
        }
        return text;
      };

      setAiStatus('AI 思考中...');

      const contentType = response.headers.get('content-type') || '';
      const isEventStream = contentType.includes('text/event-stream');

      if (!isEventStream) {
        const data = await response.json();
        const responseThreadId = extractThreadIdFromData(data);
        if (responseThreadId) {
          rememberThreadId(responseThreadId, targetRoomId);
        }

        const reply = data?.reply ?? data?.answer ?? data?.assistant_reply ?? data?.content ?? '';

        const approvalPending =
          data?.approval_pending
          ?? data?.approvalPending
          ?? data?.result?.approval_pending
          ?? data?.result?.approvalPending
          ?? false;

        if (approvalPending) {
          setPendingApproval(normalizeApproval(data));
          setAiStatus('等待你確認個人資料更新');
        } else {
          appendAiMessage(String(reply || ''));
        }
      } else {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('串流讀取失敗');

        const decoder = new TextDecoder('utf-8');
        let aiFullResponse = '';
        let buffer = '';

        const applyChunk = (delta) => {
          if (!delta) return;
          const trimmedDelta = String(delta).trim();
          if (!trimmedDelta) return;
          // Filter backend metadata/debug lines that should not appear in chat bubbles.
          if (trimmedDelta.toLowerCase().startsWith('user message:')) return;
          aiFullResponse += delta;
          appendAiMessage(aiFullResponse);
        };

        const processEventBlock = (block) => {
          const lines = block
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

          let sseId = null;
          const dataLines = [];
          for (const line of lines) {
            if (line.startsWith('id:')) {
              sseId = line.slice(3).trim();
              continue;
            }
            if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trim());
            }
          }

          if (dataLines.length === 0) return;
          const payloadText = dataLines.join('\n');
          if (!payloadText || payloadText === '[DONE]') return;

          try {
            const data = JSON.parse(payloadText);
            const eventType = String(data?.type ?? '').toLowerCase();
            const content = typeof data?.content === 'string' ? data.content : '';
            const eventThreadId = extractThreadIdFromData(data) ?? normalizeThreadId(sseId);
            if (eventThreadId) {
              rememberThreadId(eventThreadId, targetRoomId);
            }

            if (['answer', 'text', 'token'].includes(eventType)) {
              applyChunk(content);
            } else if (eventType === 'clear') {
              aiFullResponse = '';
              appendAiMessage('');
            } else if (['status', 'tool'].includes(eventType)) {
              setAiStatus(normalizeAgentStatus(content));
            } else if (eventType === 'interrupt') {
              const approval = normalizeApproval(data);
              setPendingApproval(approval);
              setAiStatus('等待你確認個人資料更新');
            } else if (eventType === 'done') {
              const approvalPending =
                data?.approval_pending
                ?? data?.approvalPending
                ?? data?.result?.approval_pending
                ?? data?.result?.approvalPending
                ?? false;
              if (approvalPending) {
                setPendingApproval(normalizeApproval(data));
                setAiStatus('等待你確認個人資料更新');
              }
            } else if (eventType === 'error') {
              const message = content || data?.message || data?.error || 'AI 回覆失敗，請稍後再試';
              showNotification(String(message), 'error');
              appendErrorMessageToChat(String(message));
            } else if (!eventType && content) {
              applyChunk(content);
            }
          } catch {
            // Backend now sends structured JSON events only.
            // Ignore malformed chunks instead of showing broken raw payload text.
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const eventBlocks = buffer.split(/\r?\n\r?\n/);
          buffer = eventBlocks.pop() ?? '';
          eventBlocks.forEach(processEventBlock);
        }

        if (buffer.trim()) {
          processEventBlock(buffer.trim());
        }
      }

      await refreshRoomsFromServer(targetRoomId);
    } catch (err) {
      const errorMessage = err?.message || '對話發生錯誤，請稍後再試。';
      showNotification(errorMessage, 'error');
      appendErrorMessageToChat(errorMessage);
    } finally {
      setIsThinking(false);
      setAiStatus('');
    }
  };

  const approvalActionId = normalizeApprovalId(pendingApproval?.approvalId) ?? latestApprovalIdRef.current ?? null;
  const emptyStateSuggestions = [
    '??????????????',
    '168 ?????????????',
    '?????????????????',
    '???????????????',
  ];

  return (
    <div className="max-w-[1680px] mx-auto overflow-hidden flex h-[calc(100dvh-80px)] sm:h-[calc(100vh-140px)] relative w-[100vw] -mx-4 -mt-4 sm:w-auto sm:mx-0 sm:mt-0 z-30 font-sans antialiased rounded-none sm:rounded-[40px] border border-cyan-400/10 bg-[#06131d] shadow-[0_35px_120px_-30px_rgba(6,19,29,0.95)]" onClick={() => setReportingIdx(null)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_28%),radial-gradient(circle_at_80%_12%,_rgba(59,130,246,0.18),_transparent_22%),linear-gradient(145deg,_#07131e_0%,_#091826_52%,_#05111b_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.08)_1px,transparent_1px)] bg-[size:34px_34px] opacity-[0.08]" />
      <BgPattern />

      <div className={`absolute sm:relative z-50 h-full w-[300px] bg-slate-950/70 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'} flex flex-col`}>
        <div className="p-5 border-b border-white/10 bg-white/5">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300/70">AI Consult</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Nutrition Command</h2>
            <p className="mt-1 text-sm text-slate-400">???????????</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNewChat}
              disabled={isRoomsLoading}
              className="flex-1 rounded-2xl border border-cyan-300/40 bg-[linear-gradient(135deg,_rgba(34,211,238,0.92),_rgba(37,99,235,0.9))] px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_12px_30px_-10px_rgba(34,211,238,0.7)] transition-all duration-300 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Plus size={18} />
                ????
              </span>
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="ml-3 rounded-2xl bg-white/8 p-2.5 text-slate-300 transition-colors hover:bg-white/14 hover:text-white sm:hidden">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-5 pt-4 pb-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Rooms</p>
              <p className="mt-2 text-2xl font-semibold text-white">{rooms.length}</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-200/80">Status</p>
              <p className="mt-2 text-sm font-semibold text-cyan-100">{isThinking ? 'Responding' : 'Online'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyan-400/20">
          {isRoomsLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`room-skeleton-${idx}`} className="w-full rounded-[18px] border border-white/10 bg-white/5 p-3.5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-md bg-slate-700"></div>
                  <div className="h-3.5 w-full rounded-full bg-slate-700"></div>
                </div>
              </div>
            ))
          ) : rooms.length === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-400">????????</div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => { setActiveRoomId(room.id); setIsSidebarOpen(false); }}
                className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] border p-4 text-left text-sm font-semibold transition-all duration-300 ${activeRoomId === room.id ? 'border-cyan-300/25 bg-[linear-gradient(135deg,rgba(8,145,178,0.28),rgba(37,99,235,0.18))] text-white shadow-[0_18px_35px_-22px_rgba(56,189,248,0.95)]' : 'border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/12 hover:bg-white/[0.06]'}`}
              >
                <div className={`absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-cyan-300/12 to-transparent transition-opacity duration-300 ${activeRoomId === room.id ? 'opacity-100' : 'opacity-0'}`}></div>
                <MessageSquare size={17} className={activeRoomId === room.id ? 'text-cyan-200' : 'text-slate-500'} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate tracking-tight">{room.title || '?????'}</span>
                  <span className="mt-1 block text-[11px] uppercase tracking-[0.2em] text-slate-500">{room.isDraft ? 'Draft' : 'Thread'}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-500 sm:hidden"></div>}

      <div className="relative flex h-full w-full flex-1 flex-col bg-transparent">
        <div className="relative z-20 shrink-0 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
            <div className="flex min-w-0 items-center">
              <button onClick={() => setIsSidebarOpen(true)} className="mr-4 rounded-2xl bg-white/6 p-2.5 text-slate-200 transition-all hover:bg-white/12 sm:hidden">
                <Menu size={22} />
              </button>

              <div className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-cyan-300/30 bg-[linear-gradient(145deg,rgba(34,211,238,0.24),rgba(37,99,235,0.32))] text-cyan-100 shadow-[0_10px_40px_-15px_rgba(34,211,238,0.95)]">
                <BotMessageSquare size={23} className="sm:h-6 sm:w-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-70"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300"></span>
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200/80">Live Channel</span>
                </div>
                <h2 className="mt-2 max-w-[56vw] truncate text-xl font-semibold tracking-tight text-white sm:max-w-[420px] sm:text-2xl">{activeRoomTitle}</h2>
                <p className="mt-1 text-sm text-slate-400">Powered by Gemma4-e4b</p>
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Mode</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">Glass Ops</p>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-right">
                <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">State</p>
                <p className="mt-1 text-sm font-semibold text-cyan-100">{isThinking ? 'Thinking' : 'Standby'}</p>
              </div>
            </div>
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto overscroll-none px-4 py-5 sm:px-8 sm:py-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyan-400/15">
          {isRoomLoading ? (
            <div className="m-auto flex h-full flex-col items-center justify-center px-4 text-center animate-in fade-in duration-300">
              <div className="flex items-center gap-3 rounded-[28px] border border-cyan-300/18 bg-white/7 px-8 py-6 shadow-[0_25px_80px_-35px_rgba(34,211,238,0.85)] backdrop-blur-xl">
                <Activity size={22} className="animate-spin text-cyan-300" />
                <span className="font-bold tracking-tight text-slate-100">?????????...</span>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-400">?????????????????</p>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center animate-in fade-in duration-700">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[34px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_40px_120px_-45px_rgba(34,211,238,0.75)] backdrop-blur-2xl sm:p-10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200/75">Neural Nutrition Console</p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-cyan-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.45),rgba(14,116,144,0.12)_60%,transparent_100%)] text-cyan-100">
                      <BrainCircuit size={42} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">???? AI ?????</h3>
                      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">?????????????????????????????????????????</p>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {emptyStateSuggestions.map((suggestion) => (
                      <button key={suggestion} onClick={() => setQuestion(suggestion)} className="group rounded-[24px] border border-white/10 bg-slate-950/35 px-5 py-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-400/10">
                        <div className="flex items-start gap-3">
                          <Sparkles size={16} className="mt-1 text-cyan-300 transition-transform duration-300 group-hover:rotate-12" />
                          <span className="text-sm font-medium tracking-tight text-slate-100 sm:text-base">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[34px] border border-cyan-300/10 bg-slate-950/45 p-6 backdrop-blur-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200/75">System Snapshot</p>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <p className="text-sm text-slate-400">??????</p>
                      <p className="mt-2 text-lg font-semibold text-white">????????????????</p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <p className="text-sm text-slate-400">????</p>
                      <p className="mt-2 text-lg font-semibold text-white">??????????Markdown ??????</p>
                    </div>
                    <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-400/8 p-5">
                      <p className="text-sm text-cyan-100/75">????</p>
                      <p className="mt-2 text-lg font-semibold text-cyan-50">?????????</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
                  {msg.role === 'user' ? (
                    <div className="flex items-start justify-end gap-3">
                      <div className="flex max-w-[88%] flex-col items-end gap-2 sm:max-w-[72%]">
                        {msg.image && <img src={msg.image} alt="User Upload" className="max-w-[200px] rounded-[24px] border border-cyan-300/20 object-cover shadow-[0_18px_60px_-26px_rgba(56,189,248,0.9)] sm:max-w-[300px]" />}
                        {msg.content && msg.content !== '(???)' && (
                          <div className="rounded-[28px] rounded-br-[8px] border border-cyan-200/50 bg-[linear-gradient(135deg,rgba(34,211,238,0.95),rgba(37,99,235,0.95))] px-6 py-4 text-base font-semibold leading-relaxed tracking-tight text-slate-950 shadow-[0_26px_70px_-30px_rgba(34,211,238,0.95)]">
                            {msg.content}
                          </div>
                        )}
                      </div>
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-white/8 text-cyan-100">
                        <UserCircle size={22} />
                      </div>
                    </div>
                  ) : (
                    <div className="group relative flex items-start justify-start gap-3">
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-[linear-gradient(145deg,rgba(34,211,238,0.18),rgba(37,99,235,0.24))] text-cyan-100 shadow-[0_14px_36px_-18px_rgba(34,211,238,0.95)]">
                        <BotMessageSquare size={18} />
                      </div>
                      <div className="flex max-w-[92%] flex-col gap-2 sm:max-w-[84%]">
                        {msg.image && <img src={msg.image} alt="AI Attachment" className="max-w-[220px] rounded-[24px] border border-cyan-300/20 object-cover shadow-[0_18px_60px_-26px_rgba(56,189,248,0.9)] sm:max-w-[320px]" />}
                        <div className="relative rounded-[30px] rounded-tl-[10px] border border-white/10 bg-white/[0.06] px-6 py-5 text-base font-medium leading-relaxed text-slate-100 shadow-[0_35px_80px_-50px_rgba(34,211,238,0.9)] backdrop-blur-xl">
                          {!msg.content || msg.content === '' ? (
                            <span className="flex items-center gap-2 font-semibold text-cyan-200">
                              <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-300 animate-pulse"></span>
                              <span>{aiStatus || 'AI ??????...'}</span>
                            </span>
                          ) : (
                            <div className="prose prose-invert max-w-none leading-relaxed tracking-tight prose-headings:border-b prose-headings:border-white/10 prose-headings:pb-2 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white prose-p:text-slate-200 prose-li:text-slate-200 prose-a:text-cyan-300 prose-strong:text-white prose-code:rounded-md prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-cyan-200 prose-pre:bg-slate-950/80 prose-pre:text-slate-50 prose-th:border prose-th:border-white/10 prose-th:bg-white/5 prose-th:p-3 prose-td:border prose-td:border-white/10 prose-td:p-3 sm:prose-lg">
                              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {String(msg.content)}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {!isThinking && msg.content !== '' && (
                          <div className="relative self-start ml-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setReportingIdx(reportingIdx === idx ? null : idx); }}
                              className={`flex items-center gap-1.5 text-xs transition-all duration-300 active:scale-95 ${reportingIdx === idx ? 'text-rose-300' : 'text-slate-500 opacity-0 hover:text-rose-300 group-hover:opacity-100'}`}
                            >
                              <Flag size={12} />
                              <span className="text-[11px] font-bold uppercase tracking-widest">??</span>
                            </button>

                            {reportingIdx === idx && (
                              <div className="absolute left-0 bottom-full z-50 mb-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200" onClick={(e) => e.stopPropagation()}>
                                <div className="border-b border-white/10 bg-white/5 p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">????</div>
                                <div className="flex flex-col">
                                  {['?????', '??????', '????', '????'].map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        setReportingIdx(null);
                                        showNotification('???????????', 'success');
                                      }}
                                      className="border-b border-white/10 px-4 py-3 text-left text-xs font-bold text-slate-300 transition-colors last:border-none hover:bg-rose-400/10 hover:text-rose-200"
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

              {isThinking && aiStatus && (
                <div className="mb-2 flex items-start justify-start gap-3 pl-[52px] animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2.5 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-100 backdrop-blur-xl">
                      <BrainCircuit size={16} className="animate-pulse" />
                      <span className="tracking-tight">AI ???</span>
                      <span className="ml-1 flex gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-cyan-300 animate-bounce"></span>
                        <span className="h-1 w-1 rounded-full bg-cyan-300 animate-bounce delay-75"></span>
                        <span className="h-1 w-1 rounded-full bg-cyan-300 animate-bounce delay-150"></span>
                      </span>
                    </div>
                    <p className="pl-1 text-xs font-semibold text-slate-400">{aiStatus}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {pendingApproval && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[6px]">
            <div className="w-full max-w-lg space-y-4 rounded-3xl border border-white/10 bg-slate-950/85 p-6 shadow-2xl backdrop-blur-2xl">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Approval Required</p>
                <h3 className="text-xl font-extrabold text-white">?????????</h3>
                <p className="text-sm text-slate-300">{pendingApproval.prompt || 'AI ???????????????????????'}</p>
                {approvalActionId ? <p className="text-xs text-slate-500">approval_id: {approvalActionId}</p> : <p className="text-xs text-rose-300">?? approval_id??????????</p>}
              </div>

              {pendingApproval.proposalItems?.length > 0 && (
                <div className="max-h-52 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">proposal</p>
                  <div className="space-y-2">
                    {pendingApproval.proposalItems.map((item) => (
                      <div key={`${item.field}-${item.value}`} className="grid grid-cols-[98px_76px_1fr] gap-2 text-sm">
                        <span className="break-words font-semibold text-slate-100">{item.label}</span>
                        <span className="break-words text-slate-400">{item.actionLabel}</span>
                        <span className="break-words text-slate-300">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setPendingApproval(null); latestApprovalIdRef.current = null; }}
                  disabled={isSubmittingApproval}
                  className="rounded-xl border border-white/10 px-4 py-2 font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
                >
                  ??
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveAction('reject')}
                  disabled={isSubmittingApproval || !approvalActionId}
                  className="rounded-xl border border-white/10 px-4 py-2 font-semibold text-slate-100 hover:bg-white/5 disabled:opacity-50"
                >
                  ??
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveAction('approve')}
                  disabled={isSubmittingApproval || !approvalActionId}
                  className="rounded-xl bg-[linear-gradient(135deg,_rgba(34,211,238,0.95),_rgba(37,99,235,0.95))] px-4 py-2 font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
                >
                  {isSubmittingApproval ? '???...' : '????'}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedImage && (
          <div className="absolute bottom-[110px] left-4 z-40 animate-in slide-in-from-bottom-4 sm:bottom-[126px] sm:left-10">
            <div className="relative rounded-3xl border border-cyan-300/15 bg-slate-950/85 p-2 shadow-[0_25px_80px_-30px_rgba(34,211,238,0.75)] backdrop-blur-2xl">
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 rounded-full bg-slate-900 p-1 text-white shadow-md transition-colors hover:bg-rose-500">
                <X size={14} />
              </button>
              <img src={selectedImage} alt="Preview" className="h-20 w-20 rounded-2xl border border-cyan-300/15 object-cover" />
            </div>
          </div>
        )}

        <div className="relative z-30 shrink-0 border-t border-white/10 bg-slate-950/20 p-4 pb-5 backdrop-blur-2xl sm:p-6 sm:pb-7">
          <form onSubmit={handleAsk} className="mx-auto flex max-w-5xl items-end gap-3 rounded-[30px] border border-white/10 bg-white/[0.05] px-3 py-3 shadow-[0_-10px_45px_-25px_rgba(34,211,238,0.8)] backdrop-blur-2xl">
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
              className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-white/6 text-slate-300 transition-all duration-300 hover:border-cyan-300/20 hover:bg-cyan-400/10 hover:text-cyan-100 active:scale-95 disabled:opacity-50"
            >
              <ImagePlus size={24} />
            </button>

            <div className="group relative flex-1">
              <textarea
                value={question}
                onChange={handleQuestionChange}
                maxLength={QUESTION_MAX_LENGTH}
                placeholder="?????????? AI ????..."
                disabled={isThinking || isRoomLoading || !activeRoomId}
                rows={Math.min(4, Math.max(1, question.split('\n').length))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk(e);
                  }
                }}
                className="w-full resize-none rounded-[22px] border border-white/10 bg-slate-950/35 px-6 py-4 pr-12 text-base font-medium text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-cyan-300/30 focus:ring-4 focus:ring-cyan-400/10 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyan-400/15"
              />
              <BrainCircuit size={20} className="absolute right-5 bottom-4 text-slate-500 transition-colors group-focus-within:text-cyan-300" />
            </div>

            <button
              type="submit"
              disabled={isThinking || isRoomLoading || (!question.trim() && !selectedImage) || !activeRoomId}
              className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[20px] border border-cyan-200/40 bg-[linear-gradient(135deg,_rgba(34,211,238,0.98),_rgba(37,99,235,0.98))] text-slate-950 shadow-[0_18px_45px_-18px_rgba(34,211,238,0.95)] transition-all duration-300 hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              <Send size={24} className={(question.trim() || selectedImage) && !isThinking ? 'animate-pulse' : ''} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Consult;
