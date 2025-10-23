
import React, { useState } from 'react';
import { Message } from '../types';
import { MathRenderer } from './MathRenderer';
import { ImagePreviewModal } from './ImagePreviewModal';

interface MessageBubbleProps {
  message: Message;
  onGlossaryClick: (term: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onGlossaryClick }) => {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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
    <div className={`flex items-end gap-2 min-w-0 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold self-start text-xs sm:text-sm">
          AI
        </div>
      )}
      <div
        className={`rounded-2xl p-3 sm:p-4 shadow-md space-y-2 sm:space-y-3 min-w-0 overflow-hidden ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none max-w-[85%] sm:max-w-md lg:max-w-lg'
            : 'bg-gray-700 text-gray-200 rounded-bl-none max-w-[85%] sm:max-w-lg lg:max-w-xl'
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
                        className="rounded-lg w-full max-w-xs sm:max-w-sm h-auto border-2 border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setPreviewImage(dataUrl)}
                        title="Click to view larger"
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
          className="hidden sm:flex flex-shrink-0 p-1.5 sm:p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-600 transition-colors self-center"
          aria-label="Copy to clipboard"
          title={isCopied ? "Copied!" : "Copy to clipboard"}
        >
          {isCopied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          )}
        </button>
      )}

      <ImagePreviewModal
        imageUrl={previewImage || ''}
        isOpen={previewImage !== null}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};
