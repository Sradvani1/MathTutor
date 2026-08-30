
import { useState, useEffect, type FC } from 'react';
import ChatInterface from './components/ChatInterface';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Message, MessagePart } from './types';
import { formatChatForExport } from './utils';
import { useScript } from './hooks/useScript';

const isMessagePart = (part: unknown): part is MessagePart => {
  if (!part || typeof part !== 'object') return false;
  if ('text' in part) return typeof part.text === 'string';
  return Boolean(
    'inlineData' in part &&
      part.inlineData &&
      typeof part.inlineData === 'object' &&
      'data' in part.inlineData &&
      'mimeType' in part.inlineData &&
      typeof part.inlineData.data === 'string' &&
      typeof part.inlineData.mimeType === 'string'
  );
};

const loadSavedMessages = (): Message[] => {
  try {
    const savedSession = localStorage.getItem('mathTutorSession');
    if (!savedSession) return [];
    const savedMessages: unknown = JSON.parse(savedSession);
    if (!Array.isArray(savedMessages)) return [];

    return savedMessages.filter((message): message is Message =>
      Boolean(
        message &&
          typeof message === 'object' &&
          'id' in message &&
          typeof message.id === 'string' &&
          'role' in message &&
          (message.role === 'user' || message.role === 'model') &&
          'parts' in message &&
          Array.isArray(message.parts) &&
          message.parts.every(isMessagePart) &&
          (!('rawParts' in message) || message.rawParts === undefined || (Array.isArray(message.rawParts) && message.rawParts.every(isMessagePart)))
      )
    );
  } catch (error) {
    console.error('Failed to load chat session:', error);
    localStorage.removeItem('mathTutorSession');
    return [];
  }
};

const App: FC = () => {
  const [messages, setMessages] = useState<Message[]>(loadSavedMessages);
  
  // Dynamically load the KaTeX script to avoid quirks mode warnings.
  // The MathRenderer component will re-render and use window.katex once it's available.
  useScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js');

  // Save to local storage whenever messages change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem('mathTutorSession', JSON.stringify(messages));
      } else {
        localStorage.removeItem('mathTutorSession');
      }
    } catch (error) {
      console.error('Failed to save chat session:', error);
    }
  }, [messages]);
  
  const addMessage = (role: 'user' | 'model', parts: MessagePart[], rawParts?: MessagePart[]) => {
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
    link.download = 'math-tutor-chat.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleResetChat = () => {
       if(window.confirm("Are you sure you want to start a new session? The current chat will be cleared.")) {
           setMessages([]);
           localStorage.removeItem('mathTutorSession');
      }
  }
  
  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 font-sans overflow-hidden">
      <header className="flex-shrink-0 bg-gray-800 shadow-md px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">
                  Math Tutor
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
        <ErrorBoundary>
          <ChatInterface messages={messages} addMessage={addMessage} />
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default App;
