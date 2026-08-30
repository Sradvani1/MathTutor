import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { errorResponse, parseHistory, parseJsonBody, parsePart } from '../lib/api.js';
import { SUBJECTS, type Subject } from '../types.js';

export const maxDuration = 60;

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

export default async function handler(request: Request) {
  if (request.method !== 'POST') return errorResponse('Method not allowed.', 405);

  const body = await parseJsonBody(request);
  if (!body || typeof body !== 'object' || !('history' in body) || !('message' in body) || !('subject' in body)) {
    return errorResponse('Invalid request.', 400);
  }

  const history = parseHistory(body.history);
  if (!history || !isSubject(body.subject) || !Array.isArray(body.message) || body.message.length === 0 || body.message.length > 2) {
    return errorResponse('Invalid conversation data.', 400);
  }

  const message = body.message.map((part) => parsePart(part, true));
  if (message.some((part) => !part)) return errorResponse('Invalid message data.', 400);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return errorResponse('The tutor is temporarily unavailable.', 503);

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
        systemInstruction: `${BASE_SYSTEM_INSTRUCTION}\n\n${SUBJECT_INSTRUCTIONS[body.subject]}`,
        thinkingConfig: { thinkingBudget: -1 },
      },
    });
    const result = await chat.sendMessage({ message: prompt });
    if (!result.text) return errorResponse("The tutor couldn't produce a response. Please try again.", 502);
    return Response.json({ text: result.text }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return errorResponse('The tutor could not process that request. Please try again.', 502);
  }
}
