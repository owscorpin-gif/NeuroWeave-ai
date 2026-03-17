export enum AgentType {
  LIVE = "LIVE",
  CREATIVE = "CREATIVE",
  NAVIGATOR = "NAVIGATOR",
}

export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: {
    mimeType: string;
    fileUri: string;
  };
  videoMetadata?: {
    videoUri: string;
  };
  fileUrl?: string;
}

export interface Message {
  id: string;
  role: "user" | "model";
  parts: MessagePart[];
  timestamp: number;
}

export interface Agent {
  id: string;
  name: string;
  tagline: string;
  type: AgentType;
  description: string;
  icon: string;
  systemInstruction: string;
}
