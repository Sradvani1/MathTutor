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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiService.ts:24',message:'sendMessage entry',data:{hasChat:!!chat,hasImage:prompt.some(p=>'inlineData' in p),imageSize:prompt.find(p=>'inlineData' in p)?(prompt.find(p=>'inlineData' in p) as any).inlineData?.data?.length:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!chat) {
       startChat();
    }
    if (!chat) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiService.ts:31',message:'chat initialization failed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        throw new Error("Chat could not be initialized.");
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiService.ts:34',message:'before API call',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    try {
        // Add timeout for mobile networks that may be slow
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out. Please check your internet connection and try again.')), 60000); // 60 second timeout
        });
        
        const result: GenerateContentResponse = await Promise.race([
            chat.sendMessage({ message: prompt }),
            timeoutPromise
        ]);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiService.ts:35',message:'API call success',data:{hasText:!!result.text,textLength:result.text?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (!result.text) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiService.ts:36',message:'API returned no text',data:{resultKeys:Object.keys(result)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            throw new Error("The AI model didn't return a response. This might be due to image processing issues. Please try uploading a different image.");
        }
        return result.text;
    } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiService.ts:39',message:'API call error',data:{errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:'Unknown',errorStack:error instanceof Error?error.stack?.substring(0,500):undefined,isNetworkError:error instanceof Error&&error.message.includes('fetch'),isTimeout:error instanceof Error&&error.message.includes('timeout')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        // Provide user-friendly error messages
        if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();
            
            // Network/timeout errors
            if (errorMsg.includes('timeout') || errorMsg.includes('network') || errorMsg.includes('fetch')) {
                throw new Error('Network connection issue. Please check your internet connection and try again.');
            }
            
            // API errors that might indicate image issues
            if (errorMsg.includes('400') || errorMsg.includes('bad request')) {
                throw new Error('The image could not be processed. Please try a different image or check that it\'s in a supported format (PNG, JPEG, WebP).');
            }
            
            if (errorMsg.includes('413') || errorMsg.includes('too large') || errorMsg.includes('payload')) {
                throw new Error('Image is too large. Please use an image smaller than 7 MB.');
            }
            
            if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            }
            
            if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('unauthorized')) {
                throw new Error('Authentication error. Please refresh the page and try again.');
            }
        }
        
        // Re-throw with original message if we couldn't categorize it
        throw error;
    }
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
