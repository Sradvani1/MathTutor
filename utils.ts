
import { ImageFile, Message } from './types';

export const fileToImageFile = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1);
      resolve({
        data: base64Data,
        mimeType: file.type,
      });
    };
    reader.onerror = (error) => {
        reject(error);
    };
    reader.readAsDataURL(file);
  });
};

export const formatChatForExport = (messages: Message[]): string => {
    let textContent = "Math Tutor - Chat Export\n";
    textContent += "====================================\n\n";

    messages.forEach(message => {
        const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
        textContent += `[${role}]:\n`;
        
        let hasImage = false;
        message.parts.forEach(part => {
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
