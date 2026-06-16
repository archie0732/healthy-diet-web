export const DEFAULT_MODEL_SOURCE = 'auto';

export const normalizeModelSource = (value) => {
  if (value === 'google' || value === 'local' || value === 'auto') {
    return value;
  }

  return DEFAULT_MODEL_SOURCE;
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
