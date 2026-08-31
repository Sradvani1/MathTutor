import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SUBJECTS, type Subject } from '../types.js';

export const config = { maxDuration: 30 };

const isSubject = (value: unknown): value is Subject =>
  typeof value === 'string' && SUBJECTS.includes(value as Subject);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const body = req.body as unknown;
  const term = body && typeof body === 'object' && 'term' in body && typeof (body as { term: unknown }).term === 'string' ? (body as { term: string }).term.trim() : '';
  const subject = body && typeof body === 'object' && 'subject' in body ? (body as { subject: unknown }).subject : undefined;
  if (!term || term.length > 120 || !isSubject(subject)) return res.status(400).json({ error: 'Invalid glossary request.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'The tutor is temporarily unavailable.' });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Please provide a concise definition and a simple example for the following ${subject === 'physics' ? 'AP Physics C: Mechanics concept' : 'AP Calculus BC concept'}: "${term}". Use LaTeX for any formulas. Format your response in plain text without markdown formatting (do not use ** for bold or # for headers). Structure it clearly with line breaks between sections.`,
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ text: response.text || 'No definition was returned.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = (error as { status?: number })?.status;
    console.error('[api/glossary] Gemini error', status, msg);
    if (status === 400 || msg.includes('API_KEY_INVALID')) {
      return res.status(503).json({ error: 'The Gemini API key is invalid. Update GEMINI_API_KEY in Vercel.' });
    }
    return res.status(502).json({ error: "The definition couldn't be fetched. Please try again." });
  }
}
