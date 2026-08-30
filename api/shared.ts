import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
export const MAX_HISTORY_MESSAGES = 20;
export const MAX_HISTORY_TEXT_BYTES = 30_000;
const MAX_REQUEST_BYTES = 4_000_000;

const imageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif']);

type TextPart = { text: string };
type ImagePart = { inlineData: { mimeType: string; data: string } };
export type ApiPart = TextPart | ImagePart;
export type ApiMessage = { role: 'user' | 'model'; parts: ApiPart[] };

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const chatRateLimit = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '10 m') }) : null;
const glossaryRateLimit = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '10 m') }) : null;

export const errorResponse = (error: string, status: number) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

export const getClientIp = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export const checkRateLimit = async (kind: 'chat' | 'glossary', ip: string) => {
  const rateLimit = kind === 'chat' ? chatRateLimit : glossaryRateLimit;
  if (!rateLimit) {
    return { configured: false, success: false };
  }

  const result = await rateLimit.limit(`${kind}:${ip}`);
  return { configured: true, success: result.success, reset: result.reset };
};

const decodedImageSize = (data: string) => Math.floor((data.length * 3) / 4) - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);

const isValidBase64 = (value: string) => /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0;

const hasSignature = (data: string, mimeType: string) => {
  const bytes = Buffer.from(data, 'base64');
  if (mimeType === 'image/png') {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === 'image/webp') {
    return bytes.length >= 12 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  }

  const brand = bytes.subarray(8, 12).toString();
  return bytes.length >= 12 && bytes.subarray(4, 8).toString() === 'ftyp' && ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand);
};

const isImagePart = (value: unknown): value is ImagePart => {
  if (!value || typeof value !== 'object' || !('inlineData' in value)) return false;
  const inlineData = value.inlineData;
  return Boolean(
    inlineData &&
      typeof inlineData === 'object' &&
      'mimeType' in inlineData &&
      'data' in inlineData &&
      typeof inlineData.mimeType === 'string' &&
      typeof inlineData.data === 'string' &&
      imageMimeTypes.has(inlineData.mimeType) &&
      inlineData.data.length > 0 &&
      inlineData.data.length <= Math.ceil((MAX_IMAGE_BYTES * 4) / 3) &&
      isValidBase64(inlineData.data) &&
      decodedImageSize(inlineData.data) <= MAX_IMAGE_BYTES &&
      hasSignature(inlineData.data, inlineData.mimeType)
  );
};

const isTextPart = (value: unknown): value is TextPart =>
  Boolean(value && typeof value === 'object' && 'text' in value && typeof value.text === 'string');

export const parsePart = (value: unknown, allowImage: boolean): ApiPart | null => {
  if (isTextPart(value) && value.text.trim().length > 0 && value.text.length <= 4_000) {
    return { text: value.text.trim() };
  }
  if (allowImage && isImagePart(value)) return value;
  return null;
};

export const parseHistory = (value: unknown): ApiMessage[] | null => {
  if (!Array.isArray(value) || value.length > MAX_HISTORY_MESSAGES) return null;

  let textBytes = 0;
  const history: ApiMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || !('role' in item) || !('parts' in item)) return null;
    if ((item.role !== 'user' && item.role !== 'model') || !Array.isArray(item.parts)) return null;
    const candidateParts = item.parts as unknown[];
    const parts = candidateParts.map((part: unknown) => parsePart(part, false));
    if (parts.some((part) => !part)) return null;
    const validParts = parts as TextPart[];
    if (validParts.length === 0) return null;
    textBytes += validParts.reduce((total, part: TextPart) => total + new TextEncoder().encode(part.text).byteLength, 0);
    if (textBytes > MAX_HISTORY_TEXT_BYTES) return null;
    const expectedRole = history.length % 2 === 0 ? 'user' : 'model';
    if (item.role !== expectedRole) return null;
    history.push({ role: item.role, parts: validParts });
  }

  return history.length % 2 === 0 ? history : null;
};

export const parseJsonBody = async (request: Request) => {
  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) return null;
      chunks.push(value);
    }

    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
};
