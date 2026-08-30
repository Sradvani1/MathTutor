import { Message, MessagePart } from '../types';

interface ApiError {
  error?: string;
}

const MAX_HISTORY_MESSAGES = 20;
const REQUEST_TIMEOUT_MS = 55_000;
const IMAGE_HISTORY_TEXT = 'The user submitted an image problem for you to solve.';

const toHistory = (messages: Message[]) => {
  const history = messages.reduce<{ role: Message['role']; parts: { text: string }[] }[]>((turns, { role, parts, rawParts }) => {
    // Prior images are not resent, which keeps requests within function limits.
    const textParts = (rawParts || parts).filter((part): part is { text: string } => 'text' in part);
    const expectsUser = turns.length % 2 === 0;
    if (textParts.length > 0 && ((expectsUser && role === 'user') || (!expectsUser && role === 'model'))) {
      turns.push({ role, parts: textParts });
    }
    return turns;
  }, []);

  if (history.length % 2 !== 0) history.pop();
  return history.slice(-MAX_HISTORY_MESSAGES);
};

const request = async <T>(path: string, body: unknown): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as ApiError & T;
    if (!response.ok) {
      throw new Error(payload.error || 'The tutor could not process that request. Please try again.');
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Network connection issue. Please check your internet connection and try again.');
    }
    if (error instanceof Error) throw error;
    throw new Error('Network connection issue. Please check your internet connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
};

export const sendMessage = async (message: MessagePart[], history: Message[]): Promise<string> => {
  const response = await request<{ text: string }>('/api/chat', {
    history: toHistory(history),
    message,
  });

  if (!response.text) {
    throw new Error("The AI model didn't return a response. Please try again.");
  }

  return response.text;
};

export const getGlossaryDefinition = async (term: string): Promise<string> => {
  const response = await request<{ text: string }>('/api/glossary', { term });
  return response.text;
};

export { IMAGE_HISTORY_TEXT };
