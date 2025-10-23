
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
  const isChatActive = messages.length > 0;

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
    setIsLoading(true);
    setShowSuggestions(false);

    const imagePart: Part = {
        inlineData: {
            mimeType: imageFile.mimeType,
            data: imageFile.data,
        },
    };
    
    // This is the full prompt that will be sent to the AI model
    const modelPromptParts: Part[] = [
        imagePart,
        {
            text: "Here is a math problem I'm working on. Please look at the image, identify the problem, and explain only the very first step to start solving it. Don't give me the whole answer, just the first action I should take. Frame it as a guiding question if possible."
        }
    ];
    
    // This is what will be displayed in the UI for the user's message
    const uiMessageParts: Part[] = [imagePart];
    
    addMessage('user', uiMessageParts, modelPromptParts); // Show only image in UI, but save full prompt
    await getAIResponse(modelPromptParts);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !isChatActive) return;
    const parts: Part[] = [{ text }];
    addMessage('user', parts);
    await getAIResponse(parts);
  };
  
  const getAIResponse = async (prompt: Part[]) => {
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
        const responseText = await sendMessage(prompt);
        addMessage('model', [{ text: responseText }]);
    } catch (error) {
         console.error("Error getting response:", error);
         addMessage('model', [{ text: "I encountered an error. Could you please rephrase or try again?" }]);
    } finally {
        setIsLoading(false);
        setShowSuggestions(true);
    }
  }


  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8 flex flex-col gap-4 sm:gap-5 lg:gap-6"
        style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}
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
      <div className="flex-shrink-0 px-3 py-3 sm:px-4 sm:py-4 bg-gray-800/50 backdrop-blur-sm border-t border-gray-700">
        <UserInput
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onImageUpload={handleImageUpload}
          showSuggestions={showSuggestions}
          isChatActive={isChatActive}
        />
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
