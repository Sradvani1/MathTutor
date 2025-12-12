
import React, { useState, useRef, useEffect } from 'react';
import { Message, ImageFile } from '../types';
import { sendMessage, getGlossaryDefinition } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { UserInput } from './UserInput';
import { WelcomeScreen } from './WelcomeScreen';
import { Part } from '@google/genai';
import { GlossaryModal } from './GlossaryModal';

interface ChatInterfaceProps {
  messages: Message[];
  addMessage: (role: 'user' | 'model', parts: Part[], rawParts?: Part[]) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, addMessage, setMessages }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  
  const [glossaryTerm, setGlossaryTerm] = useState<string | null>(null);
  const [glossaryDefinition, setGlossaryDefinition] = useState<string>('');
  const [isGlossaryLoading, setIsGlossaryLoading] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [inputContainerHeight, setInputContainerHeight] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const isChatActive = messages.length > 0;

  // Track if we're on mobile (screens smaller than 640px - Tailwind's sm breakpoint)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Measure input container height on mobile and when suggestions visibility changes
  useEffect(() => {
    const updateInputHeight = () => {
      if (inputContainerRef.current) {
        const height = inputContainerRef.current.offsetHeight;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:46',message:'updateInputHeight called',data:{newHeight:height,oldHeight:inputContainerHeight,isMobile:window.innerWidth<640,showSuggestions,isLoading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        setInputContainerHeight(height);
      }
    };

    updateInputHeight();
    
    // Update on window resize
    window.addEventListener('resize', updateInputHeight);
    
    // Use ResizeObserver to track changes in input container size
    const resizeObserver = new ResizeObserver(updateInputHeight);
    if (inputContainerRef.current) {
      resizeObserver.observe(inputContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateInputHeight);
      resizeObserver.disconnect();
    };
  }, [showSuggestions, isLoading]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      // Use scrollTo for better mobile support
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent mobile issues
      });
    }
  };

  useEffect(() => {
    // Use a single RAF to scroll after render
    // This is sufficient for both desktop and mobile
    const rafId = requestAnimationFrame(() => {
      // Small delay for KaTeX rendering
      setTimeout(scrollToBottom, 100);
    });

    return () => cancelAnimationFrame(rafId);
  }, [messages, isLoading]);
  
  const handleOpenGlossary = async (term: string) => {
      setGlossaryTerm(term);
      setIsGlossaryLoading(true);
      const definition = await getGlossaryDefinition(term);
      setGlossaryDefinition(definition);
      setIsGlossaryLoading(false);
  };
  
  const handleCloseGlossary = () => {
      setGlossaryTerm(null);
      setGlossaryDefinition('');
  };

  const handleImageUpload = async (imageFile: ImageFile) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:104',message:'handleImageUpload entry',data:{mimeType:imageFile.mimeType,dataLength:imageFile.data.length,estimatedSizeMB:(imageFile.data.length*3/4/1024/1024).toFixed(2),isMobile:window.innerWidth<640,windowWidth:window.innerWidth,inputContainerHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Use a flag to track if we should show error message
    let shouldShowErrorMessage = true;
    
    try {
      // Use requestAnimationFrame to ensure state updates happen safely, especially on mobile
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          try {
            setIsLoading(true);
            setShowSuggestions(false);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:109',message:'state updates: setIsLoading(true), setShowSuggestions(false)',data:{isMobile:window.innerWidth<640},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            resolve();
          } catch (stateError) {
            console.error("Error setting initial state:", stateError);
            resolve(); // Continue anyway
          }
        });
      });

      const imagePart: Part = {
          inlineData: {
              mimeType: imageFile.mimeType || 'image/jpeg', // Fallback
              data: imageFile.data,
          },
      };
      
      // This is the full prompt that will be sent to the AI model
      const modelPromptParts: Part[] = [
          imagePart,
          {
              text: "Here is a math problem I'm working on. Please look at the image, identify the problem, and explain how to solve it step-by-step."
          }
      ];
      
      // This is what will be displayed in the UI for the user's message
      const uiMessageParts: Part[] = [imagePart];
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:127',message:'before addMessage',data:{hasImagePart:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      try {
        addMessage('user', uiMessageParts, modelPromptParts); // Show only image in UI, but save full prompt
      } catch (addMessageError) {
        console.error("Error adding message:", addMessageError);
        // Don't show error message if we couldn't even add the user message
        shouldShowErrorMessage = false;
        throw addMessageError;
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:128',message:'after addMessage, before API call',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      await getAIResponse(modelPromptParts);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:129',message:'after API call success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:130',message:'handleImageUpload error caught',data:{errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:'Unknown',errorStack:error instanceof Error?error.stack?.substring(0,500):undefined,isMobile:window.innerWidth<640},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error("Error handling image upload:", error);
      
      // Get user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : "I encountered an error processing your image. Please try uploading again.";
      
      // Safely recover state and show error message
      try {
        // Use requestAnimationFrame for safe state updates on mobile
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            try {
              setIsLoading(false);
              setShowSuggestions(true);
              if (shouldShowErrorMessage) {
                addMessage('model', [{ text: errorMessage }]);
              }
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:148',message:'error recovery state updates completed',data:{isMobile:window.innerWidth<640},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
              // #endregion
              resolve();
            } catch (recoveryError) {
              console.error("Error during error recovery:", recoveryError);
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:149',message:'error recovery failed - state update error',data:{recoveryError:recoveryError instanceof Error?recoveryError.message:String(recoveryError),isMobile:window.innerWidth<640},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
              // #endregion
              resolve(); // Don't throw, just log
            }
          });
        });
      } catch (finalError) {
        // Last resort: at least log it
        console.error("Critical error during recovery:", finalError);
        // Try to at least reset loading state
        try {
          setIsLoading(false);
        } catch {
          // If even this fails, the app might be in a bad state, but we've done our best
        }
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !isChatActive) return;
    const parts: Part[] = [{ text }];
    addMessage('user', parts);
    await getAIResponse(parts);
  };
  
  const getAIResponse = async (prompt: Part[]) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:144',message:'getAIResponse entry',data:{hasImage:prompt.some(p=>'inlineData' in p)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
        const responseText = await sendMessage(prompt);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:149',message:'sendMessage success',data:{responseLength:responseText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        addMessage('model', [{ text: responseText }]);
    } catch (error) {
         // #region agent log
         fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:152',message:'getAIResponse error caught',data:{errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:'Unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
         // #endregion
         console.error("Error getting response:", error);
         addMessage('model', [{ text: "I encountered an error. Could you please rephrase or try again?" }]);
    } finally {
        setIsLoading(false);
        setShowSuggestions(true);
    }
  }


  return (
    <div className="flex flex-col h-full relative">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8 flex flex-col gap-4 sm:gap-5 lg:gap-6"
        style={{ 
          WebkitOverflowScrolling: 'touch', 
          minHeight: 0,
          paddingBottom: isMobile ? `${inputContainerHeight}px` : undefined
        }}
      >
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-4 sm:gap-5 lg:gap-6">
          {messages.length === 0 && <WelcomeScreen onImageUpload={handleImageUpload} />}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onGlossaryClick={handleOpenGlossary} />
          ))}
          {isLoading && (
              <div className="flex items-end gap-2 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold self-start text-xs">
                    AI
                  </div>
                  <div className="rounded-2xl p-3 sm:p-4 max-w-sm bg-gray-700 shadow-md">
                      <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '-0.3s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '-0.15s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      </div>
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div 
        ref={inputContainerRef}
        className={`w-full border-t border-gray-700 ${
          isMobile 
            ? 'fixed bottom-0 left-0 right-0 z-10 bg-gray-800 px-3 py-3' 
            : 'flex-shrink-0 bg-gray-800/50 backdrop-blur-sm px-4 py-4'
        }`}
      >
        <div className="w-full max-w-4xl mx-auto">
          <UserInput
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onImageUpload={handleImageUpload}
            showSuggestions={showSuggestions}
            isChatActive={isChatActive}
          />
        </div>
      </div>
       <GlossaryModal
        term={glossaryTerm}
        definition={glossaryDefinition}
        isLoading={isGlossaryLoading}
        onClose={handleCloseGlossary}
      />
    </div>
  );
};

export default ChatInterface;
