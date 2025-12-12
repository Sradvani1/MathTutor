import { GoogleGenAI, Chat, Part, GenerateContentResponse, Content } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TUTOR_SYSTEM_INSTRUCTION = "You are a high school math tutor specializing in algebra, geometry and calculus. Your primary goal is to help the user understand how to solve problems through clear, step-by-step explanations. When presenting mathematical formulas or variables, always enclose them in LaTeX delimiters. Use single dollar signs for inline math (e.g., $f(x) = x^2$) and double dollar signs for display math (e.g., $$ \\int x^2 dx $$). When you introduce a key mathematical concept (like 'Product Rule', 'Chain Rule', 'L'Hôpital's Rule', etc.), wrap it in a special format: [glossary:The Concept Name]. For example: 'For this step, we need to use the [glossary:Product Rule].' Do not use this format for simple variables or formulas, only for named concepts, theorems, or rules. Do not use markdown formatting (no ** for bold, no # for headers, no * for bullet points). Use plain text with line breaks for structure.";

let chat: Chat | null = null;

export const startChat = (history?: Content[]) => {
     chat = ai.chats.create({
        model: 'gemini-2.5-pro',
        history: history || [],
        config: {
            systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingBudget: 32768 },
        },
    });
}

export const sendMessage = async (
    prompt: Part[]
): Promise<string> => {
    if (!chat) {
       startChat();
    }
    if (!chat) {
        throw new Error("Chat could not be initialized.");
    }

    const result: GenerateContentResponse = await chat.sendMessage({ message: prompt });
    if (!result.text) {
        throw new Error("No response text received from the AI model.");
    }
    return result.text;
};

export const getGlossaryDefinition = async (term: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Please provide a concise definition and a simple example for the following mathematical concept: "${term}". Use LaTeX for any formulas. Format your response in plain text without markdown formatting (do not use ** for bold or # for headers). Structure it clearly with line breaks between sections.`,
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching glossary definition:", error);
        return "Sorry, I couldn't fetch a definition for that term right now.";
    }
};
