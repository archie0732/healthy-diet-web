import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Activity, Send, BrainCircuit, Flag, Plus, X, Menu, BotMessageSquare, ImagePlus } from 'lucide-react';

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
  const starterSuggestions = [
    'High-protein one-day meal plan',
    'What should I eat for dinner during 16:8 fasting?',
    'How can I order healthier when eating out?',
    'Can you estimate whether I exceeded my calories today?',
  ];

  return (
    <div
      className="mx-auto flex h-[calc(100dvh-80px)] w-[100vw] max-w-[1480px] -mx-4 -mt-4 overflow-hidden bg-white sm:mx-0 sm:mt-0 sm:h-[calc(100vh-140px)] sm:w-auto sm:rounded-[28px] sm:border sm:border-slate-200 sm:shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)]"
      onClick={() => setReportingIdx(null)}
    >
      <div className={`absolute sm:relative z-40 flex h-full w-[280px] flex-col border-r border-slate-200 bg-white transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}`}>
        <div className="border-b border-slate-200 p-4">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Chats</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Consult</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              disabled={isRoomsLoading}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                New chat
              </span>
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 sm:hidden"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {isRoomsLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`room-skeleton-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-md bg-slate-200"></div>
                  <div className="h-3.5 w-full rounded-full bg-slate-200"></div>
                </div>
              </div>
            ))
          ) : rooms.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No chats yet</div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => { setActiveRoomId(room.id); setIsSidebarOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition ${
                  activeRoomId === room.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MessageSquare size={16} className={activeRoomId === room.id ? 'text-white' : 'text-slate-400'} />
                <span className="truncate font-medium">{room.title || 'Untitled chat'}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/30 sm:hidden"
        ></div>
      )}

      <div className="relative flex flex-1 flex-col bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 sm:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
              <BotMessageSquare size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{activeRoomTitle}</h2>
              <p className="text-xs text-slate-500">AI diet assistant</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <span className={`inline-block h-2 w-2 rounded-full ${isThinking ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            <span>{isThinking ? 'Thinking' : 'Ready'}</span>
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {isRoomLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-600 shadow-sm">
                <Activity size={18} className="animate-spin" />
                <span className="text-sm font-medium">Loading chat...</span>
              </div>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <BrainCircuit size={28} />
              </div>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">Start a new conversation</h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                Ask about calories, meal planning, fat loss, protein intake, or send a food photo for analysis.
              </p>

              <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
                {starterSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuestion(suggestion)}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {chatHistory.map((msg, idx) => (
                <div key={idx}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end gap-3">
                      <div className="flex max-w-[85%] flex-col items-end gap-2 sm:max-w-[72%]">
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="User Upload"
                            className="max-w-[220px] rounded-2xl border border-slate-200 object-cover sm:max-w-[300px]"
                          />
                        )}
                        {msg.content && msg.content !== '(???)' && (
                          <div className="rounded-[22px] rounded-br-md bg-slate-900 px-5 py-3.5 text-sm leading-6 text-white sm:text-[15px]">
                            {msg.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="group flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                        <BotMessageSquare size={16} />
                      </div>
                      <div className="flex max-w-[92%] flex-col gap-2 sm:max-w-[84%]">
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="AI Attachment"
                            className="max-w-[220px] rounded-2xl border border-slate-200 object-cover sm:max-w-[320px]"
                          />
                        )}
                        <div className="rounded-[22px] rounded-tl-md border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-700 shadow-sm sm:text-[15px]">
                          {!msg.content || msg.content === '' ? (
                            <span className="flex items-center gap-2 font-medium text-slate-500">
                              <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-pulse"></span>
                              <span>{aiStatus || 'Thinking...'}</span>
                            </span>
                          ) : (
                            <div className="prose prose-slate max-w-none prose-headings:border-b prose-headings:border-slate-200 prose-headings:pb-2 prose-headings:font-semibold prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-a:text-blue-600 prose-strong:text-slate-900 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:p-2 prose-td:border prose-td:border-slate-200 prose-td:p-2 sm:prose-base">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                              >
                                {String(msg.content)}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {!isThinking && msg.content !== '' && (
                          <div className="relative self-start">
                            <button
                              onClick={(e) => { e.stopPropagation(); setReportingIdx(reportingIdx === idx ? null : idx); }}
                              className={`flex items-center gap-1 text-[11px] font-medium transition ${reportingIdx === idx ? 'text-rose-500' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-500'}`}
                            >
                              <Flag size={12} />
                              <span>Report</span>
                            </button>

                            {reportingIdx === idx && (
                              <div
                                className="absolute left-0 bottom-full z-50 mb-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  Report
                                </div>
                                <div className="flex flex-col">
                                  {['Incorrect', 'Incomplete', 'Off topic', 'Other'].map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        setReportingIdx(null);
                                        showNotification('Feedback received.', 'success');
                                      }}
                                      className="border-b border-slate-100 px-4 py-3 text-left text-xs font-medium text-slate-600 transition last:border-none hover:bg-slate-50"
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
                <div className="pl-12">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <BrainCircuit size={14} className="animate-pulse" />
                    <span>{aiStatus}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {pendingApproval && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Approval</p>
                <h3 className="text-xl font-semibold text-slate-900">Confirm profile update</h3>
                <p className="text-sm text-slate-600">
                  {pendingApproval.prompt || 'Please review the suggested profile changes before continuing.'}
                </p>
                {approvalActionId ? (
                  <p className="text-xs text-slate-400">approval_id: {approvalActionId}</p>
                ) : (
                  <p className="text-xs text-rose-500">approval_id is missing.</p>
                )}
              </div>

              {pendingApproval.proposalItems?.length > 0 && (
                <div className="mt-4 max-h-52 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">proposal</p>
                  <div className="space-y-2">
                    {pendingApproval.proposalItems.map((item) => (
                      <div key={`${item.field}-${item.value}`} className="grid grid-cols-[98px_76px_1fr] gap-2 text-sm">
                        <span className="break-words font-medium text-slate-700">{item.label}</span>
                        <span className="break-words text-slate-500">{item.actionLabel}</span>
                        <span className="break-words text-slate-600">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setPendingApproval(null); latestApprovalIdRef.current = null; }}
                  disabled={isSubmittingApproval}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveAction('reject')}
                  disabled={isSubmittingApproval || !approvalActionId}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveAction('approve')}
                  disabled={isSubmittingApproval || !approvalActionId}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmittingApproval ? 'Submitting...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedImage && (
          <div className="absolute bottom-[92px] left-4 z-40 sm:bottom-[108px] sm:left-6">
            <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 rounded-full bg-slate-900 p-1 text-white transition hover:bg-rose-500"
              >
                <X size={14} />
              </button>
              <img src={selectedImage} alt="Preview" className="h-20 w-20 rounded-xl object-cover" />
            </div>
          </div>
        )}

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <form onSubmit={handleAsk} className="mx-auto flex max-w-3xl items-end gap-3">
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
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ImagePlus size={22} />
            </button>

            <div className="relative flex-1">
              <textarea
                value={question}
                onChange={handleQuestionChange}
                maxLength={QUESTION_MAX_LENGTH}
                placeholder="Ask anything about meals, calories, nutrition, or your diet plan..."
                disabled={isThinking || isRoomLoading || !activeRoomId}
                rows={Math.min(4, Math.max(1, question.split('\n').length))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk(e);
                  }
                }}
                className="w-full resize-none rounded-[22px] border border-slate-200 bg-white px-5 py-3.5 pr-12 text-sm text-slate-800 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100 sm:text-[15px]"
              />
              <BrainCircuit size={18} className="absolute right-4 bottom-4 text-slate-300" />
            </div>

            <button
              type="submit"
              disabled={isThinking || isRoomLoading || (!question.trim() && !selectedImage) || !activeRoomId}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Consult;
