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

export const parseConsultSseEventBlock = (block) => {
  if (typeof block !== 'string') return null;

  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  let id = '';
  let event = '';
  const dataLines = [];

  for (const line of lines) {
    if (line.startsWith('id:')) {
      id = line.slice(3).trim();
      continue;
    }

    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) return null;

  const payloadText = dataLines.join('\n');
  if (!payloadText || payloadText === '[DONE]') return null;

  try {
    const payload = JSON.parse(payloadText);
    return {
      id,
      event,
      payload,
      payloadText,
      type: resolveConsultStreamEventType(payload, event),
    };
  } catch {
    return null;
  }
};

export const consumeConsultStreamChunk = (buffer, chunk) => {
  const nextBuffer = `${typeof buffer === 'string' ? buffer : ''}${typeof chunk === 'string' ? chunk : String(chunk ?? '')}`;
  const blocks = nextBuffer.split(/\r?\n\r?\n/);
  const trailingBuffer = blocks.pop() ?? '';

  return {
    buffer: trailingBuffer,
    events: blocks
      .map(parseConsultSseEventBlock)
      .filter(Boolean),
  };
};

export const normalizeConsultStreamEvent = (event) => {
  if (!event || typeof event !== 'object' || !event.payload || typeof event.payload !== 'object') {
    return null;
  }

  return {
    id: typeof event.id === 'string' ? event.id : '',
    type: typeof event.type === 'string' ? event.type : '',
    content: typeof event.payload.content === 'string' ? event.payload.content : '',
    payload: event.payload,
  };
};

export const parseConsultToolStatus = (content) => {
  const normalizedContent = typeof content === 'string' ? content.trim() : String(content ?? '').trim();
  if (!normalizedContent) return null;

  const resultMatch = normalizedContent.match(/^Tool\s+(.+?)\s+result:\s*(.+)$/i);
  if (resultMatch) {
    return {
      name: resultMatch[1].trim(),
      status: 'success',
      result: resultMatch[2].trim(),
    };
  }

  const statusMatch = normalizedContent.match(/^Tool\s+(.+?):\s*(running|success|error|failed)$/i);
  if (!statusMatch) return null;

  const normalizedStatus = statusMatch[2].trim().toLowerCase();
  return {
    name: statusMatch[1].trim(),
    status: normalizedStatus === 'failed' ? 'error' : normalizedStatus,
    result: '',
  };
};

export const mergeConsultToolCall = (toolCalls, nextToolCall) => {
  const currentToolCalls = Array.isArray(toolCalls) ? toolCalls : [];
  if (!nextToolCall?.name) return currentToolCalls;

  const nextName = String(nextToolCall.name).trim();
  if (!nextName) return currentToolCalls;

  const normalizedNextToolCall = {
    name: nextName,
    status: typeof nextToolCall.status === 'string' && nextToolCall.status.trim()
      ? nextToolCall.status.trim().toLowerCase()
      : 'running',
    result: typeof nextToolCall.result === 'string' ? nextToolCall.result : String(nextToolCall.result ?? ''),
  };

  const existingIndex = currentToolCalls.findIndex((toolCall) => toolCall?.name === nextName);
  if (existingIndex === -1) {
    return [...currentToolCalls, normalizedNextToolCall];
  }

  const nextToolCalls = [...currentToolCalls];
  const existingToolCall = nextToolCalls[existingIndex] ?? {};
  nextToolCalls[existingIndex] = {
    ...existingToolCall,
    ...normalizedNextToolCall,
    result: normalizedNextToolCall.result || existingToolCall.result || '',
  };
  return nextToolCalls;
};

export const normalizeToolCallsFromDoneEvent = (payload) => {
  const rawTools = Array.isArray(payload?.tools)
    ? payload.tools
    : Array.isArray(payload?.result?.tools)
      ? payload.result.tools
      : [];

  return rawTools
    .map((tool) => {
      if (!tool || typeof tool !== 'object') return null;
      const name = typeof tool.name === 'string' ? tool.name.trim() : '';
      if (!name) return null;

      return {
        name,
        status: typeof tool.status === 'string' && tool.status.trim()
          ? tool.status.trim().toLowerCase()
          : 'success',
        result: typeof tool.result === 'string' ? tool.result : String(tool.result ?? ''),
      };
    })
    .filter(Boolean);
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
