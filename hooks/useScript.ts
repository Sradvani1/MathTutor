import { useState, useEffect } from 'react';

// Using a global map to cache script loading promises.
// This prevents multiple components from trying to load the same script.
const scriptCache = new Map<string, Promise<'ready' | 'error'>>();

/**
 * A custom hook to dynamically load an external script and track its status.
 * This is used to load the KaTeX script after the initial page render,
 * resolving a race condition that could cause a "quirks mode" warning.
 * The status is used to trigger re-renders in components that depend on the script.
 * @param src The URL of the script to load.
 * @returns The loading status of the script: 'loading', 'ready', or 'error'.
 */
export const useScript = (src: string): 'loading' | 'ready' | 'error' => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() => {
    // Check for immediate readiness, e.g., if KaTeX is already on the window object.
    if (typeof window !== 'undefined' && (window as any).katex) {
      return 'ready';
    }
    // If we are server-side rendering, default to loading.
    return src ? 'loading' : 'error';
  });

  useEffect(() => {
    if (!src || status === 'ready') {
      return;
    }

    let promise = scriptCache.get(src);

    if (!promise) {
      promise = new Promise((resolve, reject) => {
        // Check again for the script tag in case another component instance initiated the load.
        if (document.querySelector(`script[src="${src}"]`)) {
            // If the script tag exists and window.katex is available, resolve immediately.
            if ((window as any).katex) {
                resolve('ready');
                return;
            }
            // If not, we can assume it's still loading and attach listeners below.
            // This case is less likely with this promise-based approach but is a safe fallback.
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;

        script.onload = () => {
          resolve('ready');
        };

        script.onerror = () => {
          reject('error');
        };

        document.body.appendChild(script);
      });
      scriptCache.set(src, promise);
    }
    
    let isMounted = true;
    promise.then(
        (result) => { if (isMounted) setStatus(result); },
        (error) => { if (isMounted) setStatus(error); }
    );

    return () => {
        isMounted = false;
    };

  }, [src, status]);

  return status;
};
