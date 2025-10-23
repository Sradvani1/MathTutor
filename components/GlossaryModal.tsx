
import React from 'react';
import { MathRenderer } from './MathRenderer';

interface GlossaryModalProps {
    term: string | null;
    definition: string;
    isLoading: boolean;
    onClose: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ term, definition, isLoading, onClose }) => {
    if (!term) return null;

    return (
        <div 
            onClick={onClose} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity"
        >
            <div 
                onClick={(e) => e.stopPropagation()} 
                className="bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700 max-w-2xl w-full"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-teal-400">{term}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="text-gray-300 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {isLoading ? (
                         <div className="flex justify-center items-center h-24">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '-0.3s'}}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '-0.15s'}}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    ) : (
                       <MathRenderer text={definition} onGlossaryClick={() => {}} />
                    )}
                </div>
            </div>
        </div>
    );
}
