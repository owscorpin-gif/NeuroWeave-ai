import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { MessagePart } from "../types";

const apiKey = process.env.GEMINI_API_KEY || "";

export const getAI = () => {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. AI features may not work.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateMultimodalResponse = async (
  modelName: string,
  parts: any[],
  systemInstruction?: string
): Promise<GenerateContentResponse> => {
  const ai = getAI();
  return await ai.models.generateContent({
    model: modelName,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction,
    },
  });
};

export const streamMultimodalResponse = async function* (
  modelName: string,
  parts: any[],
  systemInstruction?: string
) {
  const ai = getAI();
  const response = await ai.models.generateContentStream({
    model: modelName,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction,
    },
  });

  for await (const chunk of response) {
    yield chunk;
  }
};

export const generateImage = async (prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
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
  const ai = getAI();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
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
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};
