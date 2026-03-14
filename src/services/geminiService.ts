import { GoogleGenAI, GenerateContentResponse, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { MessagePart } from "../types";
import { PromptGuard, AIUsageTracker } from "../utils/security";

const apiKey = process.env.GEMINI_API_KEY || "";

export const getAI = () => {
  if (!apiKey) {
    throw new Error("API_KEY_INVALID: Gemini API key is missing. Please configure it in settings.");
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

export const generateImage = async (prompt: string, imageBase64?: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "16:9") => {
  if (!AIUsageTracker.canRequest()) throw new Error("Usage limit reached");
  const ai = getAI();
  const safePrompt = PromptGuard.isMalicious(prompt) 
    ? "A beautiful landscape" 
    : PromptGuard.wrapUserPrompt(prompt);

  const parts: any[] = [{ text: safePrompt }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: "image/png"
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts,
    },
    config: {
      imageConfig: {
        aspectRatio,
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

export const generateVideo = async (
  prompt: string, 
  imageBase64?: string, 
  aspectRatio: "16:9" | "9:16" = "16:9",
  onProgress?: (progress: number) => void
) => {
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
      aspectRatio
    }
  });

  let progress = 10;
  if (onProgress) onProgress(progress);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
    
    // Simulate progress since we don't have a real percentage from the API
    if (progress < 90) {
      progress += Math.floor(Math.random() * 10) + 5;
      if (onProgress) onProgress(Math.min(progress, 95));
    }
  }

  if (onProgress) onProgress(100);

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) return null;

  const videoResponse = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });

  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
  }

  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};

export const analyzeAudio = async (audioBase64: string, mimeType: string = "audio/mpeg") => {
  if (!AIUsageTracker.canRequest()) throw new Error("Usage limit reached");
  const ai = getAI();

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType,
            },
          },
          {
            text: "Transcribe this audio and provide a brief summary of its content and tone.",
          },
        ],
      },
    ],
    config: {
      safetySettings,
    },
  });

  return response.text;
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
