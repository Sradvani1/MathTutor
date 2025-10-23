
import { Part, Content } from '@google/genai';

export type Role = 'user' | 'model';

// Use the SDK's Content type as the base for our message, adding a unique ID.
export type Message = Content & {
  id: string;
  rawParts?: Part[]; // The full data sent to the model, if different from what's displayed.
};

export interface ImageFile {
  data: string; // base64
  mimeType: string;
}