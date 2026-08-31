import { GoogleGenAI, type Content, type Part } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseHistory, parsePart } from '../lib/api.js';
import { SUBJECTS, type Subject } from '../types.js';

export const config = { maxDuration: 300 };

const BASE_SYSTEM_INSTRUCTION = `You are a supportive high-school tutor. Help the student understand and solve the problem through clear, step-by-step explanations. Adapt the depth of your explanation to an AP-level senior student.

Use LaTeX for all mathematical formulas and variables: $...$ inline and $$...$$ for display math. When introducing a named concept, theorem, law, or rule, use [glossary:Concept Name].

Do not use Markdown formatting. Use plain text with line breaks for structure. Show reasoning, state assumptions, and distinguish exact results from approximations. Do not merely provide an answer when an explanation is needed.`;

const SUBJECT_INSTRUCTIONS = {
  calculus: `Subject: AP Calculus BC.

Teach limits, continuity, derivatives, applications of derivatives, integrals, differential equations, accumulation, and series where relevant. Name and explain the applicable AP Calculus rule or theorem. Connect symbolic work to graphs, units, and interpretation when useful. Use correct notation and state domain restrictions or conditions where they matter.`,
  physics: `Subject: AP Physics C: Mechanics.

Teach calculus-based introductory mechanics at an AP Physics C senior level. Identify the physical system, knowns, unknowns, coordinate axes, sign convention, and assumptions before calculating. Use free-body diagrams and Newton's laws where applicable.

Cover kinematics; forces; work, energy, and power; linear momentum and collisions; circular motion and gravitation; rotation, torque, angular momentum, and equilibrium; and simple harmonic motion. Use calculus when relevant, including derivatives for velocity and acceleration and integrals for displacement, work, momentum, or rotational quantities.

Use SI units by default, track units throughout, state vector directions clearly, and check the final result for sensible units, sign, and magnitude. Explain the physical meaning of each major step, not only the calculation.`,
} as const;

const isSubject = (value: unknown): value is Subject =>
  typeof value === 'string' && SUBJECTS.includes(value as Subject);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const body = req.body as unknown;
  if (!body || typeof body !== 'object' || !('history' in body) || !('message' in body) || !('subject' in body)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  const history = parseHistory((body as { history: unknown }).history);
  if (!history || !isSubject((body as { subject: unknown }).subject) || !Array.isArray((body as { message: unknown }).message) || (body as { message: unknown[] }).message.length === 0 || (body as { message: unknown[] }).message.length > 2) {
    return res.status(400).json({ error: 'Invalid conversation data.' });
  }

  const message = ((body as { message: unknown[] }).message).map((part) => parsePart(part, true));
  if (message.some((part) => !part)) return res.status(400).json({ error: 'Invalid message data.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'The tutor is temporarily unavailable.' });

  const prompt = message as Part[];
  const hasImage = prompt.some((part) => 'inlineData' in part);
  if (hasImage && !prompt.some((part) => 'text' in part)) {
    prompt.push({ text: "Here is a problem I'm working on. Please look at the image, identify the problem, and explain how to solve it step-by-step." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: 'gemini-3.7-flash',
      history: history as Content[],
      config: {
        systemInstruction: `${BASE_SYSTEM_INSTRUCTION}\n\n${SUBJECT_INSTRUCTIONS[(body as { subject: Subject }).subject]}`,
        thinkingConfig: { thinkingBudget: -1 },
      },
    });
    const result = await chat.sendMessage({ message: prompt });
    if (!result.text) return res.status(502).json({ error: "The tutor couldn't produce a response. Please try again." });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ text: result.text });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = (error as { status?: number })?.status;
    console.error('[api/chat] Gemini error', status, msg);
    if (status === 400 || msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      return res.status(503).json({ error: 'The Gemini API key is invalid or revoked. Update GEMINI_API_KEY in Vercel and redeploy.' });
    }
    if (status === 403 || status === 401) {
      return res.status(503).json({ error: 'Gemini API authentication failed. Check the API key and Generative Language API enablement.' });
    }
    if (status === 429) {
      return res.status(503).json({ error: 'Gemini quota exceeded. Try again later.' });
    }
    if (status === 404 || msg.includes('not found') || msg.includes('not supported')) {
      return res.status(503).json({ error: 'The configured Gemini model is not available for this key/project. Check model availability in AI Studio.' });
    }
    return res.status(502).json({ error: 'The tutor could not process that request. Please try again.' });
  }
}
