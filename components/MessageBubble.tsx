import React, { useState } from 'react';
import { Message } from '../types';
import { MathRenderer } from './MathRenderer';

interface MessageBubbleProps {
  message: Message;
  onGlossaryClick: (term: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onGlossaryClick }) => {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const fullText = message.parts.map(p => 'text' in p ? p.text : '').join('\n');

  const handleCopy = () => {
    if (navigator.clipboard && fullText) {
      navigator.clipboard.writeText(fullText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  };
  
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold self-start">
          AI
        </div>
      )}
      <div
        className={`rounded-2xl p-4 max-w-lg lg:max-w-xl shadow-md space-y-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-700 text-gray-200 rounded-bl-none'
        }`}
      >
        {message.parts.map((part, index) => {
             if ('inlineData' in part && part.inlineData) {
                const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                return (
                    <img
                        key={index}
                        src={dataUrl}
                        alt="User upload"
                        className="rounded-lg max-w-xs h-auto border-2 border-gray-600"
                    />
                );
            }
            if ('text' in part && part.text) {
                return (
                    <MathRenderer key={index} text={part.text} onGlossaryClick={onGlossaryClick} />
                );
            }
            return null;
        })}
      </div>
       {!isUser && fullText && (
        <button
          onClick={handleCopy}
          className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-600 transition-colors self-center"
          aria-label="Copy to clipboard"
        >
          {isCopied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          )}
        </button>
      )}
    </div>
  );
};