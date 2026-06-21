export const DEFAULT_MODEL_SOURCE = 'auto';

export const normalizeModelSource = (value) => {
  if (value === 'google' || value === 'local' || value === 'auto') {
    return value;
  }

  return DEFAULT_MODEL_SOURCE;
};

export const resolveConsultStreamEventType = (payload, sseEventName = '') => {
  const payloadType = typeof payload?.type === 'string' ? payload.type.trim().toLowerCase() : '';
  if (payloadType) return payloadType;

  return typeof sseEventName === 'string' ? sseEventName.trim().toLowerCase() : '';
};

export const shouldDisplayAssistantChunk = (delta) => {
  const normalizedDelta = typeof delta === 'string' ? delta : String(delta ?? '');
  const trimmedDelta = normalizedDelta.trim();

  if (!trimmedDelta) return false;
  if (trimmedDelta.toLowerCase().startsWith('user message:')) return false;

  return true;
};

export const upsertAssistantMessage = (history, nextContent) => {
  const nextHistory = [...history];
  const lastMessage = nextHistory[nextHistory.length - 1];
  const normalizedContent = typeof nextContent === 'string' ? nextContent : String(nextContent ?? '');

  if (lastMessage?.role !== 'ai' && !normalizedContent) {
    return nextHistory;
  }

  if (lastMessage?.role === 'ai') {
    nextHistory[nextHistory.length - 1] = {
      ...lastMessage,
      content: normalizedContent,
    };
    return nextHistory;
  }

  return [...nextHistory, { role: 'ai', content: normalizedContent }];
};

export const appendAssistantChunk = (history, delta) => {
  const normalizedDelta = typeof delta === 'string' ? delta : String(delta ?? '');
  if (!shouldDisplayAssistantChunk(normalizedDelta)) return history;

  const nextHistory = [...history];
  const lastMessage = nextHistory[nextHistory.length - 1];

  if (lastMessage?.role === 'ai') {
    nextHistory[nextHistory.length - 1] = {
      ...lastMessage,
      content: `${lastMessage.content ?? ''}${normalizedDelta}`,
    };
    return nextHistory;
  }

  return [...nextHistory, { role: 'ai', content: normalizedDelta }];
};

export const ensureAssistantPlaceholder = (history) => {
  const nextHistory = [...history];
  const lastMessage = nextHistory[nextHistory.length - 1];

  if (lastMessage?.role === 'ai') return nextHistory;

  return [...nextHistory, { role: 'ai', content: '' }];
};

export const buildConsultErrorMessage = (rawMessage) => {
  const normalizedError =
    typeof rawMessage === 'string'
      ? rawMessage.trim()
      : String(rawMessage ?? '').trim();

  return normalizedError
    ? `[System] AI reply failed: ${normalizedError}`
    : '[System] AI reply failed. Please try again.';
};

export const buildConsultChatPayload = ({
  message,
  roomId,
  image,
  user,
  threadId,
  modelSource,
}) => {
  const payload = {
    message,
    room_id: roomId,
    image,
    model_source: normalizeModelSource(modelSource),
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

  if (threadId) {
    payload.thread_id = threadId;
  }

  return payload;
};
