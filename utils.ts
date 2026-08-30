
import { ImageFile, Message } from './types';

// Base64-encoded images must fit within Vercel Functions' request-body limit.
const MAX_IMAGE_SIZE_MB = 2.5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

// Supported image formats for Gemini API
const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif'
];

export interface ImageValidationError {
  code: 'SIZE_TOO_LARGE' | 'UNSUPPORTED_FORMAT' | 'INVALID_FILE' | 'READ_ERROR';
  message: string;
}

export const validateImageFile = (file: File): ImageValidationError | null => {
  // Check if file exists
  if (!file) {
    return {
      code: 'INVALID_FILE',
      message: 'No file selected. Please choose an image file.'
    };
  }

  // Check file size (7MB limit for inline data)
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      code: 'SIZE_TOO_LARGE',
      message: `Image is too large (${sizeMB} MB). Maximum size is ${MAX_IMAGE_SIZE_MB} MB. Please compress or resize your image.`
    };
  }

  // Check MIME type
  if (!SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      code: 'UNSUPPORTED_FORMAT',
      message: `Image format "${file.type || 'unknown'}" is not supported. Please use PNG, JPEG, WebP, HEIC, or HEIF format.`
    };
  }

  return null;
};

export const fileToImageFile = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    // Validate file before processing
    const validationError = validateImageFile(file);
    if (validationError) {
      reject(new Error(validationError.message));
      return;
    }
    
    const reader = new FileReader();
    
    // Set timeout for mobile browsers that may hang
    const timeout = setTimeout(() => {
      reader.abort();
      reject(new Error('Image processing timed out. The file may be too large or corrupted. Please try a smaller image.'));
    }, 30000); // 30 second timeout
    
    reader.onloadend = () => {
      clearTimeout(timeout);
      try {
        const dataUrl = reader.result as string;
        if (!dataUrl || !dataUrl.includes(',')) {
          reject(new Error('Failed to read image file. The file may be corrupted.'));
          return;
        }
        
        const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1);
        
        // Validate base64 data size (base64 is ~33% larger than binary)
        const estimatedBinarySize = (base64Data.length * 3) / 4;
        if (estimatedBinarySize > MAX_IMAGE_SIZE_BYTES) {
          reject(new Error(`Processed image is too large (${(estimatedBinarySize / 1024 / 1024).toFixed(2)} MB). Maximum size is ${MAX_IMAGE_SIZE_MB} MB.`));
          return;
        }
        
        resolve({
          data: base64Data,
          mimeType: file.type || 'image/jpeg', // Fallback to jpeg if type is missing
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      clearTimeout(timeout);

      reject(new Error('Failed to read image file. The file may be corrupted or in an unsupported format.'));
    };
    
    reader.onabort = () => {
      clearTimeout(timeout);
      reject(new Error('Image processing was cancelled or timed out. Please try again with a smaller image.'));
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`Failed to start reading image: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};

export const formatChatForExport = (messages: Message[]): string => {
    let textContent = "Math Tutor - Chat Export\n";
    textContent += "====================================\n\n";

    messages.forEach(message => {
        const role = message.role ? message.role.charAt(0).toUpperCase() + message.role.slice(1) : 'User';
        textContent += `[${role}]:\n`;

        let hasImage = false;
        message.parts?.forEach(part => {
            if ('text' in part && part.text) {
                textContent += part.text + "\n";
            } else if ('inlineData' in part) {
                hasImage = true;
            }
        });

        if (hasImage) {
            textContent += "[Image was included in this message]\n";
        }

        textContent += "\n---\n\n";
    });

    return textContent;
};
