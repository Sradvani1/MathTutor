
import React, { useRef } from 'react';
import { ImageFile } from '../types';
import { fileToImageFile } from '../utils';

interface WelcomeScreenProps {
  onImageUpload: (imageFile: ImageFile) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onImageUpload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setErrorMessage(null); // Clear previous errors
        
        if (file) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WelcomeScreen.tsx:13',message:'file selected (welcome)',data:{fileName:file.name,fileSize:file.size,fileType:file.type,sizeMB:(file.size/1024/1024).toFixed(2),isMobile:window.innerWidth<640,userAgent:navigator.userAgent.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            try {
                const imageFile = await fileToImageFile(file);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WelcomeScreen.tsx:17',message:'fileToImageFile success (welcome), calling onImageUpload',data:{mimeType:imageFile.mimeType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                onImageUpload(imageFile);
            } catch (error) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/721015d6-5fec-4368-8083-18fa7e6fdce2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WelcomeScreen.tsx:19',message:'fileToImageFile error (welcome)',data:{errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                console.error("Error processing file:", error);
                const errorMsg = error instanceof Error ? error.message : "Failed to process image. Please try again.";
                setErrorMessage(errorMsg);
                // Clear error after 5 seconds
                setTimeout(() => setErrorMessage(null), 5000);
            }
        }
        if(event.target) {
            event.target.value = '';
        }
    };

    return (
        <div className="text-center px-4 py-6 sm:p-8 flex-1 flex flex-col items-center justify-center">
            <div className="max-w-2xl mx-auto w-full">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
                    Welcome to your AI Math Tutor
                </h2>
                <p className="text-sm sm:text-base lg:text-lg text-gray-400 mb-6 sm:mb-8 px-2">
                    Stuck on a tricky calculus or algebra problem? Don't just get the answer, understand the process. Upload a photo of your problem, and I'll guide you through it, one step at a time.
                </p>
                {errorMessage && (
                    <div className="mb-4 px-4">
                        <div className="bg-red-900/80 border border-red-700 text-red-100 px-4 py-3 rounded-lg text-sm max-w-md mx-auto">
                            {errorMessage}
                        </div>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-white font-bold py-2.5 px-5 sm:py-3 sm:px-6 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 inline-flex items-center gap-2 text-sm sm:text-base shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" className="sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    Upload a Math Problem
                </button>
            </div>
        </div>
    );
};
