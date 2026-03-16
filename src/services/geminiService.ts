import { GoogleGenAI, GenerateContentResponse, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { MessagePart } from "../types";
import { PromptGuard, AIUsageTracker } from "../utils/security";

const getApiKey = () => {
  return process.env.API_KEY || process.env.GEMINI_API_KEY || "";
};

export const getAI = () => {
  const key = getApiKey();
  if (!key) {
    throw new Error("API_KEY_INVALID: Gemini API key is missing. Please configure it in settings.");
  }
  return new GoogleGenAI({ apiKey: key });
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

export const generateImage = async (
  prompt: string, 
  referenceImages?: { data: string, mimeType: string }[], 
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" = "16:9"
) => {
  if (!AIUsageTracker.canRequest()) throw new Error("Usage limit reached");
  const ai = getAI();
  const safePrompt = PromptGuard.isMalicious(prompt) 
    ? "A beautiful landscape" 
    : PromptGuard.wrapUserPrompt(prompt);

  const parts: any[] = [{ text: safePrompt }];
  if (referenceImages && referenceImages.length > 0) {
    referenceImages.forEach(img => {
      parts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType
        }
      });
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
  referenceImages?: { data: string, mimeType: string }[], 
  aspectRatio: "16:9" | "9:16" = "16:9",
  onProgress?: (progress: number) => void,
  lastFrame?: { data: string, mimeType: string }
) => {
  if (!AIUsageTracker.canRequest()) throw new Error("Usage limit reached");
  const ai = getAI();
  const safePrompt = PromptGuard.isMalicious(prompt) 
    ? "A cinematic landscape" 
    : PromptGuard.wrapUserPrompt(prompt);

  const model = referenceImages && referenceImages.length > 1 
    ? 'veo-3.1-generate-preview' 
    : 'veo-3.1-fast-generate-preview';

  // If multiple images, we must use 16:9 and 720p per instructions
  const finalAspectRatio = referenceImages && referenceImages.length > 1 ? "16:9" : aspectRatio;

  const config: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: finalAspectRatio,
    lastFrame: lastFrame ? {
      imageBytes: lastFrame.data,
      mimeType: lastFrame.mimeType
    } : undefined
  };

  let operation;

  if (referenceImages && referenceImages.length > 1) {
    const referenceImagesPayload = referenceImages.map(img => ({
      image: {
        imageBytes: img.data,
        mimeType: img.mimeType,
      },
      referenceType: "ASSET" as any,
    }));
    
    operation = await ai.models.generateVideos({
      model,
      prompt: safePrompt,
      config: {
        ...config,
        referenceImages: referenceImagesPayload,
      }
    });
  } else {
    operation = await ai.models.generateVideos({
      model,
      prompt: safePrompt,
      image: referenceImages?.[0] ? {
        imageBytes: referenceImages[0].data,
        mimeType: referenceImages[0].mimeType,
      } : undefined,
      config
    });
  }

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
      'x-goog-api-key': getApiKey(),
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

export const getPromptSuggestions = async (
  mode: 'image' | 'video',
  referenceImages?: { data: string, mimeType: string }[]
): Promise<string[]> => {
  if (!AIUsageTracker.canRequest()) throw new Error("Usage limit reached");
  const ai = getAI();

  const parts: any[] = [
    {
      text: `Act as a creative director. Based on the provided reference images (if any) and the target mode (${mode}), suggest 5 highly descriptive and cinematic prompts. 
      The prompts should be creative, detailed, and optimized for high-quality ${mode} generation.
      Return the results as a JSON array of strings.
      Example format: ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5"]`
    }
  ];

  if (referenceImages && referenceImages.length > 0) {
    referenceImages.forEach(img => {
      parts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType
        }
      });
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      safetySettings,
    },
  });

  try {
    const suggestions = JSON.parse(response.text || "[]");
    return Array.isArray(suggestions) ? suggestions : [];
  } catch (e) {
    console.error("Failed to parse suggestions:", e);
    return [];
  }
};
