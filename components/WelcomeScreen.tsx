
import React, { useRef } from 'react';
import { ImageFile } from '../types';
import { fileToImageFile } from '../utils';

interface WelcomeScreenProps {
  onImageUpload: (imageFile: ImageFile) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onImageUpload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

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
