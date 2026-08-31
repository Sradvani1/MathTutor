import { GoogleGenAI } from '@google/genai';
import { errorResponse, parseJsonBody } from '../lib/api.js';
import { SUBJECTS, type Subject } from '../types.js';

export const maxDuration = 30;

const isSubject = (value: unknown): value is Subject =>
  typeof value === 'string' && SUBJECTS.includes(value as Subject);

export default async function handler(request: Request) {
  if (request.method !== 'POST') return errorResponse('Method not allowed.', 405);

  const body = await parseJsonBody(request);
  const term = body && typeof body === 'object' && 'term' in body && typeof body.term === 'string' ? body.term.trim() : '';
  const subject = body && typeof body === 'object' && 'subject' in body ? body.subject : undefined;
  if (!term || term.length > 120 || !isSubject(subject)) return errorResponse('Invalid glossary request.', 400);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return errorResponse('The tutor is temporarily unavailable.', 503);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Please provide a concise definition and a simple example for the following ${subject === 'physics' ? 'AP Physics C: Mechanics concept' : 'AP Calculus BC concept'}: "${term}". Use LaTeX for any formulas. Format your response in plain text without markdown formatting (do not use ** for bold or # for headers). Structure it clearly with line breaks between sections.`,
    });
    return Response.json({ text: response.text || 'No definition was returned.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = (error as { status?: number })?.status;
    console.error('[api/glossary] Gemini error', status, message);
    if (status === 400 || message.includes('API_KEY_INVALID')) {
      return errorResponse('The Gemini API key is invalid. Update GEMINI_API_KEY in Vercel.', 503);
    }
    return errorResponse("The definition couldn't be fetched. Please try again.", 502);
  }
}
