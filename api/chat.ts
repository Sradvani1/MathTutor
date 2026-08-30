import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { errorResponse, parseHistory, parseJsonBody, parsePart } from './shared';

export const maxDuration = 60;

const TUTOR_SYSTEM_INSTRUCTION = "You are a high school math tutor specializing in algebra, geometry and calculus. Your primary goal is to help the user understand how to solve problems through clear, step-by-step explanations. When presenting mathematical formulas or variables, always enclose them in LaTeX delimiters. Use single dollar signs for inline math (e.g., $f(x) = x^2$) and double dollar signs for display math (e.g., $$ \\int x^2 dx $$). When you introduce a key mathematical concept (like 'Product Rule', 'Chain Rule', 'L'Hopital's Rule', etc.), wrap it in a special format: [glossary:The Concept Name]. Do not use this format for simple variables or formulas, only for named concepts, theorems, or rules. Do not use markdown formatting (no ** for bold, no # for headers, no * for bullet points). Use plain text with line breaks for structure.";

export default async function handler(request: Request) {
  if (request.method !== 'POST') return errorResponse('Method not allowed.', 405);

  const body = await parseJsonBody(request);
  if (!body || typeof body !== 'object' || !('history' in body) || !('message' in body)) {
    return errorResponse('Invalid request.', 400);
  }

  const history = parseHistory(body.history);
  if (!history || !Array.isArray(body.message) || body.message.length === 0 || body.message.length > 2) {
    return errorResponse('Invalid conversation data.', 400);
  }

  const message = body.message.map((part) => parsePart(part, true));
  if (message.some((part) => !part)) return errorResponse('Invalid message data.', 400);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return errorResponse('The tutor is temporarily unavailable.', 503);

  const prompt = message as Part[];
  const hasImage = prompt.some((part) => 'inlineData' in part);
  if (hasImage && !prompt.some((part) => 'text' in part)) {
    prompt.push({ text: "Here is a math problem I'm working on. Please look at the image, identify the problem, and explain how to solve it step-by-step." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: 'gemini-2.5-pro',
      history: history as Content[],
      config: { systemInstruction: TUTOR_SYSTEM_INSTRUCTION, thinkingConfig: { thinkingBudget: 32768 } },
    });
    const result = await chat.sendMessage({ message: prompt });
    if (!result.text) return errorResponse("The tutor couldn't produce a response. Please try again.", 502);
    return Response.json({ text: result.text }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return errorResponse('The tutor could not process that request. Please try again.', 502);
  }
}
