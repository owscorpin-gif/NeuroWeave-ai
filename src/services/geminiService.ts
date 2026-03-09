import { GoogleGenAI, GenerateContentResponse, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { MessagePart } from "../types";
import { PromptGuard, AIUsageTracker } from "../utils/security";

const apiKey = process.env.GEMINI_API_KEY || "";

export const getAI = () => {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. AI features may not work.");
  }
  return new GoogleGenAI({ apiKey });
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const processParts = (parts: any[]): any[] => {
  if (!AIUsageTracker.canRequest()) {
    throw new Error("AI usage limit reached. Please wait a moment.");
  }

  return parts.map(part => {
    if (part.text) {
      if (PromptGuard.isMalicious(part.text)) {
        throw new Error("Security Alert: Malicious prompt detected.");
      }
      return { text: PromptGuard.wrapUserPrompt(part.text) };
    }
    return part;
  });
};

export const generateMultimodalResponse = async (
  modelName: string,
  parts: any[],
  systemInstruction?: string
): Promise<GenerateContentResponse> => {
  const ai = getAI();
  const safeParts = processParts(parts);
  
  return await ai.models.generateContent({
    model: modelName,
    contents: [{ role: "user", parts: safeParts }],
    config: {
      systemInstruction,
      safetySettings,
    },
  });
};

export const streamMultimodalResponse = async function* (
  modelName: string,
  parts: any[],
  systemInstruction?: string
) {
  const ai = getAI();
  const safeParts = processParts(parts);

  const response = await ai.models.generateContentStream({
    model: modelName,
    contents: [{ role: "user", parts: safeParts }],
    config: {
      systemInstruction,
      safetySettings,
    },
  });

  for await (const chunk of response) {
    yield chunk;
  }
};

export const generateImage = async (prompt: string) => {
  if (!AIUsageTracker.canRequest()) throw new Error("Usage limit reached");
  const ai = getAI();
  const safePrompt = PromptGuard.isMalicious(prompt) 
    ? "A beautiful landscape" 
    : PromptGuard.wrapUserPrompt(prompt);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: safePrompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
      safetySettings,
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateVideo = async (prompt: string, imageBase64?: string) => {
  if (!AIUsageTracker.canRequest()) throw new Error("Usage limit reached");
  const ai = getAI();
  const safePrompt = PromptGuard.isMalicious(prompt) 
    ? "A cinematic landscape" 
    : PromptGuard.wrapUserPrompt(prompt);

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: safePrompt,
    image: imageBase64 ? {
      imageBytes: imageBase64,
      mimeType: 'image/png',
    } : undefined,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  return operation.response?.generatedVideos?.[0]?.video?.uri;
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore') => {
  if (!AIUsageTracker.canRequest()) throw new Error("Usage limit reached");
  const ai = getAI();
  const safeText = PromptGuard.isMalicious(text) 
    ? "I cannot process this request due to security policies." 
    : PromptGuard.wrapUserPrompt(text);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: safeText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
      safetySettings,
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};
