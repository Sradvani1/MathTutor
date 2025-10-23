
import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import { Message } from './types';
import { startChat } from './services/geminiService';
import { formatChatForExport } from './utils';
import { Part, Content } from '@google/genai';
import { useScript } from './hooks/useScript';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Dynamically load the KaTeX script to avoid quirks mode warnings.
  // The MathRenderer component will re-render and use window.katex once it's available.
  useScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js');

  // Global error handler for better debugging
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent | PromiseRejectionEvent) => {
      let error;
      if (event instanceof ErrorEvent) {
        error = {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
        };
      } else {
        error = {
          reason: event.reason,
        };
      }
      console.error("A global error was caught, preventing a crash:", error);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, []);

  // Load from local storage on initial render
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('socraticMathSession');
      if (savedSession) {
        const savedMessages: Message[] = JSON.parse(savedSession);
        
        if (Array.isArray(savedMessages) && savedMessages.length > 0) {
          
          const validMessages = savedMessages.filter(msg => {
              if (!msg || (msg.role !== 'user' && msg.role !== 'model') || !Array.isArray(msg.parts)) {
                  console.warn("Filtering out invalid message from localStorage:", msg);
                  return false;
              }
              const partsToValidate = msg.rawParts || msg.parts;
              if (!Array.isArray(partsToValidate)) {
                  console.warn("Filtering out message with invalid parts from localStorage:", msg);
                  return false;
              }
              
              return partsToValidate.every(part => {
                  if (!part) return false;
                  const hasText = 'text' in part && typeof (part as any).text === 'string';
                  const hasInlineData = 'inlineData' in part && 
                                        part.inlineData && 
                                        typeof part.inlineData.data === 'string' &&
                                        typeof part.inlineData.mimeType === 'string';
                  return hasText || hasInlineData;
              });
          });
          
          setMessages(validMessages);

          const history: Content[] = validMessages.map(({ role, parts, rawParts }) => ({ role, parts: rawParts || parts }));
          startChat(history);
        }
      }
    } catch (error) {
      console.error("Failed to load or parse session from local storage. Clearing corrupted data.", error);
      localStorage.removeItem('socraticMathSession');
    }
  }, []);

  // Save to local storage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('socraticMathSession', JSON.stringify(messages));
    } else {
      localStorage.removeItem('socraticMathSession');
    }
  }, [messages]);
  
  const addMessage = (role: 'user' | 'model', parts: Part[], rawParts?: Part[]) => {
    const newMessage: Message = { id: Date.now().toString(), role, parts, rawParts };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const chatText = formatChatForExport(messages);
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'socratic-math-tutor-chat.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleResetChat = () => {
      if(window.confirm("Are you sure you want to start a new session? The current chat will be cleared.")) {
          setMessages([]);
          startChat();
          localStorage.removeItem('socraticMathSession');
      }
  }
  
  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 font-sans overflow-hidden">
      <header className="flex-shrink-0 bg-gray-800 shadow-md px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-teal-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">
                  Socratic Math Tutor
              </h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={handleExportChat}
                  disabled={messages.length === 0}
                  className="px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2"
                  title="Export Chat"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={handleResetChat}
                  disabled={messages.length === 0}
                  className="px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm bg-red-800 hover:bg-red-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2"
                  title="New Session"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    <span className="hidden sm:inline">New Session</span>
                </button>
            </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <ChatInterface messages={messages} addMessage={addMessage} setMessages={setMessages} />
      </main>
    </div>
  );
};

export default App;