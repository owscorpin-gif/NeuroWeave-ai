import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { generateImage, generateVideo, generateSpeech } from "../services/geminiService";
import { Play, Loader2, Image as ImageIcon, Video, Volume2 } from "lucide-react";
import { motion } from "motion/react";

interface InterleavedContentProps {
  text: string;
}

export const InterleavedContent: React.FC<InterleavedContentProps> = ({ text }) => {
  const [mediaMap, setMediaMap] = useState<Record<string, { url?: string; loading: boolean; error?: string }>>({});

  const parts = text.split(/(\[(?:IMAGE|VIDEO|AUDIO):?\s*.*?\])/gi);

  useEffect(() => {
    parts.forEach(async (part) => {
      const trimmedPart = part.trim().toUpperCase();
      if (trimmedPart.startsWith("[IMAGE:") || trimmedPart.startsWith("[VIDEO:") || trimmedPart.startsWith("[AUDIO:")) {
        const key = part;
        if (mediaMap[key]) return;

        setMediaMap(prev => ({ ...prev, [key]: { loading: true } }));

        try {
          const prompt = part.match(/\[.*?:?\s*(.*?)\]/)?.[1] || "";
          let url = "";

          if (trimmedPart.startsWith("[IMAGE:")) {
            url = await generateImage(prompt) || "";
          } else if (trimmedPart.startsWith("[VIDEO:")) {
            url = await generateVideo(prompt) || "";
          } else if (trimmedPart.startsWith("[AUDIO:")) {
            const base64 = await generateSpeech(prompt);
            if (base64) {
              url = `data:audio/mp3;base64,${base64}`;
            }
          }

          setMediaMap(prev => ({ ...prev, [key]: { url, loading: false } }));
        } catch (error) {
          console.error("Media generation failed:", error);
          setMediaMap(prev => ({ ...prev, [key]: { loading: false, error: "Failed to generate media" } }));
        }
      }
    });
  }, [text]);

  return (
    <div className="space-y-4">
      {parts.map((part, i) => {
        const trimmedPart = part.trim().toUpperCase();
        if (trimmedPart.startsWith("[IMAGE:")) {
          const media = mediaMap[part];
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 aspect-video relative group"
            >
              {media?.loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">Generating Illustration...</span>
                </div>
              ) : media?.url ? (
                <img src={media.url} alt="Generated" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs font-mono uppercase tracking-widest">{media?.error || "Image Placeholder"}</span>
                </div>
              )}
            </motion.div>
          );
        }

        if (trimmedPart.startsWith("[VIDEO:")) {
          const media = mediaMap[part];
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 aspect-video relative"
            >
              {media?.loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">Generating Video...</span>
                </div>
              ) : media?.url ? (
                <video src={media.url} controls className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
                  <Video className="w-8 h-8" />
                  <span className="text-xs font-mono uppercase tracking-widest">{media?.error || "Video Placeholder"}</span>
                </div>
              )}
            </motion.div>
          );
        }

        if (trimmedPart.startsWith("[AUDIO:")) {
          const media = mediaMap[part];
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-accent/5 border border-accent/20"
            >
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                {media?.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-accent font-mono uppercase tracking-wider mb-1">AI Narration</p>
                {media?.url ? (
                  <audio src={media.url} controls className="h-8 w-full" />
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    {media?.loading ? "Synthesizing voice..." : media?.error || "Audio pending..."}
                  </p>
                )}
              </div>
            </motion.div>
          );
        }

        if (part.trim()) {
          return (
            <div key={i} className="prose prose-invert max-w-none">
              <ReactMarkdown>{part}</ReactMarkdown>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
