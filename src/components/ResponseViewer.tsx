import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { motion } from "motion/react";
import { Message } from "../types";
import { Play, Download, Maximize2, Volume2 } from "lucide-react";
import { InterleavedContent } from "./InterleavedContent";
import { AudioPlayer } from "./AudioPlayer";

interface ResponseViewerProps {
  message: Message;
  isStreaming?: boolean;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ message, isStreaming = false }) => {
  const isModel = message.role === "model";

  return (
    <div className={`flex ${isModel ? "justify-start" : "justify-end"} mb-8 group`}>
      <div className={`max-w-[85%] ${isModel ? "w-full" : ""}`}>
        <div className={`flex items-center gap-2 mb-2 ${isModel ? "flex-row" : "flex-row-reverse"}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isModel ? "bg-accent text-white" : "bg-gray-700 text-gray-300"}`}>
            {isModel ? "NW" : "U"}
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isStreaming && isModel && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          )}
        </div>

        <div className={`space-y-4 ${isModel ? "" : "flex flex-col items-end"}`}>
          {message.parts.map((part, i) => (
            <div key={i} className="w-full relative">
              {part.text && (
                <div className={`prose prose-invert max-w-none ${isModel ? "text-gray-200" : "bg-accent/10 text-accent p-4 rounded-2xl border border-accent/20"}`}>
                  {isModel ? (
                    <div className="relative">
                      <InterleavedContent text={part.text} />
                      {isStreaming && i === message.parts.length - 1 && (
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="inline-block w-1.5 h-4 bg-accent ml-1 align-middle"
                        />
                      )}
                    </div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {part.text}
                    </ReactMarkdown>
                  )}
                </div>
              )}

              {part.inlineData && part.inlineData.mimeType.startsWith("image/") && (
                <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl max-w-2xl">
                  <img
                    src={part.fileUrl || `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                    alt="AI Generated"
                    className="w-full h-auto"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {part.inlineData && part.inlineData.mimeType.startsWith("audio/") && (
                <div className="mt-4">
                  <AudioPlayer 
                    src={part.fileUrl || `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                    mimeType={part.inlineData.mimeType}
                  />
                </div>
              )}

              {part.videoMetadata && (
                <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl max-w-2xl relative group/video">
                  <video
                    src={part.videoMetadata.videoUri}
                    controls
                    className="w-full h-auto"
                  />
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/video:opacity-100 transition-opacity">
                    <button className="p-2 rounded-lg bg-black/60 backdrop-blur text-white hover:bg-black/80">
                      <Download size={16} />
                    </button>
                    <button className="p-2 rounded-lg bg-black/60 backdrop-blur text-white hover:bg-black/80">
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
