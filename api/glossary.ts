import { GoogleGenAI } from '@google/genai';
import { checkRateLimit, errorResponse, getClientIp, parseJsonBody } from './shared';

export const maxDuration = 30;

export default async function handler(request: Request) {
  if (request.method !== 'POST') return errorResponse('Method not allowed.', 405);

  let rateLimit;
  try {
    rateLimit = await checkRateLimit('glossary', getClientIp(request));
  } catch {
    return errorResponse('The tutor is temporarily unavailable.', 503);
  }
  if (!rateLimit.configured) return errorResponse('The tutor is temporarily unavailable.', 503);
  if (!rateLimit.success) return errorResponse('Too many glossary requests. Please wait a few minutes and try again.', 429);

  const body = await parseJsonBody(request);
  const term = body && typeof body === 'object' && 'term' in body && typeof body.term === 'string' ? body.term.trim() : '';
  if (!term || term.length > 120) return errorResponse('Invalid glossary term.', 400);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return errorResponse('The tutor is temporarily unavailable.', 503);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Please provide a concise definition and a simple example for the following mathematical concept: "${term}". Use LaTeX for any formulas. Format your response in plain text without markdown formatting (do not use ** for bold or # for headers). Structure it clearly with line breaks between sections.`,
    });
    return Response.json({ text: response.text || 'No definition was returned.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return errorResponse("The definition couldn't be fetched. Please try again.", 502);
  }
}
