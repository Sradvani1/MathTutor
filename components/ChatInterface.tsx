
import { useState, useRef, useEffect, type FC } from 'react';
import { Message, ImageFile, MessagePart, Subject } from '../types';
import { sendMessage, getGlossaryDefinition, IMAGE_HISTORY_TEXT } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { UserInput } from './UserInput';
import { WelcomeScreen } from './WelcomeScreen';
import { GlossaryModal } from './GlossaryModal';

interface ChatInterfaceProps {
  messages: Message[];
  subject: Subject;
  sessionId: number;
  addMessage: (role: 'user' | 'model', parts: MessagePart[], rawParts?: MessagePart[], expectedSessionId?: number) => void;
}

const ChatInterface: FC<ChatInterfaceProps> = ({ messages, subject, sessionId, addMessage }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  
  const [glossaryTerm, setGlossaryTerm] = useState<string | null>(null);
  const [glossaryDefinition, setGlossaryDefinition] = useState<string>('');
  const [isGlossaryLoading, setIsGlossaryLoading] = useState<boolean>(false);
  const glossaryRequestRef = useRef(0);
  const inFlightRef = useRef(false);
  
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
      const requestId = ++glossaryRequestRef.current;
      setGlossaryTerm(term);
      setIsGlossaryLoading(true);
      try {
        const definition = await getGlossaryDefinition(term, subject);
        if (glossaryRequestRef.current === requestId) setGlossaryDefinition(definition);
      } catch (error) {
        if (glossaryRequestRef.current === requestId) {
          setGlossaryDefinition(error instanceof Error ? error.message : "Sorry, I couldn't fetch a definition right now.");
        }
      } finally {
        if (glossaryRequestRef.current === requestId) setIsGlossaryLoading(false);
      }
  };
  
  const handleCloseGlossary = () => {
      glossaryRequestRef.current += 1;
      setGlossaryTerm(null);
      setGlossaryDefinition('');
  };

  const handleImageUpload = async (imageFile: ImageFile) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    // Use a flag to track if we should show error message
    let shouldShowErrorMessage = true;
    
    try {
      // Set loading state immediately (synchronously) so UI updates right away
      setIsLoading(true);
      setShowSuggestions(false);

      const imagePart: MessagePart = {
          inlineData: {
              mimeType: imageFile.mimeType || 'image/jpeg', // Fallback
              data: imageFile.data,
          },
      };
      
      const imageMessageParts: MessagePart[] = [imagePart];

      // Add message immediately so image displays right away
      try {
        addMessage('user', imageMessageParts, [{ text: IMAGE_HISTORY_TEXT }], sessionId);
      } catch (addMessageError) {
        console.error("Error adding message:", addMessageError);
        // Don't show error message if we couldn't even add the user message
        shouldShowErrorMessage = false;
        throw addMessageError;
      }

      await getAIResponse(imageMessageParts);
      
    } catch (error) {
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
                addMessage('model', [{ text: errorMessage }], undefined, sessionId);
              }
              resolve();
            } catch (recoveryError) {
              console.error("Error during error recovery:", recoveryError);

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
      inFlightRef.current = false;
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !isChatActive || inFlightRef.current) return;
    inFlightRef.current = true;
    const parts: MessagePart[] = [{ text }];
    addMessage('user', parts, undefined, sessionId);
    await getAIResponse(parts);
  };
  
  const getAIResponse = async (prompt: MessagePart[]) => {
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
        const responseText = await sendMessage(prompt, messages, subject);

        addMessage('model', [{ text: responseText }], undefined, sessionId);
    } catch (error) {
         console.error("Error getting response:", error);
           addMessage('model', [{ text: error instanceof Error ? error.message : 'I encountered an error. Could you please rephrase or try again?' }], undefined, sessionId);
    } finally {
        inFlightRef.current = false;
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
            ? 'fixed bottom-0 left-0 right-0 z-10 bg-gray-800 px-2 py-3' 
            : 'flex-shrink-0 bg-gray-800/50 backdrop-blur-sm px-4 py-4'
        }`}
      >
        <div className={`w-full ${isMobile ? 'px-1' : 'max-w-4xl mx-auto'}`}>
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
