import React, { useMemo, useState, useEffect } from 'react';

// Make TypeScript aware of the global `katex` object attached to the window
// by the script loaded in index.html.
declare global {
    interface Window {
        katex: {
            renderToString(latex: string, options?: any): string;
        };
    }
}

export const MathRenderer: React.FC<{ text: string; onGlossaryClick: (term: string) => void; }> = React.memo(({ text, onGlossaryClick }) => {
    const [fontsReady, setFontsReady] = useState(false);
    
    // Ensure fonts are loaded before rendering to prevent black spots
    useEffect(() => {
        if (typeof document !== 'undefined' && document.fonts) {
            // Check if fonts are already loaded
            if (document.fonts.status === 'loaded') {
                setFontsReady(true);
            } else {
                // Wait for fonts to load
                document.fonts.ready.then(() => {
                    setFontsReady(true);
                });
            }
        } else {
            // Fallback: assume fonts are ready if Font Loading API is not available
            setFontsReady(true);
        }
    }, []);
    
    // A fallback to prevent a crash if the KaTeX script fails to load.
    if (typeof window === 'undefined' || !window.katex) {
        console.warn("KaTeX script not loaded. Rendering plain text.");
        return <div className="whitespace-pre-wrap">{text}</div>;
    }

    const renderedParts = useMemo(() => {
        // Regex to find all math expressions (inline and block) and glossary terms.
        const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\[glossary:(.*?)\])/g;
        const parts = text.split(regex);
        
        return parts.map((part, index) => {
            if (!part) return null;

            // Handle Display Math: $$...$$
            if (part.startsWith('$$') && part.endsWith('$$')) {
                const latex = part.slice(2, -2).trim();
                const html = window.katex.renderToString(latex, { displayMode: true, throwOnError: false, errorColor: '#ef4444' });
                return <div key={index} className="overflow-x-auto max-w-full" dangerouslySetInnerHTML={{ __html: html }} />;
            }

            // Handle Inline Math: $...$
            if (part.startsWith('$') && part.endsWith('$')) {
                const latex = part.slice(1, -1).trim();
                const html = window.katex.renderToString(latex, { displayMode: false, throwOnError: false, errorColor: '#ef4444' });
                return <span key={index} className="inline-block align-middle max-w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />;
            }

            // Handle Glossary: [glossary:...]
            if (part.startsWith('[glossary:')) {
                // The regex captures the term name in the next part of the array.
                const term = parts[index + 1]; 
                if (!term) return null;
                return (
                    <button 
                        key={index} 
                        onClick={() => onGlossaryClick(term)} 
                        className="text-teal-400 font-bold border-b border-teal-400/50 hover:bg-teal-900/50 transition-colors rounded-sm px-1 py-0.5"
                    >
                        {term}
                    </button>
                );
            }
            
            // This part is the captured glossary term itself, so we skip it 
            // as it's already rendered inside the button.
            if (index > 0 && parts[index - 1]?.startsWith('[glossary:')) {
                return null;
            }

            // Render regular text.
            return <span key={index}>{part}</span>;
        });
    }, [text, onGlossaryClick, fontsReady]);

    return <div className="whitespace-pre-wrap break-words overflow-hidden">{renderedParts}</div>;
});