
import React, { useState, useRef, useEffect } from 'react';
import { ImageFile } from '../types';
import { fileToImageFile } from '../utils';

interface UserInputProps {
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onImageUpload: (imageFile: ImageFile) => void;
  showSuggestions: boolean;
  isChatActive: boolean;
}

const SuggestionButton: React.FC<{ onClick: () => void, children: React.ReactNode }> = ({ onClick, children }) => (
    <button
        onClick={onClick}
        className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
    >
        {children}
    </button>
);


export const UserInput: React.FC<UserInputProps> = ({ isLoading, onSendMessage, onImageUpload, showSuggestions, isChatActive }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Set up Speech Recognition once on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !recognitionRef.current) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setText(prev => (prev ? prev + ' ' : '') + transcript);
          setIsListening(false);
        };
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        recognition.onend = () => {
          setIsListening(false);
        };
        recognitionRef.current = recognition;
      }
    }
  }, []);


  const handleSend = () => {
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const imageFile = await fileToImageFile(file);
        onImageUpload(imageFile);
      } catch (error) {
        console.error("Error processing file:", error);
      }
    }
     // Reset file input value to allow uploading the same file again
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  return (
    <div className="space-y-3">
        {showSuggestions && !isLoading && (
            <div className="flex flex-wrap gap-2 justify-center">
                <SuggestionButton onClick={() => handleSuggestionClick("Give me a hint")}>
                    🤔 Hint
                </SuggestionButton>
                <SuggestionButton onClick={() => handleSuggestionClick("Why did we do that?")}>
                    🧐 Why?
                </SuggestionButton>
                <SuggestionButton onClick={() => handleSuggestionClick("What's the next step?")}>
                    ✅ Next Step
                </SuggestionButton>
                 <SuggestionButton onClick={() => handleSuggestionClick("Explain that differently")}>
                    💡 Re-explain
                </SuggestionButton>
            </div>
        )}
        <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-full">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-600 transition-colors disabled:opacity-50"
                aria-label="Upload image"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </button>
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isChatActive ? "Ask a follow-up question..." : "Upload a problem to start"}
                className="flex-1 bg-transparent px-2 py-2 text-white placeholder-gray-400 focus:outline-none"
                disabled={isLoading || !isChatActive}
            />
            {recognitionRef.current && (
              <button
                onClick={handleMicClick}
                disabled={isLoading || !isChatActive}
                className={`p-2 rounded-full transition-colors disabled:opacity-50 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-gray-600'}`}
                aria-label="Use microphone"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              </button>
            )}
            <button
                onClick={handleSend}
                disabled={isLoading || !text.trim() || !isChatActive}
                className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Send message"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
        </div>
    </div>
  );
};
