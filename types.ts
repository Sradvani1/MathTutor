
export type Role = 'user' | 'model';

export type MessagePart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export type Message = {
  id: string;
  role: Role;
  parts: MessagePart[];
  rawParts?: MessagePart[];
};

export interface ImageFile {
  data: string; // base64
  mimeType: string;
}
